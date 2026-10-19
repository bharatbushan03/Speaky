from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.api.routes import api_router
from app.core.config import settings
from app.db.database import init_db

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting SpeakReady AI Backend...")
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Shutting down SpeakReady AI Backend...")


app = FastAPI(
    title="SpeakReady AI API",
    description="AI-powered English communication coaching platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "Welcome to SpeakReady AI API",
        "version": "0.1.0",
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "speakready-ai-backend"}
