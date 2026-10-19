-- SpeakReady AI Database Schema
-- Run this SQL in your Supabase SQL editor to create the necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Practice sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('interview', 'viva', 'free_conversation', 'grammar')),
    question TEXT,
    user_response TEXT NOT NULL,
    audio_url TEXT,
    overall_score DECIMAL(4, 2) CHECK (overall_score >= 0 AND overall_score <= 10),
    feedback JSONB,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_type ON practice_sessions(session_type);

-- User progress table (for tracking streaks and milestones)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_sessions INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_practice_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

-- Feedback history table (optional - for storing individual feedback items)
CREATE TABLE IF NOT EXISTS feedback_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('grammar', 'fluency', 'vocabulary', 'pronunciation', 'content')),
    score DECIMAL(4, 2) CHECK (score >= 0 AND score <= 10),
    comments TEXT,
    suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_feedback_items_session_id ON feedback_items(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on user_progress table
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update user progress after a new session
CREATE OR REPLACE FUNCTION update_user_progress_on_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user progress
    INSERT INTO user_progress (user_id, total_sessions, last_practice_date)
    VALUES (NEW.user_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_sessions = user_progress.total_sessions + 1,
        last_practice_date = CURRENT_DATE,
        current_streak = CASE
            WHEN user_progress.last_practice_date = CURRENT_DATE - INTERVAL '1 day' THEN user_progress.current_streak + 1
            WHEN user_progress.last_practice_date = CURRENT_DATE THEN user_progress.current_streak
            ELSE 1
        END,
        longest_streak = GREATEST(
            user_progress.longest_streak,
            CASE
                WHEN user_progress.last_practice_date = CURRENT_DATE - INTERVAL '1 day' THEN user_progress.current_streak + 1
                WHEN user_progress.last_practice_date = CURRENT_DATE THEN user_progress.current_streak
                ELSE 1
            END
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update progress when a session is created
CREATE TRIGGER update_progress_on_new_session
    AFTER INSERT ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_progress_on_session();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own practice sessions
CREATE POLICY "Users can view own sessions" ON practice_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON practice_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only view their own progress
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view feedback for their own sessions
CREATE POLICY "Users can view own feedback" ON feedback_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM practice_sessions
            WHERE practice_sessions.id = feedback_items.session_id
            AND practice_sessions.user_id = auth.uid()
        )
    );

-- Service role can do everything (for backend API)
-- Note: In production, use service role key only on backend

-- Sample data for testing (optional)
-- INSERT INTO users (email, full_name, password_hash) VALUES
--     ('test@example.com', 'Test User', '$2b$12$sample_hash_here');
