from typing import Optional
from app.models.schemas import UserCreate, UserResponse
from app.db.database import get_supabase_client
from app.core.security import get_password_hash


class UserService:
    def __init__(self):
        self.db = get_supabase_client()

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user."""
        # Check if user already exists
        existing = self.db.table("users").select("id").eq("email", user_data.email).execute()
        if existing.data:
            raise ValueError("User with this email already exists")

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Insert user
        result = self.db.table("users").insert({
            "email": user_data.email,
            "full_name": user_data.full_name,
            "password_hash": hashed_password,
        }).execute()

        if not result.data:
            raise Exception("Failed to create user")

        return UserResponse(**result.data[0])

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
