# Database Setup Guide

This directory contains database schemas and migrations for SpeakReady AI.

## Schema Overview

The database consists of four main tables:

1. **users** - User accounts and authentication
2. **practice_sessions** - Individual practice sessions with AI feedback
3. **user_progress** - Progress tracking, streaks, and statistics
4. **feedback_items** - Detailed feedback for each session

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - Project URL
   - Anon/Public key (for frontend)
   - Service role key (for backend)

### 2. Apply the Database Schema

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `schema.sql` from this directory
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

#### Option B: Using Migration Files

If you're using a migration tool:

```bash
# Apply migrations in order
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

### 3. Configure Environment Variables

Update your `backend/.env` file with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### 4. Verify the Setup

Run the backend server and check if the database connection is successful:

```bash
cd backend
python -m uvicorn main:app --reload
```

You should see: "✅ Successfully connected to Supabase"

## Database Schema Details

### Users Table
- Stores user authentication and profile information
- Password is hashed using bcrypt
- Indexed on email for fast lookups

### Practice Sessions Table
- Stores each practice session with user responses
- Contains AI-generated feedback as JSONB
- Supports different session types: interview, viva, free_conversation, grammar
- Linked to users via foreign key

### User Progress Table
- Tracks user statistics and streaks
- Automatically updated via database triggers
- One record per user

### Feedback Items Table
- Optional granular storage of feedback components
- Linked to practice sessions
- Categories: grammar, fluency, vocabulary, pronunciation, content

## Row Level Security (RLS)

The schema includes Row Level Security policies to ensure:
- Users can only access their own data
- Service role (backend API) has full access
- Secure by default

## Triggers and Functions

The schema includes:
- `update_updated_at_column()` - Automatically updates timestamps
- `update_user_progress_on_session()` - Updates progress when sessions are created
- Triggers on insert/update events

## Indexes

Optimized indexes for:
- User email lookups
- Session queries by user and date
- Progress tracking

## Migration Strategy

For future schema changes:
1. Create a new migration file: `00X_description.sql`
2. Apply in Supabase SQL Editor
3. Document changes in this README

## Troubleshooting

### Connection Issues
- Verify environment variables are set correctly
- Check if Supabase project is active
- Ensure service role key is used (not anon key) in backend

### RLS Errors
- RLS policies require Supabase Auth to be set up
- For testing, you can temporarily disable RLS on tables
- Backend uses service role key which bypasses RLS

### Migration Errors
- Ensure migrations are run in order
- Check for existing tables before running
- Use `IF NOT EXISTS` clauses to avoid conflicts
