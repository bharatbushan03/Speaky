from fastapi import APIRouter
from app.models.schemas import FeedbackRequest, FeedbackResponse, TranscriptionRequest, TranscriptionResponse, TTSRequest, TTSResponse
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()


@router.post("/tts", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest):
    """Synthesize speech from text using the configured TTS provider."""
    return await ai_service.synthesize_speech(text=request.text, language=request.language)


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
