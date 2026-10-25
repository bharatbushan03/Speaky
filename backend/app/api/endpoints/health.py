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
