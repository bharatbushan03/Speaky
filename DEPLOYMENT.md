# SpeakReady AI deployment checklist

This is the release handover for the current repository. It intentionally does
not contain credentials or provider-specific dashboard values.

## Before release

- [ ] Create a production Supabase project and configure Auth email/password,
      site URL, redirect URLs, email delivery, and SMTP if required.
- [ ] Apply migrations 001, 002, 003, 004, and 005 in order using a secure
      `DATABASE_URL`; record the successful migration list.
- [ ] Verify `sessions`, `session_questions`, `session_responses`,
      `session_evaluations`, and `response_evaluations` exist.
- [ ] Verify RLS is enabled and `authenticated` cannot directly write user data.
- [ ] Verify `authenticated` can execute only the intended session/evaluation
      RPCs and `anon` cannot execute them.
- [ ] Create two disposable Auth users and test ownership isolation.
- [ ] Provision the backend service and a secret store. Set production
      variables from `backend/.env.example`.
- [ ] Provision a backend HTTPS URL and set it in the frontend environment.
- [ ] Provision the frontend and set its exact URL in backend
      `ALLOWED_ORIGINS` and Supabase Auth redirect/site settings.

## Backend release

Recommended Render-compatible settings:

```text
Root directory: backend
Build: pip install --requirement requirements.lock
Start: uvicorn main:app --host 0.0.0.0 --port $PORT
Health path: /health
```

Set `ENVIRONMENT=production`, `DEBUG=False`, a generated `SECRET_KEY`, exact
HTTPS `ALLOWED_ORIGINS`, Supabase URL/anon key, and the chosen AI/STT/TTS
provider values. Keep service-role/database/provider secrets server-side.

Check:

```bash
curl -i https://<backend-host>/health
curl -i https://<backend-host>/api/v1/health/
curl -i https://<backend-host>/api/v1/health/ready
```

Readiness is expected to be non-2xx until Supabase is reachable and the selected
AI provider is configured.

## Frontend release

Recommended Vercel settings:

```text
Install: npm ci
Build: npm run build
```

Set only:

```text
NEXT_PUBLIC_API_URL=https://<backend-host>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
```

Never set `SUPABASE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`, `GIANI_API_KEY`, or
`SECRET_KEY` as `NEXT_PUBLIC_*` variables.

## Smoke test after both deploys

1. Register/sign in with a disposable Supabase Auth account.
2. Create HR, technical, and viva sessions with valid mode-specific fields.
3. Generate, start, answer, revise, navigate, and complete a session.
4. Confirm evaluation is persisted and the session report renders.
5. Confirm history filters, pagination, dashboard summary, streaks, and report
   links work after refresh.
6. Test browser voice input and the unsupported-browser fallback.
7. Test logout and re-login.
8. Repeat read/mutate/report requests with a second account and confirm 404/403
   ownership protection.
9. Check provider failure, slow network, invalid input, 413 body limit, CORS,
   and rate-limit responses.

## Rollback and incident response

- Application rollback: redeploy the previous known-good frontend/backend
  artifact. Keep database schema backward compatible during a release window.
- Database rollback: do not reverse migrations with ad hoc destructive SQL.
  Use a reviewed forward compatibility migration or restore a tested backup to a
  separate database and cut over after verification.
- Revoke/rotate any credential that appears in logs, tickets, shell history, or
  a shared workspace. Never paste raw provider payloads or bearer tokens into
  issue reports.
- Inspect request IDs, status codes, provider latency/rate-limit events, and
  Supabase logs without logging answer text, passwords, or tokens.
