"""Compatibility facade for the not-yet-configured AI boundaries.

Session persistence deliberately does not call this service. Keeping the old
method names prevents unrelated legacy routes from breaking while making their
unimplemented state explicit instead of returning fabricated feedback or text.
"""

from typing import Optional

from app.models.schemas import (
    FeedbackResponse,
    SessionType,
    TranscriptionResponse,
)
from app.services.ai_interfaces import (
    TurnFeedbackAnalyzer,
    TranscriptionProvider,
    UnconfiguredTranscriptionProvider,
    UnconfiguredTurnFeedbackAnalyzer,
)


class AIService:
    def __init__(
        self,
        *,
        analyzer: Optional[TurnFeedbackAnalyzer] = None,
        transcriber: Optional[TranscriptionProvider] = None,
    ) -> None:
        self.analyzer = analyzer or UnconfiguredTurnFeedbackAnalyzer()
        self.transcriber = transcriber or UnconfiguredTranscriptionProvider()

    async def generate_feedback(
        self,
        text: str,
        session_type: SessionType,
        question: Optional[str] = None,
    ) -> FeedbackResponse:
        return await self.analyzer.analyze_turn(text, session_type, question)

    async def transcribe_audio(
        self, audio_data: str, language: str = "en-IN"
    ) -> TranscriptionResponse:
        return await self.transcriber.transcribe(audio_data, language)
