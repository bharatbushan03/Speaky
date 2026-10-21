-- Migration: persisted answer evaluations and session reports
-- Requires 001_initial_schema.sql, 002_session_management.sql, and
-- 003_ai_question_generation.sql. Evaluation writes are protected by an
-- authenticated, ownership-checked RPC just like answer writes.
BEGIN;

CREATE TABLE public.session_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
    overall_score numeric CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10)),
    dimensions jsonb NOT NULL CHECK (jsonb_typeof(dimensions) = 'object'),
    summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 4000),
    explanations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(explanations) = 'array'),
    strengths jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(strengths) = 'array'),
    improvements jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(improvements) = 'array'),
    retry_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(retry_recommendations) = 'array'),
    explanation_language text NOT NULL CHECK (
        explanation_language IN ('english', 'hindi', 'tamil', 'telugu', 'bengali', 'kannada')
    ),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT session_evaluations_timestamps_check CHECK (updated_at >= created_at)
);

CREATE TABLE public.response_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id uuid NOT NULL REFERENCES public.session_evaluations(id) ON DELETE CASCADE,
    response_id uuid NOT NULL REFERENCES public.session_responses(id) ON DELETE CASCADE,
    question_id uuid NOT NULL,
    corrected_answer text NOT NULL CHECK (
        char_length(corrected_answer) BETWEEN 1 AND 20000
        AND public.practice_session_text_nonblank(corrected_answer)
    ),
    corrections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(corrections) = 'array'),
    explanations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(explanations) = 'array'),
    strengths jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(strengths) = 'array'),
    improvements jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(improvements) = 'array'),
    retry_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(retry_recommendations) = 'array'),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT response_evaluations_response_key UNIQUE (evaluation_id, response_id),
    CONSTRAINT response_evaluations_timestamps_check CHECK (updated_at >= created_at)
);

-- The RPC performs the authoritative same-session question/response check;
-- response_evaluations stores the validated question_id for report reads.

CREATE INDEX response_evaluations_response_idx ON public.response_evaluations (response_id);
CREATE INDEX response_evaluations_evaluation_idx ON public.response_evaluations (evaluation_id, created_at, id);

CREATE TRIGGER session_evaluations_touch_updated_at
    BEFORE UPDATE ON public.session_evaluations FOR EACH ROW
    EXECUTE FUNCTION public.touch_practice_session_updated_at();
CREATE TRIGGER response_evaluations_touch_updated_at
    BEFORE UPDATE ON public.response_evaluations FOR EACH ROW
    EXECUTE FUNCTION public.touch_practice_session_updated_at();

ALTER TABLE public.session_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_evaluations_select_own ON public.session_evaluations
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sessions AS s
        WHERE s.id = session_evaluations.session_id AND s.user_id = (SELECT auth.uid())
    ));
CREATE POLICY response_evaluations_select_own ON public.response_evaluations
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.session_evaluations AS e
        JOIN public.sessions AS s ON s.id = e.session_id
        WHERE e.id = response_evaluations.evaluation_id AND s.user_id = (SELECT auth.uid())
    ));

REVOKE ALL PRIVILEGES ON TABLE public.session_evaluations, public.response_evaluations
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.session_evaluations, public.response_evaluations TO authenticated;

CREATE FUNCTION public.persist_session_evaluation(
    p_session_id uuid,
    p_evaluation jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid;
    v_session public.sessions%ROWTYPE;
    v_evaluation public.session_evaluations%ROWTYPE;
    v_answer jsonb;
    v_response_id uuid;
    v_question_id uuid;
    v_response_count integer;
    v_answer_count integer;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR p_session_id IS NULL
       OR p_evaluation IS NULL OR jsonb_typeof(p_evaluation) <> 'object' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    SELECT s.* INTO v_session
    FROM public.sessions AS s
    WHERE s.id = p_session_id AND s.user_id = v_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'session_not_found';
    END IF;
    IF v_session.status <> 'completed' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_transition';
    END IF;
    IF jsonb_typeof(p_evaluation -> 'answer_evaluations') <> 'array'
       OR jsonb_typeof(p_evaluation -> 'dimensions') <> 'object'
       OR jsonb_typeof(p_evaluation -> 'summary') <> 'string'
       OR jsonb_typeof(p_evaluation -> 'explanation_language') <> 'string' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    SELECT count(*) INTO v_response_count
    FROM public.session_responses AS r WHERE r.session_id = v_session.id;
    SELECT jsonb_array_length(p_evaluation -> 'answer_evaluations') INTO v_answer_count;
    IF v_response_count <> v_answer_count THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    INSERT INTO public.session_evaluations (
        session_id, overall_score, dimensions, summary, explanations, strengths,
        improvements, retry_recommendations, explanation_language
    ) VALUES (
        v_session.id,
        NULLIF(p_evaluation ->> 'overall_score', '')::numeric,
        p_evaluation -> 'dimensions',
        p_evaluation ->> 'summary',
        COALESCE(p_evaluation -> 'explanations', '[]'::jsonb),
        COALESCE(p_evaluation -> 'strengths', '[]'::jsonb),
        COALESCE(p_evaluation -> 'improvements', '[]'::jsonb),
        COALESCE(p_evaluation -> 'retry_recommendations', '[]'::jsonb),
        p_evaluation ->> 'explanation_language'
    )
    ON CONFLICT (session_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        dimensions = EXCLUDED.dimensions,
        summary = EXCLUDED.summary,
        explanations = EXCLUDED.explanations,
        strengths = EXCLUDED.strengths,
        improvements = EXCLUDED.improvements,
        retry_recommendations = EXCLUDED.retry_recommendations,
        explanation_language = EXCLUDED.explanation_language
    RETURNING * INTO v_evaluation;

    DELETE FROM public.response_evaluations WHERE evaluation_id = v_evaluation.id;
    FOR v_answer IN SELECT value FROM jsonb_array_elements(p_evaluation -> 'answer_evaluations') LOOP
        IF jsonb_typeof(v_answer) <> 'object'
           OR jsonb_typeof(v_answer -> 'response_id') <> 'string'
           OR jsonb_typeof(v_answer -> 'question_id') <> 'string'
           OR jsonb_typeof(v_answer -> 'corrected_answer') <> 'string' THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
        END IF;
        v_response_id := (v_answer ->> 'response_id')::uuid;
        v_question_id := (v_answer ->> 'question_id')::uuid;
        IF NOT EXISTS (
            SELECT 1 FROM public.session_responses AS r
            WHERE r.id = v_response_id AND r.session_id = v_session.id
              AND r.question_id = v_question_id
        ) THEN
            RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
        END IF;
        INSERT INTO public.response_evaluations (
            evaluation_id, response_id, question_id, corrected_answer, corrections,
            explanations, strengths, improvements, retry_recommendations
        ) VALUES (
            v_evaluation.id, v_response_id, v_question_id,
            v_answer ->> 'corrected_answer',
            COALESCE(v_answer -> 'corrections', '[]'::jsonb),
            COALESCE(v_answer -> 'explanations', '[]'::jsonb),
            COALESCE(v_answer -> 'strengths', '[]'::jsonb),
            COALESCE(v_answer -> 'improvements', '[]'::jsonb),
            COALESCE(v_answer -> 'retry_recommendations', '[]'::jsonb)
        );
    END LOOP;

    RETURN to_jsonb(v_evaluation) || jsonb_build_object(
        'answer_evaluations', COALESCE((
            SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at, a.id)
            FROM public.response_evaluations AS a
            WHERE a.evaluation_id = v_evaluation.id
        ), '[]'::jsonb)
    );
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range
        OR check_violation OR not_null_violation OR foreign_key_violation
        OR unique_violation OR string_data_right_truncation OR invalid_parameter_value THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
END;
$$;

REVOKE ALL ON FUNCTION public.persist_session_evaluation(uuid, jsonb)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_session_evaluation(uuid, jsonb) TO authenticated;

COMMIT;
