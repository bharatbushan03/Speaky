from fastapi import APIRouter
from app.models.schemas import FeedbackRequest, FeedbackResponse, TranscriptionRequest, TranscriptionResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_text(request: FeedbackRequest):
    """Analyze text and provide AI feedback."""
    return await ai_service.generate_feedback(
        text=request.text,
        session_type=request.session_type,
        question=request.question,
    )


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """Transcribe audio to text."""
    return await ai_service.transcribe_audio(
        audio_data=request.audio_data,
        language=request.language,
    )
