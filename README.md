# SpeakReady AI

SpeakReady AI is an AI English communication coach for interview and academic
viva preparation. Users configure an owned practice session, receive questions
one at a time, answer by text or browser speech recognition, save/resume the
session, and review persisted coaching feedback and progress.

This repository is prepared for deployment, but no external hosting account,
domain, Supabase project, AI credit, or production deployment is assumed. The
production URLs are therefore configured by the operator after deployment and
are not claimed here.

## Features

- HR interview, technical interview, and academic viva practice modes.
- Supabase Auth bearer-token authentication and user-scoped session access.
- Atomic PostgreSQL RPCs for session creation, question persistence, answer
  upserts, lifecycle transitions, completion, and evaluation persistence.
- Mock question/evaluation adapters for offline development, OpenAI adapters,
  and Azure OpenAI adapters for Microsoft Foundry chat-completion deployments.
- Browser SpeechRecognition voice input with an explicit unsupported-browser
  fallback; transcripts are saved as answers only after submission.
- Session history, filters, score trends, reports, streaks, and progress data.
- Bounded request payloads, CORS allowlisting, request IDs, in-process burst
  protection, dependency health checks, and production container hardening.

## Architecture

```text
Next.js 14 App Router / TypeScript / Tailwind
        │ HTTPS + Supabase Auth access token
        ▼
FastAPI / Pydantic / provider adapters
        │ user-scoped PostgREST + controlled security-definer RPCs
        ▼
Supabase PostgreSQL + Supabase Auth + RLS
```

### Technology stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix primitives,
  Axios, Supabase browser client.
- Backend: Python 3.11, FastAPI, Pydantic v2, Uvicorn, httpx, Supabase
  PostgREST/Auth integration.
- Data/auth: Supabase PostgreSQL, Supabase Auth, RLS, numbered SQL migrations.
- AI: deterministic `mock` adapter, backend-only OpenAI adapter, or Azure OpenAI
  adapter for Microsoft Foundry deployments. Giani is fail-closed because its
  public developer contract was not verifiable in this repository; do not guess
  an endpoint or request format.

## Prerequisites

- Node.js version in `.nvmrc` (20.11.1).
- Python version in `.python-version` (3.11.9).
- npm and a Python virtual environment.
- A Supabase project for authenticated sessions and persistence.
- An OpenAI account/key only if `AI_PROVIDER=openai` or OpenAI STT/TTS is used,
  or an Azure OpenAI/Microsoft Foundry deployment and backend credential if
  `AI_PROVIDER=azure_openai`.
- `psql` or Docker Desktop for applying migrations.

## Local setup

### Frontend

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The frontend runs at `http://localhost:3000` by default. `.env.local` must
contain the public API URL and public Supabase URL/anon key. It must not contain
an OpenAI key, service-role key, database password, or `SECRET_KEY`.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install --requirement requirements.lock
cp .env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API runs at `http://localhost:8000`. Swagger is available at
`http://localhost:8000/docs` and ReDoc at `/redoc`.

For offline development, set `AI_PROVIDER=mock`, `STT_PROVIDER=mock`, and
`TTS_PROVIDER=unconfigured`. Mock question/evaluation generation does not call a
provider. Voice input requires a browser implementing SpeechRecognition.

## Environment variables

### Frontend (`.env.local` / Vercel)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Public FastAPI base URL, for example `https://api.example.com`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase anon/publishable key. |

### Backend (`backend/.env` / Render secret environment)

| Variable | Required | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | Production | `development` or `production`. |
| `DEBUG` | Yes | Must be `False` in production. |
| `LOG_LEVEL` | Yes | `INFO`, `WARNING`, or another supported logging level. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Yes | Used for Auth validation and user-scoped PostgREST. |
| `SUPABASE_KEY` | Optional | Backend-only service role for legacy/admin operations; current user flow does not need it. Never expose it. |
| `DATABASE_URL` | Migration only | PostgreSQL connection string used by the migration operator. |
| `SECRET_KEY` | Production | Random backend secret, at least 32 characters; not used as a Supabase user token. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated exact frontend origins. Production origins must use HTTPS. |
| `AI_PROVIDER` | Yes | `mock`, `openai`, `azure_openai`, or fail-closed `giani`. |
| `AI_REQUEST_TIMEOUT_SECONDS` | Yes | Provider timeout, bounded to 1–120 seconds. |
| `OPENAI_API_KEY` | If OpenAI | Backend-only OpenAI credential. |
| `OPENAI_MODEL` | If OpenAI | Chat model used for questions/evaluation. |
| `AZURE_OPENAI_ENDPOINT` | If Azure OpenAI | Azure OpenAI resource or Microsoft Foundry project endpoint. |
| `AZURE_OPENAI_API_KEY` | If Azure OpenAI | Backend-only Azure OpenAI credential. |
| `AZURE_OPENAI_DEPLOYMENT` | If Azure OpenAI | The deployed model name shown in Microsoft Foundry. |
| `OPENAI_TTS_MODEL` / `OPENAI_TTS_VOICE` | If OpenAI TTS | TTS model and voice. |
| `GIANI_API_KEY`, `GIANI_API_URL`, `GIANI_MODEL` | If verified later | Placeholders only; currently fails closed. |
| `STT_PROVIDER` | Yes | `openai`, `google`, `azure`, or `mock`. Google/Azure adapters are not implemented. |
| `TTS_PROVIDER` | Yes | `openai`, `mock`, or `unconfigured`. |
| `MAX_REQUEST_BODY_BYTES` | Optional | Default 1,000,000 bytes. |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | Optional | Per-process burst guard; use an edge/WAF limiter for multiple replicas. |

The canonical variable lists are `.env.example` and `backend/.env.example`.
Never commit `.env`, `.env.local`, credentials, or provider payloads.

For Microsoft Foundry, set `AI_PROVIDER=azure_openai`, use the endpoint for the
Azure OpenAI resource or Foundry project, and set
`AZURE_OPENAI_DEPLOYMENT` to the deployment name shown in Foundry. The backend
sends the deployment name as the chat-completions `model` value and keeps the
credential server-side.

## Database migrations

Apply migrations in order to a designated Supabase production/test database.
The application never runs migrations automatically.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_session_management.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/003_ai_question_generation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/004_answer_evaluation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/005_lock_down_legacy_tables.sql
```

On Windows without native `psql`, use the Docker commands in
`backend/app/db/README.md`. Stop on the first error and record successful
migrations in the deployment runbook. Do not re-run a migration blindly on an
existing database; inspect schema/history first.

Migration 005 preserves historical custom-account rows while enabling RLS and
revoking `anon`/`authenticated` table access. The current application uses
Supabase Auth, not the legacy `password_hash` account flow. Verify RLS, grants,
RPC execution, and two-user isolation before production cutover. Rollback is a
forward migration or a tested database restore; do not delete tables or data as
a rollback shortcut.

## API overview

All session, progress, feedback, transcription, and TTS routes require:

```text
Authorization: Bearer <Supabase Auth access token>
```

Public health endpoints:

- `GET /health` — liveness.
- `GET /api/v1/health/` — API liveness.
- `GET /api/v1/health/ready` — Supabase reachability, configuration, and AI readiness; returns 503 when degraded.

Session endpoints:

- `POST /api/v1/sessions/`
- `GET /api/v1/sessions/` and `GET /api/v1/sessions/{id}`
- `POST /api/v1/sessions/{id}/questions/generate`
- `POST /api/v1/sessions/{id}/start`
- `POST /api/v1/sessions/{id}/responses`
- `POST /api/v1/sessions/{id}/complete`
- `GET /api/v1/sessions/{id}/evaluation` and `POST /api/v1/sessions/{id}/evaluate`

Progress endpoints:

- `GET /api/v1/progress/summary`
- `GET /api/v1/progress/history` with mode/topic/status/date/limit/offset filters
- `GET /api/v1/progress/trends`
- `GET /api/v1/progress/recommendations`
- `GET /api/v1/progress/sessions/{id}/report`

AI boundaries:

- `POST /api/v1/feedback/analyze`
- `POST /api/v1/feedback/transcribe`
- `POST /api/v1/feedback/tts` returns audio bytes when a TTS provider is configured.

FastAPI generates the complete OpenAPI contract at `/openapi.json`.

## Checks and testing

From the repository root:

```bash
npm ci
npm run type-check
npm run lint
npm run build
```

From `backend/`:

```bash
python -m unittest discover -s tests -v
python -m compileall -q app main.py
python -m pip check
```

The offline tests cover session schema/authorization boundaries and question
provider adapters. They do not prove a real Supabase database, RLS isolation,
AI credit, microphone permission, or a deployed browser flow. Run the two-user
database checks in `backend/app/db/README.md` against disposable fixtures before
production.

## Deployment

### 1. Supabase

1. Create/select the production project and configure Auth email/password and
   allowed redirect/site URLs for the final frontend URL.
2. Apply migrations 001–005 in order with a secure database connection.
3. Verify the session/evaluation tables, RLS, RPC grants, and Auth user isolation.
4. Keep the database password, service-role key, and migration connection out of
   frontend settings and source control.

### 2. Backend on Render (or another Python host)

`render.yaml` provides a starting service definition. Set all `sync: false`
variables in the provider dashboard, especially `SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `ALLOWED_ORIGINS`, and any AI key. Use:

```text
Build: pip install --requirement requirements.lock
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Health: /health
```

Set `ENVIRONMENT=production`, `DEBUG=False`, a random `SECRET_KEY`, and the
final HTTPS frontend origin. Run a smoke check against `/health` and
`/api/v1/health/ready` before pointing the browser at the service.

### 3. Frontend on Vercel

`vercel.json` pins the reproducible commands. Import the repository, select the
Next.js framework, and set:

```text
Install: npm ci
Build: npm run build
NEXT_PUBLIC_API_URL=https://<backend-host>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
```

After deployment, add the exact Vercel URL to the backend `ALLOWED_ORIGINS` and
Supabase Auth site/redirect URL settings. Re-deploy the backend if its origin
allowlist changes.

### 4. Cutover verification

Use a disposable Auth account to test registration/login, session creation,
question generation, text answer save, voice/browser transcription where
supported, completion, evaluation, history/report, analytics, and logout. Use a
second account to verify it cannot read or mutate the first account's session.
Do not claim a production URL or successful deployment until those provider
dashboard and browser checks have actually succeeded.

## Troubleshooting

- **401/authentication required:** confirm Supabase Auth has a session, the
  frontend API URL is correct, and the backend has the anon key. Do not use the
  service-role key as a browser bearer token.
- **503 authentication/database unavailable:** check Supabase URL, anon key,
  project status, CORS origin, and `/api/v1/health/ready`.
- **Questions/evaluation unavailable:** check `AI_PROVIDER`, provider key/model,
  Azure endpoint/deployment when using `azure_openai`, credit/rate limits, and
  backend logs. `mock` is the offline fallback.
- **TTS unavailable:** configure `TTS_PROVIDER=openai` and the OpenAI key, or
  leave the feature disabled. The endpoint no longer returns fabricated URLs.
- **Voice input unavailable:** browser SpeechRecognition support and microphone
  permission are required. Use text mode if the browser does not support it.
- **CORS errors:** add the exact scheme/host/port of the frontend to
  `ALLOWED_ORIGINS`; production origins must be HTTPS.
- **Migration errors:** stop, save the database error, inspect which migration
  completed, and apply only the next compatible migration after review.

## Important files

- `app/` and `components/`: Next.js pages and UI.
- `lib/api-client.ts`: authenticated Axios boundary and safe error mapping.
- `backend/main.py`: FastAPI app, request safety, CORS, and health routes.
- `backend/app/services/`: session, AI, transcription, and evaluation logic.
- `backend/app/db/migrations/`: ordered schema/RLS/RPC changes.
- `DEPLOYMENT.md`: concise release checklist and manual setup boundary.

## Known limitations

- No deployment was performed from this workspace; hosting permissions and
  production credentials are manual setup requirements.
- Real Supabase/RLS, microphone, and paid AI-provider checks require external
  services and were not replaced by offline tests.
- Google/Azure STT adapters and the Giani provider remain explicitly
  unconfigured rather than guessing undocumented integrations. Azure OpenAI
  question generation and evaluation are supported separately through the
  `azure_openai` AI provider.
- The in-process request limiter is not a substitute for an edge/WAF limiter
  when running multiple workers or replicas.

## License

This project is proprietary and confidential.
