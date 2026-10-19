from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums
class SessionType(str, Enum):
    INTERVIEW = "interview"
    VIVA = "viva"
    FREE_CONVERSATION = "free_conversation"
    GRAMMAR = "grammar"


class FeedbackCategory(str, Enum):
    GRAMMAR = "grammar"
    FLUENCY = "fluency"
    VOCABULARY = "vocabulary"
    PRONUNCIATION = "pronunciation"
    CONTENT = "content"


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Practice Session Schemas
class PracticeSessionCreate(BaseModel):
    session_type: SessionType
    question: Optional[str] = None
    user_response: str
    audio_url: Optional[str] = None


class FeedbackItem(BaseModel):
    category: FeedbackCategory
    score: float = Field(ge=0, le=10)
    comments: str
    suggestions: List[str] = []


class PracticeSessionResponse(BaseModel):
    id: str
    user_id: str
    session_type: SessionType
    question: Optional[str] = None
    user_response: str
    overall_score: Optional[float] = None
    feedback: Optional[List[FeedbackItem]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# AI Feedback Request/Response
class FeedbackRequest(BaseModel):
    text: str
    session_type: SessionType
    question: Optional[str] = None


class FeedbackResponse(BaseModel):
    overall_score: float
    feedback_items: List[FeedbackItem]
    summary: str


# Voice Transcription
class TranscriptionRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    language: str = "en-IN"  # Default to Indian English


class TranscriptionResponse(BaseModel):
    text: str
    confidence: Optional[float] = None
    language_detected: Optional[str] = None


# Progress Tracking
class UserProgress(BaseModel):
    total_sessions: int
    average_score: float
    sessions_by_type: dict
    improvement_trend: List[float]
    strengths: List[str]
    areas_for_improvement: List[str]
