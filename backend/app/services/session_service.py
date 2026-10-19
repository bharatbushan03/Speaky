from typing import List, Optional
from app.models.schemas import (
    PracticeSessionCreate,
    PracticeSessionResponse,
    UserProgress,
    SessionType
)
from app.db.database import get_supabase_client
from app.services.ai_service import AIService


class SessionService:
    def __init__(self):
        self.db = get_supabase_client()
        self.ai_service = AIService()

    async def create_session(
        self, 
        user_id: str, 
        session_data: PracticeSessionCreate
    ) -> PracticeSessionResponse:
        """Create a new practice session with AI feedback."""
        # Generate AI feedback
        feedback_response = await self.ai_service.generate_feedback(
            text=session_data.user_response,
            session_type=session_data.session_type,
            question=session_data.question
        )

        # Store session in database
        result = self.db.table("practice_sessions").insert({
            "user_id": user_id,
            "session_type": session_data.session_type,
            "question": session_data.question,
            "user_response": session_data.user_response,
            "audio_url": session_data.audio_url,
            "overall_score": feedback_response.overall_score,
            "feedback": [item.dict() for item in feedback_response.feedback_items],
            "summary": feedback_response.summary,
        }).execute()

        if not result.data:
            raise Exception("Failed to create session")

        return PracticeSessionResponse(**result.data[0])

    async def get_session(self, session_id: str) -> Optional[PracticeSessionResponse]:
        """Get a specific session."""
        result = self.db.table("practice_sessions").select("*").eq("id", session_id).execute()
        
        if not result.data:
            return None

        return PracticeSessionResponse(**result.data[0])

    async def get_user_sessions(self, user_id: str, limit: int = 10) -> List[PracticeSessionResponse]:
        """Get all sessions for a user."""
        result = self.db.table("practice_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()

        return [PracticeSessionResponse(**session) for session in result.data]

    async def get_user_progress(self, user_id: str) -> UserProgress:
        """Calculate user's progress and statistics."""
        # Get all user sessions
        result = self.db.table("practice_sessions")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        sessions = result.data
        
        if not sessions:
            return UserProgress(
                total_sessions=0,
                average_score=0.0,
                sessions_by_type={},
                improvement_trend=[],
                strengths=[],
                areas_for_improvement=[]
            )

        # Calculate statistics
        total_sessions = len(sessions)
        scores = [s["overall_score"] for s in sessions if s.get("overall_score")]
        average_score = sum(scores) / len(scores) if scores else 0.0

        # Sessions by type
        sessions_by_type = {}
        for session_type in SessionType:
            count = sum(1 for s in sessions if s["session_type"] == session_type.value)
            if count > 0:
                sessions_by_type[session_type.value] = count

        # Improvement trend (last 10 sessions)
        improvement_trend = scores[-10:] if len(scores) >= 10 else scores

        # Analyze strengths and weaknesses (simplified)
        strengths = ["Good vocabulary usage"] if average_score > 7 else []
        areas_for_improvement = ["Focus on grammar"] if average_score < 7 else []

        return UserProgress(
            total_sessions=total_sessions,
            average_score=round(average_score, 2),
            sessions_by_type=sessions_by_type,
            improvement_trend=improvement_trend,
            strengths=strengths,
            areas_for_improvement=areas_for_improvement
        )
