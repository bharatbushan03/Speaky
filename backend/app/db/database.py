from supabase import create_client, Client
from app.core.config import settings

# Supabase client for database operations
supabase_client: Client = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance."""
    global supabase_client
    if supabase_client is None:
        supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    return supabase_client


async def init_db():
    """Initialize database connection and verify connectivity."""
    try:
        client = get_supabase_client()
        # Test connection
        result = client.table("users").select("id").limit(1).execute()
        print("✅ Successfully connected to Supabase")
    except Exception as e:
        print(f"⚠️  Database connection warning: {e}")
        print("Note: Ensure Supabase tables are created before running the application")
