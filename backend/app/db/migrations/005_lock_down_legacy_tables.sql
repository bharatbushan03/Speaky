-- Migration: lock down the legacy custom-account tables
-- The current application uses Supabase Auth and the Auth-owned session tables.
-- Legacy rows are preserved, but browser roles must not read password_hash or
-- mutate these tables through PostgREST.
BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
    public.users,
    public.practice_sessions,
    public.user_progress,
    public.feedback_items
FROM PUBLIC, anon, authenticated;

COMMIT;
