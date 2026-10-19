from fastapi import APIRouter, HTTPException, status
from app.models.schemas import FeedbackRequest, FeedbackResponse, TranscriptionRequest, TranscriptionResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_text(request: FeedbackRequest):
    """Analyze text and provide AI feedback."""
    try:
        feedback = await ai_service.generate_feedback(
            text=request.text,
            session_type=request.session_type,
            question=request.question
        )
        return feedback
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate feedback: {str(e)}"
        )


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """Transcribe audio to text."""
    try:
        transcription = await ai_service.transcribe_audio(
            audio_data=request.audio_data,
            language=request.language
        )
        return transcription
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transcribe audio: {str(e)}"
        )
