from fastapi import APIRouter, status

from app.core.config import settings

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "speakready-ai-api",
        "version": "0.1.0"
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness check endpoint."""
    database_configured = bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY)
    return {
        "status": "ready" if database_configured else "degraded",
        "database": "configured" if database_configured else "not_configured",
        "ai_service": "not_configured",
    }
