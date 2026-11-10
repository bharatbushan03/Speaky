"""Transcription providers for speech-to-text conversion.

Supports the configured STT_PROVIDER. Gnani Prisma is the speech provider
when STT_PROVIDER=gnani. Browser speech recognition is not this provider.
"""

import asyncio
import base64
import binascii
import logging
from typing import Any, Optional

import httpx
from app.core.config import settings
from app.core.errors import APIError
from app.models.schemas import TranscriptionResponse
from app.services.ai_interfaces import TranscriptionProvider, UnconfiguredTranscriptionProvider
from app.services.evaluation import gnani_language

logger = logging.getLogger(__name__)


class OpenAIWhisperTranscriptionProvider:
    """OpenAI Whisper transcription provider using the official API."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str = "whisper-1",
        timeout: float = 30.0,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.transport = transport

    async def transcribe(self, audio_data: str, language: str = "en-IN") -> TranscriptionResponse:
        encoded = audio_data.split(",", 1)[1] if audio_data.startswith("data:") and "," in audio_data else audio_data
        try:
            audio_bytes = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise APIError(422, "invalid_audio", "Audio data must be valid base64") from exc
        if not audio_bytes:
            raise APIError(422, "invalid_audio", "Audio data must not be empty")
        files = {"file": ("answer.webm", audio_bytes, "audio/webm")}
        data = {"model": self.model, "language": language}
        try:
            client_kwargs: dict[str, Any] = {"timeout": self.timeout}
            if self.transport is not None:
                client_kwargs["transport"] = self.transport
            async with httpx.AsyncClient(**client_kwargs) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    data=data,
                    files=files,
                )
        except httpx.TimeoutException as exc:
            raise APIError(504, "provider_timeout", "The STT provider timed out") from exc
        except httpx.RequestError as exc:
            logger.warning("STT provider request failed: %s", type(exc).__name__)
            raise APIError(503, "provider_unavailable", "The STT provider is unavailable") from exc

        if response.status_code == 429:
            raise APIError(429, "provider_rate_limited", "The STT provider rate limit was reached")
        if response.status_code in {401, 403}:
            raise APIError(502, "provider_authentication_failed", "The STT provider rejected its credentials")
        if response.status_code >= 500:
            raise APIError(503, "provider_unavailable", "The STT provider is unavailable")
        if not response.is_success:
            raise APIError(502, "provider_request_failed", "The STT provider rejected the request")

        try:
            data = response.json()
            text = data.get("text", "")
            confidence = data.get("confidence")
            language_detected = data.get("language", language)
            return TranscriptionResponse(
                text=text or "",
                confidence=confidence,
                language_detected=language_detected or language,
                provider="openai",
                model=self.model,
            )
        except (ValueError, KeyError, TypeError) as exc:
            raise APIError(502, "provider_invalid_response", "The STT provider returned invalid data") from exc


def prisma_language_code(language: str) -> str:
    """Hint Prisma with English plus the explanation language.

    Answers are English practice. Prisma v3 accepts up to four comma-separated
    hints and still follows the language that was spoken.
    """
    primary = gnani_language(language)
    if primary == "en-IN":
        return "en-IN"
    return f"en-IN,{primary}"


def _audio_kind(audio: bytes) -> Optional[str]:
    if len(audio) >= 12 and audio.startswith(b"RIFF") and audio[8:12] == b"WAVE":
        return "wav"
    if audio.startswith(b"OggS"):
        return "ogg"
    if audio.startswith(b"fLaC"):
        return "flac"
    if len(audio) > 11 and audio[4:8] == b"ftyp":
        return "m4a"
    if audio.startswith(b"ID3") or (len(audio) > 2 and audio[0] == 0xFF and (audio[1] & 0xE0) == 0xE0):
        return "mp3"
    return None


def _wav_duration_seconds(audio: bytes) -> Optional[float]:
    if _audio_kind(audio) != "wav" or len(audio) < 44:
        return None
    offset = 12
    sample_rate = channels = bits = data_size = None
    while offset + 8 <= len(audio):
        chunk = audio[offset:offset + 4]
        size = int.from_bytes(audio[offset + 4:offset + 8], "little")
        offset += 8
        if chunk == b"fmt " and size >= 16 and offset + 16 <= len(audio):
            channels = int.from_bytes(audio[offset + 2:offset + 4], "little")
            sample_rate = int.from_bytes(audio[offset + 4:offset + 8], "little")
            bits = int.from_bytes(audio[offset + 14:offset + 16], "little")
        elif chunk == b"data":
            data_size = size
            break
        offset += size + (size % 2)
    if not sample_rate or not channels or not bits or data_size is None or bits < 8:
        return None
    bytes_per_second = sample_rate * channels * (bits // 8)
    if bytes_per_second <= 0:
        return None
    return data_size / bytes_per_second


_AUDIO_META = {
    "wav": ("answer.wav", "audio/wav"),
    "mp3": ("answer.mp3", "audio/mpeg"),
    "ogg": ("answer.ogg", "audio/ogg"),
    "flac": ("answer.flac", "audio/flac"),
    "m4a": ("answer.m4a", "audio/mp4"),
}


class GnaniPrismaTranscriptionProvider:
    """Gnani Prisma v3 speech-to-text. REST clips are at most 30 seconds."""

    provider_name = "gnani"

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.vachana.ai",
        model: str = "prisma-v3.0",
        timeout: float = 45.0,
        retry_delay: float = 0.4,
        max_audio_bytes: int = 1_500_000,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.retry_delay = retry_delay
        self.max_audio_bytes = max_audio_bytes
        self.transport = transport

    def _decode(self, audio_data: str) -> bytes:
        encoded = audio_data.split(",", 1)[1] if audio_data.startswith("data:") and "," in audio_data else audio_data
        try:
            audio_bytes = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            raise APIError(422, "invalid_audio", "Audio data must be valid base64") from exc
        if not audio_bytes:
            raise APIError(422, "invalid_audio", "Audio data must not be empty")
        if len(audio_bytes) > self.max_audio_bytes:
            raise APIError(413, "audio_too_large", "The recording is too large")
        if audio_bytes.startswith(b"\x1a\x45\xdf\xa3"):
            raise APIError(422, "unsupported_audio", "WebM recordings must be converted to WAV before transcription")
        kind = _audio_kind(audio_bytes)
        if kind is None:
            raise APIError(422, "unsupported_audio", "Audio must be WAV, MP3, OGG, FLAC, or M4A")
        duration = _wav_duration_seconds(audio_bytes)
        if duration is not None and duration < 0.2:
            raise APIError(422, "empty_audio", "The recording was too short. Speak a little longer and try again.")
        if duration is not None and duration > 30:
            raise APIError(422, "audio_too_long", "Recordings must be 30 seconds or shorter")
        return audio_bytes

    async def transcribe(self, audio_data: str, language: str = "en-IN") -> TranscriptionResponse:
        audio_bytes = self._decode(audio_data)
        kind = _audio_kind(audio_bytes) or "wav"
        filename, mime = _AUDIO_META[kind]
        files = {"audio_file": (filename, audio_bytes, mime)}
        data = {
            "model": self.model,
            "language_code": prisma_language_code(language),
            "format": "transcribe",
        }
        client_kwargs: dict[str, Any] = {"timeout": self.timeout}
        if self.transport is not None:
            client_kwargs["transport"] = self.transport
        response: Optional[httpx.Response] = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(**client_kwargs) as client:
                    response = await client.post(
                        f"{self.base_url}/stt/v3",
                        headers={"X-API-Key-ID": self.api_key},
                        data=data,
                        files=files,
                    )
            except httpx.TimeoutException as exc:
                if attempt == 0:
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise APIError(504, "provider_timeout", "The STT provider timed out") from exc
            except httpx.RequestError as exc:
                logger.warning("STT provider request failed: %s", type(exc).__name__)
                if attempt == 0:
                    await asyncio.sleep(self.retry_delay)
                    continue
                raise APIError(503, "provider_unavailable", "The STT provider is unavailable") from exc
            if response.status_code in {429, 500, 502, 503, 504} and attempt == 0:
                await asyncio.sleep(self.retry_delay)
                continue
            break
        if response is None:
            raise APIError(503, "provider_unavailable", "The STT provider is unavailable")
        return self._parse(response, language)

    def _parse(self, response: httpx.Response, language: str) -> TranscriptionResponse:
        error_type = ""
        if not response.is_success:
            try:
                body = response.json()
                error = body.get("error")
                if isinstance(error, dict):
                    error_type = str(error.get("type") or "")
            except ValueError:
                error_type = ""
        if response.status_code == 429:
            raise APIError(429, "provider_rate_limited", "The STT provider rate limit was reached")
        if response.status_code in {401, 403}:
            raise APIError(502, "provider_authentication_failed", "The STT provider rejected its credentials")
        if error_type == "MAX_AUDIO_DURATION_EXCEEDED":
            raise APIError(422, "audio_too_long", "Recordings must be 30 seconds or shorter")
        if error_type in {"UNSUPPORTED_AUDIO_FORMAT", "AUDIO_CONVERSION_ERROR", "EMPTY_AUDIO"}:
            raise APIError(422, "invalid_audio", "The recording could not be transcribed. Record again in a quiet place.")
        if response.status_code >= 500:
            raise APIError(503, "provider_unavailable", "The STT provider is unavailable")
        if not response.is_success:
            raise APIError(502, "provider_request_failed", "The STT provider rejected the request")
        try:
            payload = response.json()
            text = payload.get("transcript")
            if not isinstance(text, str):
                raise ValueError("transcript")
        except (ValueError, TypeError) as exc:
            raise APIError(502, "provider_invalid_response", "The STT provider returned invalid data") from exc
        if not text.strip():
            raise APIError(422, "empty_transcript", "No speech was detected. Record again or type your answer.")
        detected = payload.get("detected_language_code")
        reported_model = payload.get("model")
        return TranscriptionResponse(
            text=text.strip(),
            confidence=None,
            language_detected=detected if isinstance(detected, str) else language,
            provider=self.provider_name,
            model=reported_model if isinstance(reported_model, str) and reported_model else self.model,
            truncated=payload.get("truncated") is True,
        )


class GoogleSTTTranscriptionProvider:
    """Google Cloud Speech-to-Text provider.

    Note: This is a stub provider. Google Cloud STT requires separate setup
    and is not configured by default. Calls raise 501 until properly configured.
    """

    async def transcribe(self, audio_data: str, language: str = "en-IN") -> TranscriptionResponse:
        raise APIError(
            status_code=501,
            code="stt_not_configured",
            detail="Google Cloud STT is not configured. Set STT_PROVIDER=openai or configure Google Cloud credentials.",
        )


class AzureSTTTranscriptionProvider:
    """Azure Speech to Text provider.

    Note: This is a stub provider. Azure Speech requires separate setup
    and is not configured by default. Calls raise 501 until properly configured.
    """

    async def transcribe(self, audio_data: str, language: str = "en-IN") -> TranscriptionResponse:
        raise APIError(
            status_code=501,
            code="stt_not_configured",
            detail="Azure Speech to Text is not configured. Set STT_PROVIDER=openai or configure Azure credentials.",
        )


def get_transcription_provider() -> TranscriptionProvider:
    """Build a transcription provider from the configured settings."""
    provider = settings.STT_PROVIDER.strip().lower()
    if provider == "mock":
        return UnconfiguredTranscriptionProvider()
    if provider in {"gnani", "giani", "prisma"}:
        if not settings.GIANI_API_KEY:
            return UnconfiguredTranscriptionProvider()
        return GnaniPrismaTranscriptionProvider(
            api_key=settings.GIANI_API_KEY,
            base_url=settings.GIANI_API_URL or "https://api.vachana.ai",
            model=settings.GNANI_STT_MODEL,
            timeout=max(settings.AI_REQUEST_TIMEOUT_SECONDS, 45.0),
            max_audio_bytes=settings.MAX_AUDIO_BYTES,
        )
    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            return UnconfiguredTranscriptionProvider()
        return OpenAIWhisperTranscriptionProvider(
            api_key=settings.OPENAI_API_KEY,
            model="whisper-1",
            timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )
    if provider == "google":
        return GoogleSTTTranscriptionProvider()
    if provider == "azure":
        return AzureSTTTranscriptionProvider()
    return UnconfiguredTranscriptionProvider()
