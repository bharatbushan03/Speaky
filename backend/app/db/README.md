# Database migrations and session management

SpeakReady AI uses Supabase PostgreSQL. Apply numbered migrations in order from
the repository root. Migration 002 adds Auth-owned, multi-question sessions;
migration 003 adds one-at-a-time generated-question persistence and private
evaluation criteria. Legacy tables and behavior remain unchanged.

## Apply to a clean Supabase project

Prerequisites: a Supabase project (or local Supabase stack), PostgreSQL 13+, the
`psql` client, and a migration connection with permission to create tables,
functions, policies, and grants in `public` and reference `auth.users`. Supabase
provides `auth.users`, `auth.uid()`, and the `anon`/`authenticated` roles; a bare
PostgreSQL database does not provide them automatically. Run migrations as a
trusted database owner, which becomes the owner of the security-definer RPC.

Have your environment supply `DATABASE_URL` through the deployment's secret
configuration; do not put credentials in SQL files or commit them. From the
repository root on Linux/macOS:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_session_management.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/003_ai_question_generation.sql
```

PowerShell equivalent:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/001_initial_schema.sql
if ($LASTEXITCODE -eq 0) {
    psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/002_session_management.sql
}
if ($LASTEXITCODE -eq 0) {
    psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/app/db/migrations/003_ai_question_generation.sql
}
```

If PowerShell has no local `psql`, Docker Desktop can provide a disposable
client. The `--network host` option is important for Supabase direct database
hosts that resolve only to IPv6 on Windows/Docker Desktop:

```powershell
docker run --rm --network host -v "${PWD}:/workspace:ro" postgres:16-alpine `
  psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 `
  -f /workspace/backend/app/db/migrations/001_initial_schema.sql
if ($LASTEXITCODE -eq 0) {
    docker run --rm --network host -v "${PWD}:/workspace:ro" postgres:16-alpine `
      psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 `
      -f /workspace/backend/app/db/migrations/002_session_management.sql
  if ($LASTEXITCODE -eq 0) {
    docker run --rm --network host -v "${PWD}:/workspace:ro" postgres:16-alpine `
      psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 `
      -f /workspace/backend/app/db/migrations/003_ai_question_generation.sql
  }
}
```

Stop after any failed migration. Each numbered file has its own transaction;
002 either installs its entire schema/security boundary or rolls back. It is a
one-time migration, deliberately using `CREATE` rather than silently accepting
an existing, potentially incompatible object. The migration runner must track
successful application; this directory does not implement a runner.

For an existing deployment, verify its migration history/schema first and apply
only missing migrations. `schema.sql` is a historical bootstrap, **not** another
numbered migration: it contains extra legacy triggers and RLS policies that are
absent from 001. Do not apply it after 001/002 as a substitute for migration
history. Migration 002 and 003 work alongside either legacy installation and
leave its legacy behavior alone. The numbered 001 → 002 → 003 path above is the
documented clean-project setup; it does not add `schema.sql`'s legacy
triggers/policies.

Use the same ordered commands against the intended deployment database. The main
integration work owns migration execution, environment/readiness verification,
and deployment configuration; no automatic or remote migration is performed by
these files.

## Legacy coexistence and authentication

Migration 001 owns the legacy `public.users`, `public.practice_sessions`,
`public.user_progress`, and `public.feedback_items` tables. Their existing data
and references stay in place. New sessions neither write legacy progress nor
modify legacy feedback.

Migration 002 adds:

| Table | Purpose and identity |
| --- | --- |
| `public.sessions` | UUID primary key; `user_id` references **`auth.users(id)`**, with `ON DELETE CASCADE`. |
| `public.session_questions` | UUID primary key; belongs to a new session, with cascading deletion. |
| `public.session_responses` | UUID primary key; one answer per question/session, with cascading deletion. |

A user must exist in Supabase Auth and make requests with that user's Supabase
access token, so `auth.uid()` resolves to their Auth UUID. A legacy `public.users`
row, custom application JWT, or service-role key alone is not a substitute for
this user context. There is **no legacy-user migration, identity matching by
email, password migration, or automatic Auth account creation** in 002.

## Stored configuration and constraints

All IDs, ownership, lifecycle timestamps, and audit timestamps are generated or
assigned by the database. Clients cannot set them through the RPC.

| Session field | Accepted values / default |
| --- | --- |
| `mode` | Required: `hr`, `technical`, `viva`. |
| `job_role` | Nullable string, max 255 characters; nonblank and required for `hr`/`technical`. |
| `subject` | Nullable string, max 255 characters; nonblank and required for `viva`. |
| `proficiency_level` | `beginner`, `intermediate` (default), `advanced`. |
| `difficulty` | `easy`, `medium` (default), `hard`. |
| `interaction_mode` | `text` (default), `voice`; immutable after creation. |
| `question_count` | Integer 3–10 inclusive; default 5, immutable after creation. |
| `explanation_language` | `english` (default), `hindi`, `tamil`, `telugu`, `bengali`, `kannada`. |
| `topic_focus` | Nullable string, max 500 characters; editable only while `created`. |
| `status` | Database starts at `created`; then `in_progress`, `completed`, or `cancelled` under the rules below. |
| `current_question_index` | Integer, initially 0; always `0 <= index < question_count`. |
| `started_at` / `completed_at` | Nullable `timestamptz`; assigned when starting/completing. |
| `created_at` / `updated_at` | Non-null `timestamptz`; database-assigned. |

Questions store `id`, `session_id`, `text`, `context`, `hints`, private
`evaluation_criteria`, `order_index`, `created_at`, and `updated_at`. Question
text must contain a non-whitespace
character and be at most 5,000 characters; optional context is at most 2,000.
Optional `hints` is SQL NULL or a JSONB array of at most 10 nonblank strings,
each at most 500 characters (`[]` is allowed). An RPC JSON `null` becomes SQL
NULL. Private evaluation criteria use the same bounded array shape and are not
included in `QuestionResponse` or the authenticated PostgREST column grant.
Order indexes are unique per session; migration
003 appends one contiguous index at a time and returns an existing row on a
retry for the same index.

Responses store `id`, `session_id`, `question_id`, `answer_text`,
`interaction_mode`, `transcript_edited`, `audio_url`, `created_at`, and
`updated_at`. Answers must contain a non-whitespace character and be at most
20,000 characters. The response mode must match the session mode. Text answers
require `transcript_edited = false` and `audio_url IS NULL`. Voice answers may
have an edited transcript and an optional HTTPS URL, max 1,000 characters, with
a hostname and no whitespace. URL validation is syntactic; the database never
fetches a URL or verifies audio ownership/existence.

Defense-in-depth table constraints enforce enum, length, blank-text, timestamp,
and local index bounds. Nonblank validation includes Unicode whitespace to
match the backend's Python `str.strip()` behavior regardless of database locale.
The composite FK
`(question_id, session_id) -> session_questions(id, session_id)` prevents an
answer from referencing a question in another session, even in privileged SQL.
`UNIQUE (session_id, question_id)` gives one response per question;
`UNIQUE (session_id, order_index)` gives one question per position. Cross-row
rules (full question set, session/answer mode matching, transitions, terminal
immutability) are enforced by the RPC, not merely by row constraints.

Indexes cover the sessions' owner plus descending creation time, each child's
session plus creation time, the composite question FK, and the unique keys.
All three new tables have a dedicated `updated_at` trigger, without reusing or
replacing legacy timestamp functions. Question replacement and answer writes
also refresh the parent session's `updated_at`.

## Controlled mutation RPC

```sql
public.manage_practice_session(
    p_action text,
    p_session_id uuid DEFAULT NULL,
    p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
```

Call this through Supabase RPC using the signed-in user's access token. For
example, the JSON arguments to `rpc('manage_practice_session', ...)` for creation
are:

```json
{
  "p_action": "create",
  "p_payload": {
    "mode": "technical",
    "job_role": "Backend engineer",
    "question_count": 3,
    "interaction_mode": "text"
  }
}
```

`p_payload` must be a JSON object. Each action has an explicit allowlist below;
unknown fields (including caller-supplied `user_id`, session/row IDs at creation,
timestamps, or nested question identity fields) fail closed. Strings, booleans, and integer numbers
must have their actual JSON types: stringified numbers/booleans, fractional
indexes, and explicit nulls for non-nullable fields are rejected. Optional
`job_role`, `subject`, `topic_focus`, question `context`/`hints`, and `audio_url`
can be null. Omission supplies the configuration defaults above, or the
action-specific behavior below.

| Action | Exact allowed payload fields | Behavior |
| --- | --- | --- |
| `create` | `mode`, `job_role`, `subject`, `proficiency_level`, `difficulty`, `interaction_mode`, `question_count`, `explanation_language`, `topic_focus` | Requires `p_session_id` absent/null, `mode`, and mode-specific role/subject. Uses only `auth.uid()` for ownership. Creates an empty `created` session. |
| `update` | `status`, `current_question_index`, `topic_focus` | Partial patch of a nonterminal session. Omitted fields are preserved; explicit null clears only `topic_focus`. `{}` is allowed and refreshes `updated_at`. |
| `questions` | `questions` (required array) | Only while `created`; atomically replaces the entire set. Each item allows only `text`, `context`, `hints`, `order_index`; text/index are required. Requires exactly `question_count` distinct, contiguous indexes. Generates new question UUIDs. Invalid batches leave the old set intact. |
| `response` | `question_id`, `answer_text`, `interaction_mode` (all required), `transcript_edited`, `audio_url` | Only while `in_progress`. Validates the UUID and membership in this session, then upserts by `(session_id, question_id)`. Existing response UUID/`created_at` are preserved; `updated_at` refreshes. Omitted `transcript_edited` defaults to false and omitted `audio_url` to null on **every submission**, including replacement answers. |
| `complete` | None: `{}` only | Only from `in_progress`, after all configured questions have answers. Sets `completed_at`. An already completed session returns unchanged, making this action idempotent. A `created` or `cancelled` session cannot complete. |

All actions except `create` require the owning session's UUID. They select the
owned session `FOR UPDATE` before mutation, serializing competing RPC writes
to the same parent, including question replacement, answer upsert, cancellation,
and completion. Browser calls can reach this RPC directly, so backend validation
is not the security boundary.

Migration 003 adds these security-definer RPCs:

```sql
public.persist_generated_question(
    p_session_id uuid,
    p_order_index integer,
    p_question jsonb
) RETURNS jsonb

public.start_practice_session(p_session_id uuid) RETURNS jsonb
```

`persist_generated_question` accepts only `text`, `context`, `hints`, and
private `evaluation_criteria`. It locks the owned session, requires the next
contiguous sequence index, rejects repeated normalized question text, and
returns the existing detailed session when that sequence index already exists.
This makes retries idempotent at the persistence boundary. It allows a created
session to accumulate questions one at a time and also allows the next question
while the session is in progress. `start_practice_session` is idempotent for an
already-started session and requires at least one persisted question.

### Lifecycle

```text
created -- first question + start_practice_session -------------> in_progress
created -- next contiguous question calls ----------------------> created
in_progress -- next question after saved answer ----------------> in_progress
created -------------------------------------------------------> cancelled
in_progress -- complete + every question answered -------------> completed
in_progress ---------------------------------------------------> cancelled
```

Keeping the same nonterminal status is permitted. Moving backwards or setting
`completed` through `update` is rejected. Both terminal states are immutable,
except for the read-like idempotent `complete` on `completed`. `started_at` is
set once when entering `in_progress`; cancellation preserves any existing start
time and does not set `completed_at`. Topic edits are permitted only when the
session is `created` at the start of the request (including a patch that also
starts/cancels it). Navigation can jump to any configured index in either
nonterminal state; it does not require earlier answers and does not auto-advance
when an answer is submitted.

### Return value and errors

Every successful action returns one detailed JSON object: **all session
columns**, plus `questions: [...]` and `responses: [...]`. Empty collections
are `[]`, never null. Each nested item includes all columns of its table.
Questions and responses are sorted by question `order_index`, with UUID
tie-breakers. No separate `get` action exists; reads use the RLS-protected
tables (including PostgREST embedded relations if desired).

Business errors use SQLSTATE **`P0001`** with exactly these messages for API
mapping:

| Message | Meaning |
| --- | --- |
| `session_not_found` | Missing/null session ID or session not owned by the caller; another user's existence is not disclosed. |
| `invalid_transition` | Action forbidden in the current state, backwards/patch completion, or topic edit after creation. |
| `session_incomplete` | Starting without a question, or completing without the full configured set/all answers. |
| `invalid_input` | Missing Auth identity, invalid action, unknown fields, wrong JSON types, malformed child UUID, bounds/constraint violations. |
| `question_not_found` | Well-formed question UUID does not belong to the owned session. |

The function checks JSON shapes before casts/array operations and normalizes
invalid text casts, numeric overflow, check/not-null/FK/unique violations,
truncation, and invalid-parameter errors to `invalid_input`. Its exception block
rolls back the call's changes. PostgreSQL/PostgREST can reject malformed typed
**RPC arguments** (for example invalid `p_session_id` UUID or invalid JSON)
before entering the function; transport/authentication, permission, and database
infrastructure failures are also outside this business-error mapping.

## Privileges, RLS, and threat model

- RLS on all three new tables provides **SELECT-only** policies for
  `authenticated`: own sessions by `auth.uid()`, and children through their
  owning session. Other users' rows are invisible.
- `PUBLIC`, `anon`, and `authenticated` have their direct table privileges
  revoked, then only `SELECT` is granted back to `authenticated`. This includes
  revoking direct insert/update/delete/truncate/reference/trigger privileges.
  There are no client mutation policies.
- `manage_practice_session` deliberately uses **`SECURITY DEFINER`**, with
  explicit `search_path = pg_catalog, public`, schema-qualified tables/Auth
  calls, and no dynamic SQL. Its trusted table-owning migration role bypasses
  RLS so the RPC can perform controlled mutations. RLS is enabled, not forced,
  for this reason. Every call requires `auth.uid()` and every existing-session
  action checks ownership explicitly before returning data or writing children.
- Default `PUBLIC` execution and `anon` execution are revoked; only
  `authenticated` is granted RPC execution. The text/hint/evaluation-validation,
  detail, and timestamp helper functions are not executable by `PUBLIC`, `anon`,
  or `authenticated`.
- These guarantees apply to untrusted API/browser roles. Database owners,
  superusers, and service/admin roles with independent write grants remain
  trusted administrative principals; they can bypass RLS or modify the schema.
  Do not use a service-role credential as the session user's identity. Backend
  session RPCs must preserve the verified user's Supabase Auth context.

This migration does not retrofit the legacy tables' privileges or RLS.

The Python runtime is pinned by the repository `.python-version`; backend
dependencies are pinned in `requirements.txt` and the reproducibility lockfile
`requirements.lock`. The Dockerfile installs the lockfile.

## Verification and implementation boundary

On the intended Supabase database, the main integration verification should
confirm the migration history, Auth context, grants, RLS isolation, and RPC
behavior. Useful metadata checks (no user-data reads required):

```sql
SELECT to_regclass('public.sessions'), to_regclass('public.session_questions'),
       to_regclass('public.session_responses');

SELECT c.relname, c.relrowsecurity
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sessions', 'session_questions', 'session_responses');

SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sessions', 'session_questions', 'session_responses');

SELECT has_function_privilege('authenticated',
           'public.manage_practice_session(text,uuid,jsonb)', 'EXECUTE') AS authenticated_rpc,
       has_function_privilege('anon',
           'public.manage_practice_session(text,uuid,jsonb)', 'EXECUTE') AS anon_rpc,
       has_table_privilege('authenticated', 'public.sessions', 'INSERT') AS direct_insert;
-- Expected: true, false, false.
```

Behavior checks should use two actual Auth users: create → replace questions →
start → submit/revise every answer → complete; verify sorted details and stable
upsert IDs/creation times. Confirm nonowners cannot read or mutate children,
direct writes are denied, malformed batches do not replace existing questions,
cross-session answers fail, cancellation/terminal rules hold, and concurrent
answer/completion calls serialize correctly. Run these only against a designated
local/test database, with disposable fixtures.

The repository contains offline API/schema validation tests under
`backend/tests`; they do not replace a real PostgreSQL/Supabase integration
test. Actual migration execution, RLS isolation, Auth-context behavior, and
multi-connection concurrency must be verified against a designated local or
test Supabase database with disposable fixtures. No remote migration is run by
the application or test command.

The database boundary persists generated questions but does not call an AI
service, transcribe or upload audio, fetch audio URLs, score answers, or
implement feedback. Provider credentials stay in the FastAPI backend. The
legacy full-set question action remains available for controlled/static data;
the practice room uses the migration-003 one-at-a-time RPCs.
