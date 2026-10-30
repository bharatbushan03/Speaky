# SpeakReady AI

SpeakReady is an English communication coach for HR interviews, technical interviews, and academic vivas. You sign in, answer questions by text or microphone, and keep scores, reports, and history on your account.

```text
Browser (Next.js on Vercel)
    │  Supabase access token
    ▼
Cloudflare Worker → FastAPI container
    │  user token + anon key, row-level security
    ▼
Supabase Auth + PostgreSQL
```

## What you can do

- Sign in with email and password, Google, or GitHub. Reset a forgotten password from the sign-in page.
- Practice HR, technical, and viva sessions. Questions are generated one at a time.
- Answer by typing or with the browser microphone. Text mode works when speech recognition is unavailable.
- Review a coaching report, session history, streaks, and score trends after a completed session.

Questions and scoring use a `mock` provider until you set OpenAI or Azure OpenAI. The mock provider does not call an external model.

## Requirements

- Node.js 22 (see `.nvmrc`). Vercel builds with `22.x`.
- Python 3.11.9 (see `.python-version`).
- A Supabase project.
- Docker, only when you deploy the API to Cloudflare or apply migrations with the Docker `psql` commands in `backend/app/db/README.md`.

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
| `NEXT_PUBLIC_API_URL` | FastAPI URL. Locally this is `http://localhost:8000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://….supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. This key is public. |

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
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/update-password`
   - the same two paths on your Vercel domain after the frontend is deployed
4. Apply the SQL migrations in order. The app does not migrate itself.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_session_management.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/003_ai_question_generation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/004_answer_evaluation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/005_lock_down_legacy_tables.sql
```

Windows `psql` examples are in `backend/app/db/README.md`. Stop on the first error. Do not re-run a migration that already succeeded.

## Deploy

Deploy the API before the frontend so you have a Worker URL for `NEXT_PUBLIC_API_URL`.

### API on Cloudflare

Docker must be running. From the repository root, set the required secrets, then deploy:

```bash
npx wrangler secret put SECRET_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler deploy
```

`SECRET_KEY` is a random string of at least 32 characters. It is not a Supabase token. `ALLOWED_ORIGINS` is the exact frontend origin, for example `https://your-app.vercel.app`. Production origins must be `https`.

Optional secrets, only if you use them: `OPENAI_API_KEY`, `SUPABASE_KEY`, `AZURE_OPENAI_API_KEY`, `DATABASE_URL`. Names match `backend/.env.example`. Non-secret defaults such as `AI_PROVIDER=mock` live in `wrangler.jsonc`. Change that file and deploy again when you switch to `openai` or `azure_openai`.

The Worker URL from the deploy output is the public API. Check `https://<worker>/health` before pointing the site at it.

### Frontend on Vercel

Import this repository. The framework is Next.js. `vercel.json` already sets `npm ci` and `npm run build`. Node is `22.x` from `package.json`.

Set the three `NEXT_PUBLIC_` variables for Production and Preview. `NEXT_PUBLIC_API_URL` is the Worker URL, with no trailing slash.

After the site has a domain, add that origin to `ALLOWED_ORIGINS` (`npx wrangler secret put ALLOWED_ORIGINS`) and to the Supabase redirect URLs, then deploy the API again.

## AI providers

| `AI_PROVIDER` | What it does |
| --- | --- |
| `mock` | Deterministic questions and scores. No API key. |
| `openai` | Questions and evaluation through OpenAI. Set `OPENAI_API_KEY` and `OPENAI_MODEL` on the backend only. |
| `azure_openai` | Same flow through an Azure OpenAI or Microsoft Foundry deployment. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT`. |
| `giani` | Refuses to run. There is no verified public API to call. |

`TTS_PROVIDER=openai` speaks questions aloud. Leave it `unconfigured` to skip speech. Browser speech-to-text is separate and does not need a backend STT key.

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

These tests do not call Supabase or a paid model. Before relying on production, sign in as two different users and confirm one cannot open the other's session.

## When something fails

- **Sign-in is not configured.** The frontend is missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Restart `npm run dev` after changing them.
- **401 Please sign in again.** The API did not accept the Supabase access token. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the backend. Do not send the service-role key from the browser.
- **CORS error.** `ALLOWED_ORIGINS` must be the exact site origin, including `https://` and with no path.
- **Questions fail.** With `AI_PROVIDER=openai` or `azure_openai`, the matching key, model, or deployment is missing or rejected. `mock` still works without them.
- **OAuth returns to an error page.** The provider is disabled in Supabase, or the callback URL is not in the redirect allowlist.
- **Container is not ready.** Docker was not running at deploy time, a required Worker secret is missing, or the first container start is still finishing. `GET /health` should return `{"status":"ok"}`.

## Project map

| Path | Role |
| --- | --- |
| `app/`, `components/` | Next.js pages and UI, including `/login` and `/auth/callback` |
| `lib/api-client.ts` | Attaches the Supabase access token to API calls |
| `backend/main.py` | FastAPI app, CORS, and request limits |
| `backend/app/db/migrations/` | Schema, RLS, and session RPCs, applied in numeric order |
| `Dockerfile` | API image used by Cloudflare |
| `wrangler.jsonc`, `cloudflare/index.ts` | Worker that starts the container and forwards requests |
| `vercel.json` | Frontend install and build commands |

Session, progress, and feedback routes require a Supabase bearer token. The full route list is at `http://localhost:8000/docs` while the API is running.
