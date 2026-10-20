-- Migration: Auth-owned, multi-question practice sessions
-- Additive: no legacy tables, functions, policies, or data are changed.
-- Requires Supabase Auth and PostgreSQL 13+ (pg_catalog.gen_random_uuid).
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Match Python str.strip() whitespace even when the database locale's POSIX
-- space class omits nonbreaking spaces and other Unicode whitespace.
CREATE FUNCTION public.practice_session_text_nonblank(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = pg_catalog, public
AS $$
    SELECT p_text ~ U&'[^[:space:]\001C-\001F\0085\00A0\1680\2000-\200A\2028\2029\202F\205F\3000]';
$$;

-- Shared by the table constraint and RPC validation. JSON null is normalized
-- to SQL NULL by the RPC; non-null hints must be a bounded array of strings.
CREATE FUNCTION public.practice_session_hints_valid(p_hints jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $$
    SELECT CASE
        WHEN p_hints IS NULL THEN true
        WHEN jsonb_typeof(p_hints) <> 'array' THEN false
        WHEN jsonb_array_length(p_hints) > 10 THEN false
        ELSE NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_hints) AS hint(value)
            WHERE jsonb_typeof(hint.value) <> 'string'
               OR char_length(hint.value #>> '{}') > 500
               OR NOT public.practice_session_text_nonblank(hint.value #>> '{}')
        )
    END;
$$;

CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode text NOT NULL CHECK (mode IN ('hr', 'technical', 'viva')),
    job_role text CHECK (char_length(job_role) <= 255),
    subject text CHECK (char_length(subject) <= 255),
    proficiency_level text NOT NULL DEFAULT 'intermediate'
        CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced')),
    difficulty text NOT NULL DEFAULT 'medium'
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    interaction_mode text NOT NULL DEFAULT 'text'
        CHECK (interaction_mode IN ('text', 'voice')),
    question_count integer NOT NULL DEFAULT 5 CHECK (question_count BETWEEN 3 AND 10),
    explanation_language text NOT NULL DEFAULT 'english'
        CHECK (explanation_language IN ('english', 'hindi', 'tamil', 'telugu', 'bengali', 'kannada')),
    topic_focus text CHECK (char_length(topic_focus) <= 500),
    status text NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'in_progress', 'completed', 'cancelled')),
    current_question_index integer NOT NULL DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT sessions_mode_details_check CHECK (
        (mode IN ('hr', 'technical') AND job_role IS NOT NULL
            AND public.practice_session_text_nonblank(job_role))
        OR (mode = 'viva' AND subject IS NOT NULL
            AND public.practice_session_text_nonblank(subject))
    ),
    CONSTRAINT sessions_question_index_check CHECK (
        current_question_index >= 0 AND current_question_index < question_count
    ),
    CONSTRAINT sessions_lifecycle_timestamps_check CHECK (
        (status = 'created' AND started_at IS NULL AND completed_at IS NULL)
        OR (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL)
        OR (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL)
        OR (status = 'cancelled' AND completed_at IS NULL)
    ),
    CONSTRAINT sessions_timestamp_order_check CHECK (
        updated_at >= created_at
        AND (started_at IS NULL OR started_at >= created_at)
        AND (completed_at IS NULL OR completed_at >= started_at)
    )
);

CREATE TABLE public.session_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    text text NOT NULL
        CHECK (char_length(text) <= 5000 AND public.practice_session_text_nonblank(text)),
    context text CHECK (char_length(context) <= 2000),
    hints jsonb CHECK (public.practice_session_hints_valid(hints)),
    order_index integer NOT NULL CHECK (order_index BETWEEN 0 AND 9),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT session_questions_session_order_key UNIQUE (session_id, order_index),
    -- The composite key is the target of the answer's same-session FK.
    CONSTRAINT session_questions_id_session_key UNIQUE (id, session_id),
    CONSTRAINT session_questions_timestamps_check CHECK (updated_at >= created_at)
);

CREATE TABLE public.session_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    question_id uuid NOT NULL,
    answer_text text NOT NULL
        CHECK (char_length(answer_text) <= 20000 AND public.practice_session_text_nonblank(answer_text)),
    interaction_mode text NOT NULL CHECK (interaction_mode IN ('text', 'voice')),
    transcript_edited boolean NOT NULL DEFAULT false,
    audio_url text CHECK (
        char_length(audio_url) <= 1000
        AND audio_url ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
        AND audio_url !~ U&'[\001C-\001F\0085\00A0\1680\2000-\200A\2028\2029\202F\205F\3000]'
    ),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT session_responses_question_session_fkey
        FOREIGN KEY (question_id, session_id)
        REFERENCES public.session_questions(id, session_id) ON DELETE CASCADE,
    CONSTRAINT session_responses_session_question_key UNIQUE (session_id, question_id),
    CONSTRAINT session_responses_text_metadata_check CHECK (
        interaction_mode = 'voice' OR (NOT transcript_edited AND audio_url IS NULL)
    ),
    CONSTRAINT session_responses_timestamps_check CHECK (updated_at >= created_at)
);

-- The leading FK columns also support ownership checks and cascading deletes.
CREATE INDEX sessions_user_created_idx ON public.sessions (user_id, created_at DESC, id);
CREATE INDEX session_questions_session_created_idx
    ON public.session_questions (session_id, created_at, id);
CREATE INDEX session_responses_session_created_idx
    ON public.session_responses (session_id, created_at, id);
CREATE INDEX session_responses_question_session_idx
    ON public.session_responses (question_id, session_id);

CREATE FUNCTION public.touch_practice_session_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_touch_updated_at
    BEFORE UPDATE ON public.sessions FOR EACH ROW
    EXECUTE FUNCTION public.touch_practice_session_updated_at();
CREATE TRIGGER session_questions_touch_updated_at
    BEFORE UPDATE ON public.session_questions FOR EACH ROW
    EXECUTE FUNCTION public.touch_practice_session_updated_at();
CREATE TRIGGER session_responses_touch_updated_at
    BEFORE UPDATE ON public.session_responses FOR EACH ROW
    EXECUTE FUNCTION public.touch_practice_session_updated_at();

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_own ON public.sessions
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));
CREATE POLICY session_questions_select_own ON public.session_questions
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sessions AS s
        WHERE s.id = session_questions.session_id AND s.user_id = (SELECT auth.uid())
    ));
CREATE POLICY session_responses_select_own ON public.session_responses
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sessions AS s
        WHERE s.id = session_responses.session_id AND s.user_id = (SELECT auth.uid())
    ));

-- Supabase default privileges may otherwise grant direct writes. No mutation
-- policies exist: authenticated clients get only SELECT plus the guarded RPC.
REVOKE ALL PRIVILEGES ON TABLE public.sessions, public.session_questions, public.session_responses
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.sessions, public.session_questions, public.session_responses
    TO authenticated;

CREATE FUNCTION public.manage_practice_session(
    p_action text,
    p_session_id uuid DEFAULT NULL,
    p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid;
    v_session public.sessions%ROWTYPE;
    v_allowed_fields text[];
    v_key text;
    v_value jsonb;
    v_question jsonb;
    v_question_id uuid;
    v_order_index integer;
    v_order_indexes integer[] := ARRAY[]::integer[];
    v_status text;
    v_started_at timestamptz;
    v_current_question_index integer;
    v_question_set_complete boolean;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    IF p_action IS NULL OR p_action NOT IN ('create', 'update', 'questions', 'response', 'complete')
       OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    -- All writers lock the same parent before touching any children. Ownership
    -- is explicit because this function intentionally executes as its owner.
    IF p_action = 'create' THEN
        IF p_session_id IS NOT NULL THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
        END IF;
    ELSE
        SELECT s.* INTO v_session
        FROM public.sessions AS s
        WHERE s.id = p_session_id AND s.user_id = v_user_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_not_found';
        END IF;
    END IF;

    v_allowed_fields := CASE p_action
        WHEN 'create' THEN ARRAY[
            'mode', 'job_role', 'subject', 'proficiency_level', 'difficulty',
            'interaction_mode', 'question_count', 'explanation_language', 'topic_focus'
        ]
        WHEN 'update' THEN ARRAY['status', 'current_question_index', 'topic_focus']
        WHEN 'questions' THEN ARRAY['questions']
        WHEN 'response' THEN ARRAY[
            'question_id', 'answer_text', 'interaction_mode', 'transcript_edited', 'audio_url'
        ]
        WHEN 'complete' THEN ARRAY[]::text[]
    END;
    IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(p_payload) AS fields(key)
        WHERE NOT (fields.key = ANY(v_allowed_fields))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    -- Validate JSON types before any casts or jsonb array/object operations.
    -- Optional strings accept JSON null; omitted fields receive documented defaults.
    FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_payload) LOOP
        IF v_key IN ('question_count', 'current_question_index') THEN
            IF jsonb_typeof(v_value) <> 'number'
               OR (v_value #>> '{}') !~ '^[0-9]+$' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
        ELSIF v_key = 'transcript_edited' THEN
            IF jsonb_typeof(v_value) <> 'boolean' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
        ELSIF v_key = 'questions' THEN
            IF jsonb_typeof(v_value) <> 'array' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
        ELSIF v_key IN ('job_role', 'subject', 'topic_focus', 'audio_url') THEN
            IF jsonb_typeof(v_value) NOT IN ('string', 'null') THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
        ELSIF jsonb_typeof(v_value) <> 'string' THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
        END IF;
    END LOOP;

    IF p_action = 'create' THEN
        IF NOT (p_payload ? 'mode') THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
        END IF;
        INSERT INTO public.sessions (
            user_id, mode, job_role, subject, proficiency_level, difficulty,
            interaction_mode, question_count, explanation_language, topic_focus
        ) VALUES (
            v_user_id, p_payload ->> 'mode', p_payload ->> 'job_role', p_payload ->> 'subject',
            COALESCE(p_payload ->> 'proficiency_level', 'intermediate'),
            COALESCE(p_payload ->> 'difficulty', 'medium'),
            COALESCE(p_payload ->> 'interaction_mode', 'text'),
            COALESCE((p_payload ->> 'question_count')::integer, 5),
            COALESCE(p_payload ->> 'explanation_language', 'english'), p_payload ->> 'topic_focus'
        ) RETURNING * INTO v_session;
    ELSE
        -- The only terminal-state operation is an idempotent, empty complete
        -- request for an already completed session; it performs no UPDATE.
        IF v_session.status IN ('completed', 'cancelled') THEN
            IF NOT (p_action = 'complete' AND v_session.status = 'completed') THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
            END IF;
        ELSIF p_action = 'update' THEN
            v_status := COALESCE(p_payload ->> 'status', v_session.status);
            v_started_at := v_session.started_at;
            v_current_question_index := COALESCE(
                (p_payload ->> 'current_question_index')::integer, v_session.current_question_index
            );
            IF v_status NOT IN ('created', 'in_progress', 'completed', 'cancelled')
               OR v_current_question_index < 0
               OR v_current_question_index >= v_session.question_count THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
            IF p_payload ? 'topic_focus' AND v_session.status <> 'created' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
            END IF;
            IF v_status <> v_session.status THEN
                IF v_session.status = 'created' AND v_status = 'in_progress' THEN
                    SELECT count(*) = v_session.question_count
                        AND min(q.order_index) = 0
                        AND max(q.order_index) = v_session.question_count - 1
                    INTO v_question_set_complete
                    FROM public.session_questions AS q WHERE q.session_id = v_session.id;
                    IF NOT COALESCE(v_question_set_complete, false) THEN
                        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_incomplete';
                    END IF;
                    v_started_at := clock_timestamp();
                ELSIF v_status <> 'cancelled' THEN
                    -- Includes backwards movement and completion via patch.
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
                END IF;
            END IF;
            UPDATE public.sessions SET
                status = v_status,
                current_question_index = v_current_question_index,
                topic_focus = CASE WHEN p_payload ? 'topic_focus'
                    THEN p_payload ->> 'topic_focus' ELSE topic_focus END,
                started_at = v_started_at
            WHERE id = v_session.id;
        ELSIF p_action = 'questions' THEN
            IF v_session.status <> 'created' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
            END IF;
            IF NOT (p_payload ? 'questions') THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
            IF jsonb_array_length(p_payload -> 'questions') <> v_session.question_count THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
            -- Validate the entire replacement before deleting the old set.
            FOR v_question IN SELECT value FROM jsonb_array_elements(p_payload -> 'questions') LOOP
                IF jsonb_typeof(v_question) <> 'object' THEN
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                END IF;
                IF EXISTS (
                    SELECT 1 FROM jsonb_object_keys(v_question) AS fields(key)
                    WHERE fields.key NOT IN ('text', 'context', 'hints', 'order_index')
                ) OR NOT (v_question ? 'text') OR NOT (v_question ? 'order_index') THEN
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                END IF;
                IF jsonb_typeof(v_question -> 'text') <> 'string'
                   OR char_length(v_question ->> 'text') > 5000
                   OR NOT public.practice_session_text_nonblank(v_question ->> 'text')
                   OR jsonb_typeof(v_question -> 'order_index') <> 'number'
                   OR (v_question ->> 'order_index') !~ '^[0-9]+$' THEN
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                END IF;
                IF v_question ? 'context' THEN
                    IF jsonb_typeof(v_question -> 'context') NOT IN ('string', 'null')
                       OR char_length(v_question ->> 'context') > 2000 THEN
                        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                    END IF;
                END IF;
                IF NOT public.practice_session_hints_valid(NULLIF(v_question -> 'hints', 'null'::jsonb)) THEN
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                END IF;
                v_order_index := (v_question ->> 'order_index')::integer;
                IF v_order_index < 0 OR v_order_index >= v_session.question_count
                   OR v_order_index = ANY(v_order_indexes) THEN
                    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
                END IF;
                v_order_indexes := array_append(v_order_indexes, v_order_index);
            END LOOP;

            DELETE FROM public.session_questions WHERE session_id = v_session.id;
            INSERT INTO public.session_questions (session_id, text, context, hints, order_index)
            SELECT v_session.id, q.value ->> 'text', q.value ->> 'context',
                NULLIF(q.value -> 'hints', 'null'::jsonb), (q.value ->> 'order_index')::integer
            FROM jsonb_array_elements(p_payload -> 'questions') AS q(value);
            UPDATE public.sessions SET updated_at = clock_timestamp() WHERE id = v_session.id;
        ELSIF p_action = 'response' THEN
            IF v_session.status <> 'in_progress' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
            END IF;
            IF NOT (p_payload ?& ARRAY['question_id', 'answer_text', 'interaction_mode']) THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
            v_question_id := (p_payload ->> 'question_id')::uuid;
            IF NOT EXISTS (
                SELECT 1 FROM public.session_questions AS q
                WHERE q.id = v_question_id AND q.session_id = v_session.id
            ) THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'question_not_found';
            END IF;
            IF p_payload ->> 'interaction_mode' <> v_session.interaction_mode THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
            END IF;
            INSERT INTO public.session_responses (
                session_id, question_id, answer_text, interaction_mode, transcript_edited, audio_url
            ) VALUES (
                v_session.id, v_question_id, p_payload ->> 'answer_text',
                p_payload ->> 'interaction_mode',
                COALESCE((p_payload ->> 'transcript_edited')::boolean, false), p_payload ->> 'audio_url'
            )
            ON CONFLICT (session_id, question_id) DO UPDATE SET
                answer_text = EXCLUDED.answer_text,
                interaction_mode = EXCLUDED.interaction_mode,
                transcript_edited = EXCLUDED.transcript_edited,
                audio_url = EXCLUDED.audio_url;
            UPDATE public.sessions SET updated_at = clock_timestamp() WHERE id = v_session.id;
        ELSIF p_action = 'complete' THEN
            IF v_session.status <> 'in_progress' THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
            END IF;
            SELECT count(*) = v_session.question_count
                AND min(q.order_index) = 0
                AND max(q.order_index) = v_session.question_count - 1
            INTO v_question_set_complete
            FROM public.session_questions AS q WHERE q.session_id = v_session.id;
            IF NOT COALESCE(v_question_set_complete, false) OR EXISTS (
                SELECT 1 FROM public.session_questions AS q
                WHERE q.session_id = v_session.id AND NOT EXISTS (
                    SELECT 1 FROM public.session_responses AS r
                    WHERE r.session_id = v_session.id AND r.question_id = q.id
                )
            ) THEN
                RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_incomplete';
            END IF;
            UPDATE public.sessions SET status = 'completed', completed_at = clock_timestamp()
            WHERE id = v_session.id;
        END IF;
    END IF;

    SELECT s.* INTO v_session FROM public.sessions AS s
    WHERE s.id = v_session.id AND s.user_id = v_user_id;
    RETURN to_jsonb(v_session) || jsonb_build_object(
        'questions', COALESCE((
            SELECT jsonb_agg(to_jsonb(q) ORDER BY q.order_index, q.id)
            FROM public.session_questions AS q WHERE q.session_id = v_session.id
        ), '[]'::jsonb),
        'responses', COALESCE((
            SELECT jsonb_agg(to_jsonb(r) ORDER BY q.order_index, r.id)
            FROM public.session_responses AS r
            JOIN public.session_questions AS q ON q.id = r.question_id AND q.session_id = r.session_id
            WHERE r.session_id = v_session.id
        ), '[]'::jsonb)
    );
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range
        OR check_violation OR not_null_violation OR foreign_key_violation
        OR unique_violation OR string_data_right_truncation OR invalid_parameter_value THEN
        -- The exception block rolls back this call's changes, including any
        -- partial replacement. Business P0001 exceptions are left untouched.
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
END;
$$;

-- Only the RPC has a client-callable mutation surface. Helpers are internal.
REVOKE ALL ON FUNCTION public.practice_session_text_nonblank(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.practice_session_hints_valid(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_practice_session_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_practice_session(text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_practice_session(text, uuid, jsonb) TO authenticated;

COMMIT;
