import json
import unittest

import httpx

from app.services.evaluation import GnaniTTS, gnani_language


class GnaniTTSTests(unittest.IsolatedAsyncioTestCase):
    def test_maps_practice_languages(self):
        self.assertEqual(gnani_language("english"), "en-IN")
        self.assertEqual(gnani_language("en-US"), "en-IN")
        self.assertEqual(gnani_language("hindi"), "hi-IN")
        self.assertEqual(gnani_language("tamil"), "ta-IN")
        self.assertEqual(gnani_language("telugu"), "te-IN")
        self.assertEqual(gnani_language("kannada"), "kn-IN")
        self.assertEqual(gnani_language("bengali"), "bn-IN")

    async def test_requests_shivani_on_timbre_v3(self):
        audio = b"ID3" + b"\x00" * 32

        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            self.assertEqual(str(request.url), "https://api.vachana.ai/api/v1/tts/inference")
            self.assertEqual(request.headers["x-api-key-id"], "gnani-secret")
            self.assertEqual(body["voice"], "Shivani")
            self.assertEqual(body["model"], "timbre-v3.0")
            self.assertEqual(body["language"], "en-IN")
            self.assertEqual(body["text"], "Order a meal.")
            self.assertEqual(body["audio_config"]["container"], "mp3")
            self.assertEqual(body["audio_config"]["sample_rate"], 24000)
            return httpx.Response(200, content=audio)

        provider = GnaniTTS(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(handler),
        )
        self.assertEqual(await provider.synthesize("Order a meal.", "english"), audio)

    async def test_retries_once_then_accepts_audio(self):
        calls = {"n": 0}
        audio = b"\xff\xfb" + b"\x00" * 32

        def handler(request: httpx.Request) -> httpx.Response:
            calls["n"] += 1
            if calls["n"] == 1:
                return httpx.Response(503, json={"message": "busy"})
            return httpx.Response(200, content=audio)

        provider = GnaniTTS(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(handler),
        )
        self.assertEqual(await provider.synthesize("Hello.", "hindi"), audio)
        self.assertEqual(calls["n"], 2)

    async def test_rejects_a_non_audio_body(self):
        provider = GnaniTTS(
            api_key="gnani-secret",
            retry_delay=0,
            transport=httpx.MockTransport(lambda request: httpx.Response(200, content=b"<html>no audio</html>")),
        )
        with self.assertRaises(Exception) as caught:
            await provider.synthesize("Hello.", "english")
        self.assertEqual(caught.exception.code, "provider_invalid_response")
