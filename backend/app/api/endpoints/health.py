from fastapi import APIRouter, status

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
    return {
        "status": "ready",
        "database": "connected",
        "ai_service": "configured"
    }
