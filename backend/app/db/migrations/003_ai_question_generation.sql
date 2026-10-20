-- Migration: one-at-a-time AI question generation
-- Requires 001_initial_schema.sql and 002_session_management.sql.
-- Giani.ai's public API is not assumed here; this migration only adds the
-- storage and atomic database boundary used by configured providers.
BEGIN;

CREATE FUNCTION public.practice_session_evaluation_criteria_valid(p_criteria jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
    SELECT CASE
        WHEN p_criteria IS NULL THEN true
        WHEN jsonb_typeof(p_criteria) <> 'array' THEN false
        WHEN jsonb_array_length(p_criteria) > 10 THEN false
        ELSE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_criteria) AS criterion(value)
            WHERE jsonb_typeof(criterion.value) <> 'string'
               OR char_length(criterion.value #>> '{}') > 500
               OR NOT public.practice_session_text_nonblank(criterion.value #>> '{}')
        )
    END;
$$;

ALTER TABLE public.session_questions
    ADD COLUMN evaluation_criteria jsonb;

ALTER TABLE public.session_questions
    ADD CONSTRAINT session_questions_evaluation_criteria_check
    CHECK (public.practice_session_evaluation_criteria_valid(evaluation_criteria));

-- Do not expose private evaluation criteria through the authenticated
-- PostgREST table surface. The security-definer RPCs can still read/write the
-- column, while normal session reads receive only user-visible fields.
REVOKE SELECT ON TABLE public.session_questions FROM authenticated;
GRANT SELECT (
    id, session_id, text, context, hints, order_index, created_at, updated_at
) ON TABLE public.session_questions TO authenticated;

-- This helper is only callable by the two security-definer functions below.
-- The API response model deliberately ignores evaluation_criteria, keeping it
-- out of user-visible practice-room content.
CREATE FUNCTION public.practice_session_detail(p_session_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
    SELECT to_jsonb(s) || jsonb_build_object(
        'questions', COALESCE((
            SELECT jsonb_agg((to_jsonb(q) - 'evaluation_criteria') ORDER BY q.order_index, q.id)
            FROM public.session_questions AS q
            WHERE q.session_id = s.id
        ), '[]'::jsonb),
        'responses', COALESCE((
            SELECT jsonb_agg(to_jsonb(r) ORDER BY q.order_index, r.id)
            FROM public.session_responses AS r
            JOIN public.session_questions AS q
              ON q.id = r.question_id AND q.session_id = r.session_id
            WHERE r.session_id = s.id
        ), '[]'::jsonb)
    )
    FROM public.sessions AS s
    WHERE s.id = p_session_id;
$$;

CREATE FUNCTION public.persist_generated_question(
    p_session_id uuid,
    p_order_index integer,
    p_question jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid;
    v_session public.sessions%ROWTYPE;
    v_existing public.session_questions%ROWTYPE;
    v_question_count integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR p_session_id IS NULL OR p_order_index IS NULL
       OR p_question IS NULL OR jsonb_typeof(p_question) <> 'object' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    SELECT s.* INTO v_session
    FROM public.sessions AS s
    WHERE s.id = p_session_id AND s.user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_not_found';
    END IF;

    -- A retry with the same expected sequence position returns the winner,
    -- regardless of whether the original HTTP response reached the browser.
    SELECT q.* INTO v_existing
    FROM public.session_questions AS q
    WHERE q.session_id = v_session.id AND q.order_index = p_order_index;
    IF FOUND THEN
        RETURN public.practice_session_detail(v_session.id);
    END IF;

    IF v_session.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
    END IF;
    IF p_order_index < 0 OR p_order_index >= v_session.question_count THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_question) AS fields(key)
        WHERE fields.key NOT IN ('text', 'context', 'hints', 'evaluation_criteria')
    ) OR NOT (p_question ? 'text') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF jsonb_typeof(p_question -> 'text') <> 'string'
       OR char_length(p_question ->> 'text') > 5000
       OR NOT public.practice_session_text_nonblank(p_question ->> 'text') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF p_question ? 'context' AND jsonb_typeof(p_question -> 'context') NOT IN ('string', 'null') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF p_question ? 'context' AND char_length(p_question ->> 'context') > 2000 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF NOT public.practice_session_hints_valid(NULLIF(p_question -> 'hints', 'null'::jsonb))
       OR NOT public.practice_session_evaluation_criteria_valid(
           NULLIF(p_question -> 'evaluation_criteria', 'null'::jsonb)
       ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    SELECT count(*) INTO v_question_count
    FROM public.session_questions AS q
    WHERE q.session_id = v_session.id;
    IF v_question_count <> p_order_index THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.session_questions AS q
        WHERE q.session_id = v_session.id
          AND lower(btrim(q.text)) = lower(btrim(p_question ->> 'text'))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'question_duplicate';
    END IF;

    INSERT INTO public.session_questions (
        session_id, text, context, hints, evaluation_criteria, order_index
    ) VALUES (
        v_session.id,
        p_question ->> 'text',
        p_question ->> 'context',
        NULLIF(p_question -> 'hints', 'null'::jsonb),
        NULLIF(p_question -> 'evaluation_criteria', 'null'::jsonb),
        p_order_index
    );
    UPDATE public.sessions SET updated_at = clock_timestamp() WHERE id = v_session.id;
    RETURN public.practice_session_detail(v_session.id);
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range
        OR check_violation OR not_null_violation OR foreign_key_violation
        OR unique_violation OR string_data_right_truncation OR invalid_parameter_value THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
END;
$$;

CREATE FUNCTION public.start_practice_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid;
    v_session public.sessions%ROWTYPE;
    v_question_count integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR p_session_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    SELECT s.* INTO v_session
    FROM public.sessions AS s
    WHERE s.id = p_session_id AND s.user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_not_found';
    END IF;
    IF v_session.status = 'in_progress' THEN
        RETURN public.practice_session_detail(v_session.id);
    END IF;
    IF v_session.status <> 'created' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
    END IF;
    SELECT count(*) INTO v_question_count
    FROM public.session_questions AS q
    WHERE q.session_id = v_session.id;
    IF v_question_count < 1 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_incomplete';
    END IF;

    UPDATE public.sessions
    SET status = 'in_progress', started_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = v_session.id;
    RETURN public.practice_session_detail(v_session.id);
END;
$$;

REVOKE ALL ON FUNCTION public.practice_session_evaluation_criteria_valid(jsonb)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practice_session_detail(uuid)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.persist_generated_question(uuid, integer, jsonb)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_practice_session(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_generated_question(uuid, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_practice_session(uuid) TO authenticated;

COMMIT;
