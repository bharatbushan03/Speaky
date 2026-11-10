# SpeakReady AI

SpeakReady is an English communication coach for HR interviews, technical interviews, and academic vivas. You sign in, answer questions by text or microphone, and keep scores, reports, and history on your account.

```text
Browser (Next.js on Azure Container Apps)
    │  Supabase access token
    ▼
FastAPI on Azure Container Apps
    │  user token + anon key, row-level security
    ▼
Supabase Auth + PostgreSQL
```

## What you can do

- Sign in with email and password, Google, or GitHub. Reset a forgotten password from the sign-in page.
- Practice HR, technical, and viva sessions. Questions are generated one at a time.
- Answer by typing or by microphone. Voice answers are recorded in the browser, sent to the API, and transcribed with Gnani Prisma when `STT_PROVIDER=gnani` and `GIANI_API_KEY` are set. You can edit the transcript before it is saved. Browser speech and typing remain available when Prisma is not configured or the recording fails.
- Hear questions from Gnani Timbre (Shivani on `timbre-v3.0`) when `TTS_PROVIDER=gnani`. The browser voice is used only if that call fails.
- Review a coaching report, session history, streaks, and score trends after a completed session. Scores come from saved evaluations. Spoken fluency stays empty unless a real audio measurement was stored.

Questions and scoring use a `mock` provider until you set OpenAI or Azure OpenAI. The mock provider does not call an external model.

## Requirements

- Node.js 22 (see `package.json`). The Azure web image uses Node 22.
- Python 3.11.9 (see `.python-version`).
- A Supabase project.
- Docker, only when applying migrations with the Docker `psql` commands in `backend/app/db/README.md`.

## Run it locally

### Frontend

```bash
npm ci
copy .env.example .env.local   # macOS/Linux: cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Put only these values in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `API_URL` | FastAPI URL. Locally this is `http://localhost:8000`. |
| `SUPABASE_URL` | Supabase project URL (`https://….supabase.co`). |
| `SUPABASE_ANON_KEY` | Supabase publishable anon key. The page needs it to sign in. |

Do not put the service-role key, `SECRET_KEY`, or an OpenAI key in the frontend env file.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
python -m pip install --requirement requirements.lock
copy .env.example .env          # macOS/Linux: cp .env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API docs: `http://localhost:8000/docs`. Liveness: `GET /health`.

For local practice without an AI bill, set `AI_PROVIDER=mock`, `STT_PROVIDER=mock`, and `TTS_PROVIDER=unconfigured`. `ALLOWED_ORIGINS` must include `http://localhost:3000`.

Sign-in calls Supabase from the browser. Session and progress routes then send `Authorization: Bearer <access token>` to FastAPI. The API checks that token with Supabase and reads the database as that user.

## Supabase

1. Create a project and copy the project URL and anon key into both env files.
2. Under Authentication → Providers, enable Email. Enable Google and GitHub if you want those buttons.
3. Under Authentication → URL Configuration, keep the production Site URL and add these Redirect URLs. Supabase sends Google sign-in and email confirmation to the Site URL when the current address is missing from this list:
   - `http://localhost:3000/**`
   - `http://127.0.0.1:3000/**`
   - the Azure web host from `WEB_URL`, with `/**`
4. Apply the SQL migrations in order. The app does not migrate itself.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_session_management.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/003_ai_question_generation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/004_answer_evaluation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/005_lock_down_legacy_tables.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/006_speech_metadata.sql
```

Windows `psql` examples are in `backend/app/db/README.md`. Stop on the first error. Do not re-run a migration that already succeeded.

## Deploy on Azure with GitHub Actions

Push to `main` runs the tests, then provisions and deploys both containers. The workflow is `.github/workflows/azure-dev.yml`. Pull requests only run the tests. Deployment stays skipped until `AZURE_CLIENT_ID` is set, so the pipeline is safe to merge before Azure is connected.

Create an app registration and a federated credential whose subject is `repo:<owner>/<repo>:ref:refs/heads/main`. Give that identity Contributor and User Access Administrator on the subscription. Contributor creates the resources. User Access Administrator is required because the template assigns the registry pull role and the Key Vault role.

Repository variables:

| Name | Example |
| --- | --- |
| `AZURE_CLIENT_ID` | Application (client) ID |
| `AZURE_TENANT_ID` | Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID |
| `AZURE_ENV_NAME` | `speakready` |
| `AZURE_LOCATION` | `centralindia` |
| `AI_PROVIDER` | `mock` |

Repository secrets:

| Name | Value |
| --- | --- |
| `SECRET_KEY` | Random string, at least 32 characters |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon key |

Leave the model secrets empty while `AI_PROVIDER` is `mock`. For Groq's free models, set `AI_PROVIDER` to `groq`, the secret `GROQ_API_KEY`, and optionally `GROQ_MODEL` (`qwen/qwen3.8-27b` by default). For Azure OpenAI, set `AI_PROVIDER` to `azure_openai`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and the secret `AZURE_OPENAI_API_KEY`.

Run the **CI/CD** workflow from the Actions tab, or push to `main`. The run prints `WEB_URL` and `API_URL`. Add these Supabase redirect URLs:

- `https://<web-host>/auth/callback`
- `https://<web-host>/auth/update-password`

Check `https://<api-host>/health` before signing in. Do not put the Supabase service-role key in `SUPABASE_ANON_KEY`.

## AI providers

| `AI_PROVIDER` | What it does |
| --- | --- |
| `groq` | Questions and evaluation through Groq's free-tier chat models. Set `GROQ_API_KEY`. `GROQ_MODEL` defaults to `qwen/qwen3.8-27b` with reasoning turned off so the first question returns quickly. |
| `mock` | Deterministic questions and scores. No API key. |
| `openai` | Questions and evaluation through OpenAI. Set `OPENAI_API_KEY` and `OPENAI_MODEL` on the backend only. |
| `azure_openai` | Same flow through an Azure OpenAI or Microsoft Foundry deployment. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT`. |
| `giani` | Refuses to run. Evon has no public chat endpoint. Do not point this value at another model and call it Evon. |

`TTS_PROVIDER=gnani` speaks questions with Timbre. `STT_PROVIDER=gnani` transcribes answers with Prisma. Both use `GIANI_API_KEY` on the backend only. The live model names are `timbre-v3.0` (voice `Shivani`) and `prisma-v3.0`, from the Gnani speech docs. `GET /api/v1/health/providers` reports which provider is actually configured. Browser speech is labeled as browser speech.

Details, request shapes, and the Evon limitation are in [GNANI_INTEGRATION.md](GNANI_INTEGRATION.md).

## Checks

```bash
npm run type-check
npm run lint
npm run build
```

```bash
cd backend
python -m unittest discover -s tests -v
```

Or, from the repository root, `make test` when `make` is available.

These tests do not call Supabase or Gnani. Gnani tests use mocked HTTP responses. A live Timbre or Prisma check needs a dashboard key and is described in [GNANI_INTEGRATION.md](GNANI_INTEGRATION.md). Before relying on production, sign in as two different users and confirm one cannot open the other's session.

## Demonstration

[Watch the demo video](demo.mp4)

1. Sign in.
2. Start an HR interview in voice mode.
3. The question is spoken by Timbre when the Gnani key is set. The screen names the question model from `/api/v1/health/providers`.
4. Record an answer and stop. Prisma returns the transcript. Edit it if needed.
5. Submit. The coaching note comes from `AI_PROVIDER` (Groq, OpenAI, Azure OpenAI, or mock). It is not labeled as Evon.
6. Finish the session and open the report. It shows the original answer, the corrected answer, mistakes, and practice suggestions. Spoken fluency is omitted when no acoustic measurement exists.

## Known limitations

- Evon v3.3 is published as weights and a closed beta. This app does not call it.
- Prisma REST accepts WAV, MP3, OGG, FLAC, and M4A up to 30 seconds. The browser converts a recording to 16 kHz WAV before upload. Raw audio is not stored.
- Spoken fluency is not scored from a transcript.
- Migration `006_speech_metadata.sql` must be applied before transcription provider, model, detected language, and duration are saved. Answers still save if that migration is missing.

## When something fails

- **Sign-in is not configured.** The frontend is missing `SUPABASE_URL` or `SUPABASE_ANON_KEY`. Restart `npm run dev` after changing them.
- **401 Please sign in again.** The API did not accept the Supabase access token. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the backend. Do not send the service-role key from the browser.
- **CORS error.** `ALLOWED_ORIGINS` must be the exact site origin, including `https://` and with no path.
- **Questions fail.** With `AI_PROVIDER=groq`, `openai`, or `azure_openai`, the matching key, model, or deployment is missing or rejected. `mock` still works without them.
- **OAuth returns to an error page.** The provider is disabled in Supabase, or the callback URL is not in the redirect allowlist.
- **Backend is not ready.** Check the Container App logs for the `api` service and confirm `SECRET_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are set. `GET /health` should return `{"status":"ok"}`.

## Project map

| Path | Role |
| --- | --- |
| `app/`, `components/` | Next.js pages and UI, including `/login` and `/auth/callback` |
| `lib/api-client.ts` | Attaches the Supabase access token to API calls |
| `backend/main.py` | FastAPI app, CORS, and request limits |
| `backend/app/db/migrations/` | Schema, RLS, and session RPCs, applied in numeric order |
| `backend/requirements.txt` | Python dependencies installed in the API image |
| `azure.yaml`, `infra/` | Azure Container Apps deployment |
| `Dockerfile`, `backend/Dockerfile` | Web and API images |

Session, progress, and feedback routes require a Supabase bearer token. The full route list is at `http://localhost:8000/docs` while the API is running.
