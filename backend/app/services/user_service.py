from typing import Optional
from app.models.schemas import UserCreate, UserResponse
from app.db.database import get_supabase_client


class UserService:
    def __init__(self):
        self.db = get_supabase_client()

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Accounts are created by Supabase Auth, not a local password table."""
        raise RuntimeError(
            f"Accounts are created through Supabase Auth, not a local password for {user_data.email}."
        )

    async def get_user(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID."""
        result = self.db.table("users").select("*").eq("id", user_id).execute()
        
        if not result.data:
            return None

        return UserResponse(**result.data[0])

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email."""
        result = self.db.table("users").select("*").eq("email", email).execute()
        
        if not result.data:
            return None

        return result.data[0]
