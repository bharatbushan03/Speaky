"""Provider boundaries for AI features.

Providers return one validated question at a time. Persistence is still owned
by the session service, so provider credentials and private evaluation data do
not cross into the browser.
"""

from typing import Protocol

from app.core.errors import APIError
from app.models.schemas import (
    EvaluationDraft,
    FeedbackResponse,
    GeneratedQuestion,
    QuestionBatchCreate,
    SessionConfigResponse,
    SessionConfigWithDetails,
    SessionType,
    TranscriptionResponse,
)


class QuestionGenerator(Protocol):
    async def generate_question(
        self, session: SessionConfigWithDetails
    ) -> GeneratedQuestion:
        ...


class SessionEvaluator(Protocol):
    async def evaluate_session(
        self, session: SessionConfigWithDetails
    ) -> EvaluationDraft:
        ...


class TurnFeedbackAnalyzer(Protocol):
    async def analyze_turn(
        self, text: str, session_type: SessionType, question: str | None = None
    ) -> FeedbackResponse:
        ...


class TranscriptionProvider(Protocol):
    async def transcribe(self, audio_data: str, language: str) -> TranscriptionResponse:
        ...


class TTSProvider(Protocol):
    async def synthesize(self, text: str, language: str = "en-US") -> bytes:
        """Return synthesized audio bytes."""
        ...


class UnconfiguredQuestionGenerator:
    def __init__(self, *, code: str = "question_generation_not_configured", detail: str = "AI question generation is not configured") -> None:
        self.code = code
        self.detail = detail

    async def generate_question(
        self, session: SessionConfigWithDetails
    ) -> GeneratedQuestion:
        raise APIError(status_code=501, code=self.code, detail=self.detail)

    # Kept as a compatibility boundary for callers from the previous static
    # generation stage. New code must use generate_question().
    async def generate_questions(
        self, session: SessionConfigResponse
    ) -> QuestionBatchCreate:
        raise APIError(status_code=501, code=self.code, detail=self.detail)


class UnconfiguredSessionEvaluator:
    def __init__(self, *, code: str = "session_evaluation_not_configured", detail: str = "AI session evaluation is not configured") -> None:
        self.code = code
        self.detail = detail

    async def evaluate_session(
        self, session: SessionConfigWithDetails
    ) -> EvaluationDraft:
        raise APIError(
            status_code=501,
            code=self.code,
            detail=self.detail,
        )


class UnconfiguredTurnFeedbackAnalyzer:
    async def analyze_turn(
        self, text: str, session_type: SessionType, question: str | None = None
    ) -> FeedbackResponse:
        raise APIError(
            status_code=501,
            code="turn_feedback_not_configured",
            detail="AI feedback is not configured",
        )


class UnconfiguredTranscriptionProvider:
    async def transcribe(self, audio_data: str, language: str) -> TranscriptionResponse:
        raise APIError(
            status_code=501,
            code="transcription_not_configured",
            detail="Audio transcription is not configured",
        )


class UnconfiguredTTSProvider:
    """TTS provider when no API credentials are configured."""

    async def synthesize(self, text: str, language: str = "en-US") -> bytes:
        raise APIError(
            status_code=501,
            code="tts_not_configured",
            detail="Text-to-speech is not configured",
        )
