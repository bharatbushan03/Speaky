import base64
import struct
import unittest
from types import SimpleNamespace

import httpx

from app.core.errors import APIError
from app.services.evaluation import _has_reliable_fluency_data
from app.services.transcription import GnaniPrismaTranscriptionProvider, prisma_language_code


def wav_b64(seconds: float = 0.25, rate: int = 16000) -> str:
    count = int(seconds * rate)
    payload = b"\x00\x00" * count
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(payload),
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        rate,
        rate * 2,
        2,
        16,
        b"data",
        len(payload),
    )
    return base64.b64encode(header + payload).decode()


class PrismaLanguageTests(unittest.TestCase):
    def test_keeps_english_and_adds_explanation_language(self):
        self.assertEqual(prisma_language_code("english"), "en-IN")
        self.assertEqual(prisma_language_code("hindi"), "en-IN,hi-IN")
        self.assertEqual(prisma_language_code("tamil"), "en-IN,ta-IN")
        self.assertEqual(prisma_language_code("telugu"), "en-IN,te-IN")
        self.assertEqual(prisma_language_code("kannada"), "en-IN,kn-IN")
        self.assertEqual(prisma_language_code("bengali"), "en-IN,bn-IN")


class PrismaRequestTests(unittest.IsolatedAsyncioTestCase):
    async def test_posts_documented_prisma_v3_form(self):
        def handler(request: httpx.Request) -> httpx.Response:
            body = request.content
            self.assertEqual(request.url.path, "/stt/v3")
            self.assertEqual(request.headers["x-api-key-id"], "gnani-secret")
            self.assertIn(b'name="model"', body)
            self.assertIn(b"prisma-v3.0", body)
            self.assertIn(b"en-IN,hi-IN", body)
            self.assertIn(b'name="audio_file"', body)
            self.assertIn(b"answer.wav", body)
            self.assertIn(b"transcribe", body)
            return httpx.Response(
                200,
                json={
                    "transcript": "I led the release.",
                    "model": "prisma-v3.0",
                    "detected_language_code": "en-IN",
                },
            )

        provider = GnaniPrismaTranscriptionProvider(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(handler),
        )
        result = await provider.transcribe(wav_b64(), "hindi")
        self.assertEqual(result.text, "I led the release.")
        self.assertEqual(result.provider, "gnani")
        self.assertEqual(result.model, "prisma-v3.0")
        self.assertIsNone(result.confidence)

    async def test_retries_rate_limit_once(self):
        calls = {"n": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            if calls["n"] == 1:
                return httpx.Response(429, json={"detail": {"error_code": "RATE_LIMITED"}})
            return httpx.Response(200, json={"transcript": "Retry worked.", "model": "prisma-v3.0"})

        provider = GnaniPrismaTranscriptionProvider(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(handler),
        )
        result = await provider.transcribe(wav_b64(), "english")
        self.assertEqual(calls["n"], 2)
        self.assertEqual(result.text, "Retry worked.")

    async def test_rejects_webm_without_calling_gnani(self):
        def handler(request: httpx.Request) -> httpx.Response:
            raise AssertionError("WebM must not be sent to Prisma")

        provider = GnaniPrismaTranscriptionProvider(
            api_key="gnani-secret",
            transport=httpx.MockTransport(handler),
        )
        webm = base64.b64encode(b"\x1a\x45\xdf\xa3" + b"\x00" * 32).decode()
        with self.assertRaises(APIError) as caught:
            await provider.transcribe(webm, "english")
        self.assertEqual(caught.exception.code, "unsupported_audio")

    async def test_empty_transcript_is_an_error(self):
        provider = GnaniPrismaTranscriptionProvider(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(lambda request: httpx.Response(200, json={"transcript": "  "})),
        )
        with self.assertRaises(APIError) as caught:
            await provider.transcribe(wav_b64(), "english")
        self.assertEqual(caught.exception.code, "empty_transcript")

    async def test_authentication_failure(self):
        provider = GnaniPrismaTranscriptionProvider(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(lambda request: httpx.Response(401, json={"detail": {"error_code": "MISSING_API_KEY"}})),
        )
        with self.assertRaises(APIError) as caught:
            await provider.transcribe(wav_b64(), "english")
        self.assertEqual(caught.exception.code, "provider_authentication_failed")

    async def test_rejects_audio_longer_than_thirty_seconds(self):
        provider = GnaniPrismaTranscriptionProvider(api_key="gnani-secret")
        with self.assertRaises(APIError) as caught:
            await provider.transcribe(wav_b64(seconds=31), "english")
        self.assertEqual(caught.exception.code, "audio_too_long")


class FluencyMeasurementTests(unittest.TestCase):
    def test_voice_mode_without_audio_measurement_is_not_fluency(self):
        session = SimpleNamespace(interaction_mode=SimpleNamespace(value="voice"), responses=[SimpleNamespace()])
        self.assertFalse(_has_reliable_fluency_data(session))
