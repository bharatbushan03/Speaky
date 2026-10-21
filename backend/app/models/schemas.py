from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    StringConstraints,
    TypeAdapter,
    field_validator,
    model_validator,
)
from typing import Annotated, Any, Dict, Optional, List
from datetime import datetime
from enum import Enum
from uuid import UUID


# =============================================================================
# Enums
# =============================================================================

class SessionType(str, Enum):
    INTERVIEW = "interview"
    VIVA = "viva"
    FREE_CONVERSATION = "free_conversation"
    GRAMMAR = "grammar"


class PracticeMode(str, Enum):
    HR = "hr"
    TECHNICAL = "technical"
    VIVA = "viva"


class ProficiencyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InteractionMode(str, Enum):
    TEXT = "text"
    VOICE = "voice"


class ExplanationLanguage(str, Enum):
    ENGLISH = "english"
    HINDI = "hindi"
    TAMIL = "tamil"
    TELUGU = "telugu"
    BENGALI = "bengali"
    KANNADA = "kannada"


class SessionStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FeedbackCategory(str, Enum):
    GRAMMAR = "grammar"
    FLUENCY = "fluency"
    VOCABULARY = "vocabulary"
    PRONUNCIATION = "pronunciation"
    CONTENT = "content"


class EvaluationDimension(str, Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    CLARITY = "clarity"
    COHERENCE = "coherence"
    RELEVANCE = "relevance"
    INTERVIEW_TECHNIQUE = "interview_technique"
    TECHNICAL_CORRECTNESS = "technical_correctness"
    SPOKEN_FLUENCY = "spoken_fluency"


class CorrectionCategory(str, Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    CLARITY = "clarity"
    COHERENCE = "coherence"
    RELEVANCE = "relevance"
    INTERVIEW_TECHNIQUE = "interview_technique"
    TECHNICAL_CORRECTNESS = "technical_correctness"


# =============================================================================
# User Schemas
# =============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# =============================================================================
# Session Configuration Schemas
# =============================================================================

class SessionInput(BaseModel):
    """Strict, whitespace-normalized inputs for the session lifecycle API."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SessionConfigCreate(SessionInput):
    """Payload to create a new practice session (setup flow)."""
    mode: PracticeMode
    job_role: Optional[str] = Field(None, max_length=255)
    subject: Optional[str] = Field(None, max_length=255)
    proficiency_level: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    interaction_mode: InteractionMode = InteractionMode.TEXT
    question_count: int = Field(default=5, ge=3, le=10)
    explanation_language: ExplanationLanguage = ExplanationLanguage.ENGLISH
    topic_focus: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_mode_specific_fields(self):
        if self.mode in (PracticeMode.HR, PracticeMode.TECHNICAL):
            if not self.job_role or not self.job_role.strip():
                raise ValueError("job_role is required for HR and technical interview sessions")
        if self.mode == PracticeMode.VIVA:
            if not self.subject or not self.subject.strip():
                raise ValueError("subject is required for academic viva sessions")
        return self


class SessionConfigUpdate(SessionInput):
    """Partial update for an existing session (only while not completed)."""
    status: Optional[SessionStatus] = None
    current_question_index: Optional[int] = Field(None, ge=0)
    topic_focus: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_patch(self):
        if not self.model_fields_set:
            raise ValueError("At least one session field must be provided")
        for field in ("status", "current_question_index"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null")
        return self


class SessionConfigResponse(BaseModel):
    id: str
    user_id: str
    mode: PracticeMode
    job_role: Optional[str] = None
    subject: Optional[str] = None
    proficiency_level: ProficiencyLevel
    difficulty: DifficultyLevel
    interaction_mode: InteractionMode
    question_count: int
    explanation_language: ExplanationLanguage
    topic_focus: Optional[str] = None
    status: SessionStatus
    current_question_index: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionConfigWithDetails(SessionConfigResponse):
    """Session plus its questions and responses."""
    questions: List["QuestionResponse"] = Field(default_factory=list)
    responses: List["ResponseItem"] = Field(default_factory=list)


# =============================================================================
# Question Schemas
# =============================================================================

QuestionHint = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]


class QuestionCreate(SessionInput):
    text: str = Field(..., min_length=1, max_length=5000)
    context: Optional[str] = Field(None, max_length=2000)
    hints: Optional[List[QuestionHint]] = Field(None, max_length=10)
    order_index: int = Field(..., ge=0)


EvaluationCriterion = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)
]


class GeneratedQuestion(SessionInput):
    """One provider-produced question.

    ``evaluation_criteria`` is deliberately not part of QuestionResponse. It
    is persisted for the future evaluation feature, but is never returned to
    the practice-room client as user-visible question content.
    """

    text: str = Field(..., min_length=1, max_length=5000)
    context: Optional[str] = Field(None, max_length=2000)
    hints: Optional[List[QuestionHint]] = Field(None, max_length=10)
    evaluation_criteria: List[EvaluationCriterion] = Field(
        default_factory=list, max_length=10
    )


class QuestionResponse(BaseModel):
    id: str
    session_id: str
    text: str
    context: Optional[str] = None
    hints: Optional[List[str]] = None
    order_index: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionBatchCreate(SessionInput):
    """Client-supplied static questions; SQL checks the configured session count."""
    questions: List[QuestionCreate] = Field(..., min_length=3, max_length=10)

    @model_validator(mode="after")
    def validate_question_order(self):
        expected_order = list(range(len(self.questions)))
        if [question.order_index for question in self.questions] != expected_order:
            raise ValueError("Questions must be in sequential order starting at order_index 0")
        return self


# =============================================================================
# Response (Answer) Schemas
# =============================================================================

class ResponseSubmit(SessionInput):
    """Submit or update an answer for a question."""
    question_id: UUID
    answer_text: str = Field(..., min_length=1, max_length=20000)
    interaction_mode: InteractionMode
    transcript_edited: bool = False
    audio_url: Optional[str] = Field(None, max_length=1000)

    @field_validator("question_id", mode="before")
    @classmethod
    def trim_question_id(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("answer_text")
    @classmethod
    def answer_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("answer_text must not be blank")
        return v.strip()

    @field_validator("audio_url")
    @classmethod
    def validate_audio_url(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        if not value.lower().startswith("https://") or any(char.isspace() for char in value):
            raise ValueError("audio_url must be an absolute HTTPS URL without whitespace")
        # Parse locally only: validate the URL without downloading audio.
        url = TypeAdapter(HttpUrl).validate_python(value)
        return str(url)

    @model_validator(mode="after")
    def validate_interaction_metadata(self):
        if self.interaction_mode == InteractionMode.TEXT:
            if self.transcript_edited:
                raise ValueError("transcript_edited is only valid for voice answers")
            if self.audio_url is not None:
                raise ValueError("audio_url is only valid for voice answers")
        return self


class ResponseItem(BaseModel):
    id: str
    session_id: str
    question_id: str
    answer_text: str
    interaction_mode: InteractionMode
    transcript_edited: bool
    audio_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Answer evaluation schemas
# =============================================================================

class EvaluationWeights(BaseModel):
    """Configurable weights used only for dimensions with a reliable score."""

    model_config = ConfigDict(extra="forbid")

    grammar: float = Field(default=0.15, ge=0, le=1)
    vocabulary: float = Field(default=0.10, ge=0, le=1)
    clarity: float = Field(default=0.15, ge=0, le=1)
    coherence: float = Field(default=0.15, ge=0, le=1)
    relevance: float = Field(default=0.15, ge=0, le=1)
    interview_technique: float = Field(default=0.15, ge=0, le=1)
    technical_correctness: float = Field(default=0.15, ge=0, le=1)
    spoken_fluency: float = Field(default=0.10, ge=0, le=1)

    @model_validator(mode="after")
    def at_least_one_weight(self):
        if sum(self.model_dump().values()) <= 0:
            raise ValueError("At least one evaluation weight must be greater than zero")
        return self


class DimensionScore(BaseModel):
    """A score is nullable by design: unavailable is not the same as zero."""

    model_config = ConfigDict(extra="forbid")

    score: Optional[float] = Field(default=None, ge=0, le=10)
    available: bool = True
    explanation: str = Field(..., min_length=1, max_length=2000)
    unavailable_reason: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_availability(self):
        if self.available and self.score is None:
            raise ValueError("Available dimensions must include a score")
        if not self.available:
            if self.score is not None:
                raise ValueError("Unavailable dimensions must not include a score")
            if not self.unavailable_reason:
                raise ValueError("Unavailable dimensions need a reason")
        return self


class AnswerCorrection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: CorrectionCategory
    original: str = Field(..., min_length=1, max_length=2000)
    corrected: str = Field(..., min_length=1, max_length=2000)
    explanation: str = Field(..., min_length=1, max_length=2000)


class AnswerEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    response_id: str
    question_id: str
    corrected_answer: str = Field(..., min_length=1, max_length=20000)
    corrections: List[AnswerCorrection] = Field(default_factory=list, max_length=50)
    explanations: List[str] = Field(default_factory=list, max_length=20)
    strengths: List[str] = Field(default_factory=list, max_length=20)
    improvements: List[str] = Field(default_factory=list, max_length=20)
    retry_recommendations: List[str] = Field(default_factory=list, max_length=20)


class PersistedAnswerEvaluation(AnswerEvaluation):
    id: str
    evaluation_id: str
    created_at: datetime
    updated_at: datetime


class EvaluationDraft(BaseModel):
    """Provider output before the trusted session/response IDs are attached."""

    model_config = ConfigDict(extra="forbid")

    overall_score: Optional[float] = Field(default=None, ge=0, le=10)
    dimensions: Dict[EvaluationDimension, DimensionScore] = Field(default_factory=dict)
    summary: str = Field(..., min_length=1, max_length=4000)
    explanations: List[str] = Field(default_factory=list, max_length=20)
    strengths: List[str] = Field(default_factory=list, max_length=20)
    improvements: List[str] = Field(default_factory=list, max_length=20)
    retry_recommendations: List[str] = Field(default_factory=list, max_length=20)
    answer_evaluations: List[AnswerEvaluation] = Field(default_factory=list, max_length=10)


class SessionEvaluation(EvaluationDraft):
    """Persisted report returned to the authenticated practice-room client."""

    id: str
    session_id: str
    explanation_language: ExplanationLanguage
    created_at: datetime
    updated_at: datetime
    answer_evaluations: List[PersistedAnswerEvaluation] = Field(default_factory=list, max_length=10)


# =============================================================================
# Legacy single-turn practice session schemas (kept for /feedback compatibility)
# =============================================================================

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


# =============================================================================
# AI Feedback Request/Response
# =============================================================================

class FeedbackRequest(BaseModel):
    text: str
    session_type: SessionType
    question: Optional[str] = None


class FeedbackResponse(BaseModel):
    overall_score: float
    feedback_items: List[FeedbackItem]
    summary: str


# =============================================================================
# Voice Transcription
# =============================================================================

class TranscriptionRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    language: str = "en-IN"


class TranscriptionResponse(BaseModel):
    text: str
    confidence: Optional[float] = None
    language_detected: Optional[str] = None


# =============================================================================
# Progress Tracking
# =============================================================================

class UserProgress(BaseModel):
    total_sessions: int
    average_score: float
    sessions_by_type: dict
    improvement_trend: List[float]
    strengths: List[str]
    areas_for_improvement: List[str]


# =============================================================================
# Error response
# =============================================================================

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    errors: Optional[List[dict[str, Any]]] = None
    request_id: Optional[str] = None


SessionConfigWithDetails.model_rebuild()
