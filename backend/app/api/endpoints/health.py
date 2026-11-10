import httpx
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.config import settings

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "speakready-ai-api",
        "version": settings.APP_VERSION,
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Check configuration and reachability without exposing dependency errors."""
    database_configured = bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY)
    database_reachable = False
    if database_configured:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/settings",
                    headers={"apikey": settings.SUPABASE_ANON_KEY},
                )
                database_reachable = response.status_code < 500
        except httpx.HTTPError:
            database_reachable = False
    provider = settings.AI_PROVIDER.strip().lower()
    ai_configured = (
        provider == "mock"
        or (provider == "groq" and bool(settings.GROQ_API_KEY))
        or (provider == "openai" and bool(settings.OPENAI_API_KEY))
        or (
            provider in {"azure_openai", "azure-openai"}
            and bool(
                settings.AZURE_OPENAI_ENDPOINT
                and settings.AZURE_OPENAI_API_KEY
                and settings.AZURE_OPENAI_DEPLOYMENT
            )
        )
    )
    ready = database_configured and database_reachable and ai_configured
    payload = {
        "status": "ready" if ready else "degraded",
        "database": "reachable" if database_reachable else "unavailable",
        "ai_service": "configured" if ai_configured else "not_configured",
    }
    return JSONResponse(status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)


def _configured_llm() -> tuple[str, str, bool]:
    provider = settings.AI_PROVIDER.strip().lower()
    if provider == "mock":
        return provider, "mock", True
    if provider == "groq":
        return provider, settings.GROQ_MODEL, bool(settings.GROQ_API_KEY)
    if provider == "openai":
        return provider, settings.OPENAI_MODEL, bool(settings.OPENAI_API_KEY)
    if provider in {"azure_openai", "azure-openai"}:
        ready = bool(settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_DEPLOYMENT)
        return "azure_openai", settings.AZURE_OPENAI_DEPLOYMENT, ready
    if provider == "giani":
        return "giani", "", False
    return provider, "", False


@router.get("/providers", status_code=status.HTTP_200_OK)
async def provider_diagnostics():
    """Name the models actually configured. This does not call Gnani or claim a live result."""
    llm_provider, llm_model, llm_ready = _configured_llm()
    tts = settings.TTS_PROVIDER.strip().lower()
    stt = settings.STT_PROVIDER.strip().lower()
    gnani_key = bool(settings.GIANI_API_KEY)
    tts_name = "gnani" if tts in {"gnani", "giani"} else tts
    stt_name = "gnani" if stt in {"gnani", "giani", "prisma"} else stt
    return {
        "llm": {
            "provider": llm_provider,
            "model": llm_model,
            "configured": llm_ready,
            "role": "interview questions and answer evaluation",
        },
        "tts": {
            "provider": tts_name,
            "model": settings.GNANI_TTS_MODEL if tts_name == "gnani" else settings.OPENAI_TTS_MODEL if tts_name == "openai" else "",
            "voice": settings.GNANI_TTS_VOICE if tts_name == "gnani" else settings.OPENAI_TTS_VOICE if tts_name == "openai" else "",
            "configured": gnani_key if tts_name == "gnani" else bool(settings.OPENAI_API_KEY) if tts_name == "openai" else tts_name == "mock",
            "endpoint": "https://api.vachana.ai/api/v1/tts/inference" if tts_name == "gnani" else "",
        },
        "stt": {
            "provider": stt_name,
            "model": settings.GNANI_STT_MODEL if stt_name == "gnani" else "whisper-1" if stt_name == "openai" else "",
            "configured": gnani_key if stt_name == "gnani" else bool(settings.OPENAI_API_KEY) if stt_name == "openai" else False,
            "endpoint": "https://api.vachana.ai/stt/v3" if stt_name == "gnani" else "",
        },
        "evon": {
            "available": False,
            "reason": "Gnani has not published a public Evon chat endpoint. The hosted API is a closed beta. Questions and evaluation use the llm provider above.",
        },
    }
