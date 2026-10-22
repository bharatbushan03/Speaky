from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.core.security import AuthenticatedUser, get_current_user
from app.models.schemas import FeedbackRequest, FeedbackResponse, TranscriptionRequest, TranscriptionResponse, TTSRequest
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/tts")
async def synthesize_speech(request: TTSRequest, _: AuthenticatedUser = Depends(get_current_user)):
    """Synthesize speech from text using the configured TTS provider."""
    audio = await ai_service.synthesize_speech(text=request.text, language=request.language)
    return StreamingResponse(iter([audio]), media_type="audio/mpeg")


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_text(request: FeedbackRequest, _: AuthenticatedUser = Depends(get_current_user)):
    """Analyze text and provide AI feedback."""
    return await ai_service.generate_feedback(
        text=request.text,
        session_type=request.session_type,
        question=request.question,
    )


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest, _: AuthenticatedUser = Depends(get_current_user)):
    """Transcribe audio to text."""
    return await ai_service.transcribe_audio(
        audio_data=request.audio_data,
        language=request.language,
    )
