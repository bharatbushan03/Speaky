from fastapi import APIRouter
from app.api.endpoints import health, feedback, sessions, users, progress

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Practice Sessions"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["AI Feedback"])
api_router.include_router(progress.router, prefix="/progress", tags=["Progress"])
