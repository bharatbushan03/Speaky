# Gnani integration

Speech uses the public Gnani speech API at `https://api.vachana.ai`. The key stays in `GIANI_API_KEY` on the FastAPI process. The browser never receives it.

This file describes the calls the code makes. Automated tests mock HTTP. They do not prove that a live key works.

## Timbre text-to-speech

Documented model: `timbre-v3.0`. Shivani is a female Timbre v3.0 voice and speaks the documented Indian languages, including English, Hindi, Tamil, Telugu, Kannada, and Bengali.

- Docs: https://docs.gnani.ai/api/TTS/tts-inference
- Voices: https://docs.gnani.ai/api/TTS/available-voices
- Endpoint: `POST https://api.vachana.ai/api/v1/tts/inference`
- Header: `X-API-Key-ID`
- Body: `text`, `voice`, `model`, `language`, `speed`, `audio_config`
- Success: `200` with raw audio. This app requests MP3 at 24 kHz, which the docs list as valid (`sample_rate` may be 8000, 16000, 22050, 24000, 44100, or 48000; `container` may be `mp3`).
- The API checks that the body looks like MP3, WAV, or OGG. A `429` or `5xx` is retried once.

Language labels from the practice form map to `en-IN`, `hi-IN`, `ta-IN`, `te-IN`, `kn-IN`, and `bn-IN`.

If the call fails, the page uses the browser speech engine and says that Timbre was unavailable.

## Prisma speech-to-text

Documented model: `prisma-v3.0`.

- Docs: https://docs.gnani.ai/api/STT/speech-to-text
- Endpoint: `POST https://api.vachana.ai/stt/v3`
- Header: `X-API-Key-ID`
- Form fields: `audio_file`, `model=prisma-v3.0`, `language_code`, `format=transcribe`
- Accepted audio: WAV, MP3, OGG, FLAC, AAC, M4A. Maximum 30 seconds.
- Success body includes `transcript`, `model`, and, when speech was detected, `detected_language_code`. An empty `transcript` is not treated as a successful answer.
- Confidence is not returned by this endpoint, so the app does not invent one.

The browser records with `MediaRecorder`, decodes the clip, and uploads 16 kHz mono WAV. WebM is rejected before it is sent. English is always one language hint. The explanation language is added as a second hint (`en-IN,hi-IN` for Hindi, and the same pattern for Tamil, Telugu, Kannada, and Bengali). Prisma still follows the language that was spoken.

The transcript is shown in an editable field. The saved answer is that text. Raw audio is not stored. Migration `006_speech_metadata.sql` can store the provider name, model, detected language, and duration on the answer row.

Browser speech recognition is a separate fallback. The screen says so. It is not Prisma.

## Evon

Evon v3.3 weights are on Hugging Face (`gnani/gnani-evon-v3.3-30B-A3B`). The hosted Gnani API for Evon is a closed beta and the speech docs do not publish a chat-completions endpoint or a request schema.

`AI_PROVIDER=giani` still fails closed. Question generation and evaluation stay on Groq, OpenAI, Azure OpenAI, or the mock provider. `/api/v1/health/providers` says Evon is unavailable and names the model that is configured.

## Configuration

```text
GIANI_API_KEY=
GIANI_API_URL=https://api.vachana.ai
TTS_PROVIDER=gnani
GNANI_TTS_MODEL=timbre-v3.0
GNANI_TTS_VOICE=Shivani
STT_PROVIDER=gnani
GNANI_STT_MODEL=prisma-v3.0
```

`GET /api/v1/health/providers` reports provider names and whether a key is present. It does not return the key and it does not call Gnani.

## Tests

```bash
cd backend
python -m unittest tests.test_gnani_tts tests.test_gnani_prisma -v
```

Those tests check the documented URL, header, model, voice, language mapping, audio validation, empty audio, and one retry. They use `httpx.MockTransport`.

## Manual check

Use a key from the Gnani dashboard. Do not commit it.

1. Set the variables above in `backend/.env` and restart uvicorn.
2. Sign in, start a voice HR session, and confirm the question plays as audio rather than the browser voice. The label should name `gnani` and `timbre-v3.0`.
3. Record a short English answer and stop. The transcript should appear for editing, labeled `prisma-v3.0`.
4. `GET /api/v1/health/providers` should show `tts.configured` and `stt.configured` as true, and `evon.available` as false.

A live check against the key in this workspace returned `200` from Timbre with an MP3 body, and `200` from Prisma with `model` `prisma-v3.0`. The Prisma check used a one-second silent WAV, so it verified the endpoint, authentication, and model name. It did not verify a spoken sentence.

A failed manual check means the integration is not verified for that key. The mocked tests can still pass.
