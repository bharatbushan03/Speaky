-- Speech metadata for a reviewed transcript. Raw audio is not stored.
-- Apply once, after 005. Safe to skip on a database that already has these columns
-- only if this file has been applied; do not edit a migration that already ran.

BEGIN;

ALTER TABLE public.session_responses
    ADD COLUMN IF NOT EXISTS transcription_provider text,
    ADD COLUMN IF NOT EXISTS transcription_model text,
    ADD COLUMN IF NOT EXISTS detected_language text,
    ADD COLUMN IF NOT EXISTS audio_duration_ms integer;

ALTER TABLE public.session_responses
    DROP CONSTRAINT IF EXISTS session_responses_speech_meta_check;

ALTER TABLE public.session_responses
    ADD CONSTRAINT session_responses_speech_meta_check CHECK (
        (transcription_provider IS NULL OR transcription_provider IN ('gnani', 'openai', 'browser', 'typed'))
        AND (transcription_model IS NULL OR char_length(transcription_model) <= 40)
        AND (detected_language IS NULL OR char_length(detected_language) <= 20)
        AND (audio_duration_ms IS NULL OR (audio_duration_ms >= 0 AND audio_duration_ms <= 30000))
    );

CREATE INDEX IF NOT EXISTS session_responses_transcription_provider_idx
    ON public.session_responses (transcription_provider)
    WHERE transcription_provider IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_response_speech_meta(
    p_session_id uuid,
    p_question_id uuid,
    p_provider text,
    p_model text,
    p_language text,
    p_duration_ms integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL
       OR p_provider IS NULL
       OR p_provider NOT IN ('gnani', 'openai', 'browser', 'typed')
       OR (p_model IS NOT NULL AND char_length(p_model) > 40)
       OR (p_language IS NOT NULL AND char_length(p_language) > 20)
       OR (p_duration_ms IS NOT NULL AND (p_duration_ms < 0 OR p_duration_ms > 30000)) THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input';
    END IF;

    UPDATE public.session_responses AS r
    SET transcription_provider = p_provider,
        transcription_model = p_model,
        detected_language = p_language,
        audio_duration_ms = p_duration_ms,
        updated_at = clock_timestamp()
    FROM public.sessions AS s
    WHERE r.session_id = p_session_id
      AND r.question_id = p_question_id
      AND s.id = r.session_id
      AND s.user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_found';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_response_speech_meta(uuid, uuid, text, text, text, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_response_speech_meta(uuid, uuid, text, text, text, integer)
    TO authenticated;

COMMIT;
