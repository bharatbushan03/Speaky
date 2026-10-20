"""Provider boundaries for future AI features; session persistence never calls AI."""

from typing import Protocol

from app.core.errors import APIError
from app.models.schemas import (
    FeedbackResponse,
    QuestionBatchCreate,
    SessionConfigResponse,
    SessionConfigWithDetails,
    SessionType,
    TranscriptionResponse,
)


class QuestionGenerator(Protocol):
    async def generate_questions(
        self, session: SessionConfigResponse
    ) -> QuestionBatchCreate:
        ...


class SessionEvaluator(Protocol):
    async def evaluate_session(
        self, session: SessionConfigWithDetails
    ) -> FeedbackResponse:
        ...


class TurnFeedbackAnalyzer(Protocol):
    async def analyze_turn(
        self, text: str, session_type: SessionType, question: str | None = None
    ) -> FeedbackResponse:
        ...


class TranscriptionProvider(Protocol):
    async def transcribe(self, audio_data: str, language: str) -> TranscriptionResponse:
        ...


class UnconfiguredQuestionGenerator:
    async def generate_questions(
        self, session: SessionConfigResponse
    ) -> QuestionBatchCreate:
        raise APIError(
            status_code=501,
            code="question_generation_not_configured",
            detail="AI question generation is not configured",
        )


class UnconfiguredSessionEvaluator:
    async def evaluate_session(
        self, session: SessionConfigWithDetails
    ) -> FeedbackResponse:
        raise APIError(
            status_code=501,
            code="session_evaluation_not_configured",
            detail="AI session evaluation is not configured",
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
