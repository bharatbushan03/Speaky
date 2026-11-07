import json
import unittest

import httpx

from app.services.evaluation import GnaniTTS, gnani_language


class GnaniTTSTests(unittest.IsolatedAsyncioTestCase):
    def test_maps_practice_languages(self):
        self.assertEqual(gnani_language("english"), "en-IN")
        self.assertEqual(gnani_language("en-US"), "en-IN")
        self.assertEqual(gnani_language("hindi"), "hi-IN")

    async def test_requests_shivani_on_timbre_v3(self):
        def handler(request: httpx.Request) -> httpx.Response:
            body = json.loads(request.content)
            self.assertEqual(str(request.url), "https://api.vachana.ai/api/v1/tts/inference")
            self.assertEqual(request.headers["x-api-key-id"], "gnani-secret")
            self.assertEqual(body["voice"], "Shivani")
            self.assertEqual(body["model"], "timbre-v3.0")
            self.assertEqual(body["language"], "en-IN")
            self.assertEqual(body["text"], "Order a meal.")
            return httpx.Response(200, content=b"mp3-bytes")

        provider = GnaniTTS(
            api_key="gnani-secret",
            transport=httpx.MockTransport(handler),
        )
        audio = await provider.synthesize("Order a meal.", "english")
        self.assertEqual(audio, b"mp3-bytes")
