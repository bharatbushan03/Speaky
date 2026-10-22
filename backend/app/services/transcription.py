"""Transcription providers for speech-to-text conversion.

Supports the configured STT_PROVIDER (openai, google, azure) with proper
error handling, timeouts, and language mapping. Falls back gracefully when
a provider or language is not supported.
"""

import base64
import binascii
import logging
from typing import Any, Optional

import httpx
from app.core.config import settings
from app.core.errors import APIError
from app.models.schemas import TranscriptionResponse
from app.services.ai_interfaces import TranscriptionProvider, UnconfiguredTranscriptionProvider

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
            )
        except (ValueError, KeyError, TypeError) as exc:
            raise APIError(502, "provider_invalid_response", "The STT provider returned invalid data") from exc


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
