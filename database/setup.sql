-- =====================================================
-- Complete Database Setup Script for Updates Agent
-- =====================================================

-- This script sets up the complete database schema for the Updates Agent application
-- Run this script in your Supabase SQL Editor to set up the entire database

-- =====================================================
-- STEP 1: Enable Extensions
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: Create Custom Types
-- =====================================================

-- Priority enum for streams
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');

-- Color enum for streams
CREATE TYPE stream_color AS ENUM ('emerald', 'blue', 'purple', 'orange');

-- Message type enum
CREATE TYPE message_type AS ENUM (
  'user', 
  'agent', 
  'newsletter', 
  'research_update', 
  'insight', 
  'schedule_request', 
  'schedule_confirmation'
);

-- Research session status enum
CREATE TYPE research_status AS ENUM ('active', 'completed', 'failed');

-- Task type enum for scheduled tasks
CREATE TYPE task_type AS ENUM ('research', 'newsletter', 'update');

-- =====================================================
-- STEP 3: Create Tables
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  preferences JSONB DEFAULT '{
    "timezone": "America/New_York",
    "emailNotifications": true,
    "theme": "dark",
    "defaultFrequency": "weekly",
    "defaultTime": "09:00"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streams table (research topics/streams)
CREATE TABLE IF NOT EXISTS public.streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority priority_level DEFAULT 'medium',
  color stream_color DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  frequency TEXT, -- 'daily', 'weekly', 'monthly', etc.
  day_of_week TEXT, -- for weekly schedules
  schedule_time TEXT, -- HH:MM format (renamed from 'time' to avoid reserved keyword)
  next_update TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  sources_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (chat messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type message_type NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB, -- For storing confidence, sources, research phase, etc.
  message_timestamp TIMESTAMPTZ DEFAULT NOW() -- renamed from 'timestamp' to avoid reserved keyword
);

-- Newsletters table (generated research reports)
CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  sources JSONB, -- Array of source URLs/descriptions
  key_insights JSONB, -- Array of key insights
  confidence REAL, -- 0.0 to 1.0
  is_automated BOOLEAN DEFAULT false,
  report_number INTEGER DEFAULT 1,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research sessions table (tracks research progress)
CREATE TABLE IF NOT EXISTS public.research_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status research_status DEFAULT 'active',
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  sources_analyzed INTEGER DEFAULT 0,
  key_findings INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0,
  methodology JSONB, -- Array of research methods used
  is_automated BOOLEAN DEFAULT false
);

-- Scheduled tasks table (for automated operations)
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_type task_type NOT NULL,
  frequency TEXT NOT NULL,
  day_of_week TEXT, -- for weekly schedules
  schedule_time TEXT NOT NULL, -- HH:MM format (renamed from 'time' to avoid reserved keyword)
  next_run TIMESTAMPTZ NOT NULL,
  last_run TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 4: Create Indexes
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Streams indexes
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON public.streams(user_id);
CREATE INDEX IF NOT EXISTS idx_streams_category ON public.streams(category);
CREATE INDEX IF NOT EXISTS idx_streams_is_active ON public.streams(is_active);
CREATE INDEX IF NOT EXISTS idx_streams_next_update ON public.streams(next_update);
CREATE INDEX IF NOT EXISTS idx_streams_last_update ON public.streams(last_update);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_stream_id ON public.messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(message_timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(type);

-- Newsletters indexes
CREATE INDEX IF NOT EXISTS idx_newsletters_stream_id ON public.newsletters(stream_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_user_id ON public.newsletters(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_generated_at ON public.newsletters(generated_at);
CREATE INDEX IF NOT EXISTS idx_newsletters_is_automated ON public.newsletters(is_automated);

-- Research sessions indexes
CREATE INDEX IF NOT EXISTS idx_research_sessions_stream_id ON public.research_sessions(stream_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON public.research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_start_time ON public.research_sessions(start_time);

-- Scheduled tasks indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_stream_id ON public.scheduled_tasks(stream_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id ON public.scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_is_active ON public.scheduled_tasks(is_active);

-- =====================================================
-- STEP 5: Create Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update stream counters
CREATE OR REPLACE FUNCTION update_stream_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update sources count when research session is created
    IF TG_TABLE_NAME = 'research_sessions' THEN
      UPDATE public.streams 
      SET sources_count = sources_count + NEW.sources_analyzed
      WHERE id = NEW.stream_id;
    END IF;
    
    -- Update insights count when newsletter is created
    IF TG_TABLE_NAME = 'newsletters' THEN
      UPDATE public.streams 
      SET insights_count = insights_count + COALESCE(jsonb_array_length(NEW.key_insights), 0)
      WHERE id = NEW.stream_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update stream last_update
CREATE OR REPLACE FUNCTION update_stream_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.streams 
  SET last_update = NOW()
  WHERE id = NEW.stream_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at 
  BEFORE UPDATE ON public.streams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stream_counters_trigger
  AFTER INSERT ON public.research_sessions
  FOR EACH ROW EXECUTE FUNCTION update_stream_counters();

CREATE TRIGGER update_stream_counters_newsletter_trigger
  AFTER INSERT ON public.newsletters
  FOR EACH ROW EXECUTE FUNCTION update_stream_counters();

CREATE TRIGGER update_stream_last_update_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_stream_last_update();

-- =====================================================
-- STEP 6: Create Helper Functions
-- =====================================================

-- Function to get user's streams with counts
CREATE OR REPLACE FUNCTION get_user_streams(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  priority priority_level,
  color stream_color,
  is_active BOOLEAN,
  frequency TEXT,
  day_of_week TEXT,
  schedule_time TEXT,
  next_update TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  sources_count INTEGER,
  insights_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  has_new_update BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.priority,
    s.color,
    s.is_active,
    s.frequency,
    s.day_of_week,
    s.schedule_time,
    s.next_update,
    s.last_update,
    s.sources_count,
    s.insights_count,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN s.last_update > COALESCE(
        (SELECT MAX(message_timestamp) FROM public.messages WHERE stream_id = s.id), 
        '1970-01-01'::timestamptz
      ) THEN true
      ELSE false
    END as has_new_update
  FROM public.streams s
  WHERE s.user_id = user_uuid
  ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stream messages
CREATE OR REPLACE FUNCTION get_stream_messages(stream_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  type message_type,
  content TEXT,
  metadata JSONB,
  message_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user owns the stream
  IF NOT EXISTS (
    SELECT 1 FROM public.streams 
    WHERE id = stream_uuid AND user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.type,
    m.content,
    m.metadata,
    m.message_timestamp
  FROM public.messages m
  WHERE m.stream_id = stream_uuid
  ORDER BY m.message_timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stream newsletters
CREATE OR REPLACE FUNCTION get_stream_newsletters(stream_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  content TEXT,
  sources JSONB,
  key_insights JSONB,
  confidence REAL,
  is_automated BOOLEAN,
  report_number INTEGER,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user owns the stream
  IF NOT EXISTS (
    SELECT 1 FROM public.streams 
    WHERE id = stream_uuid AND user_id = user_uuid
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.summary,
    n.content,
    n.sources,
    n.key_insights,
    n.confidence,
    n.is_automated,
    n.report_number,
    n.generated_at
  FROM public.newsletters n
  WHERE n.stream_id = stream_uuid
  ORDER BY n.generated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active scheduled tasks
CREATE OR REPLACE FUNCTION get_active_scheduled_tasks()
RETURNS TABLE (
  id UUID,
  stream_id UUID,
  user_id UUID,
  task_type task_type,
  frequency TEXT,
  day_of_week TEXT,
  schedule_time TEXT,
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id,
    st.stream_id,
    st.user_id,
    st.task_type,
    st.frequency,
    st.day_of_week,
    st.schedule_time,
    st.next_run,
    st.last_run,
    st.is_active
  FROM public.scheduled_tasks st
  WHERE st.is_active = true 
    AND st.next_run <= NOW()
  ORDER BY st.next_run ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next run time for scheduled tasks
CREATE OR REPLACE FUNCTION calculate_next_run(
  frequency TEXT,
  day_of_week TEXT DEFAULT NULL,
  schedule_time TEXT DEFAULT '09:00'
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
  time_parts TEXT[];
  hour INTEGER;
  minute INTEGER;
BEGIN
  -- Parse time string (HH:MM format)
  time_parts := string_to_array(schedule_time, ':');
  hour := time_parts[1]::INTEGER;
  minute := time_parts[2]::INTEGER;
  
  -- Calculate next run based on frequency
  CASE frequency
    WHEN 'daily' THEN
      next_run := (CURRENT_DATE + INTERVAL '1 day')::date + (hour || ':' || minute || ':00')::time;
    WHEN 'weekly' THEN
      IF day_of_week IS NULL THEN
        next_run := (CURRENT_DATE + INTERVAL '7 days')::date + (hour || ':' || minute || ':00')::time;
      ELSE
        next_run := (CURRENT_DATE + INTERVAL '1 week')::date + (hour || ':' || minute || ':00')::time;
        -- Adjust to specific day of week if needed
        WHILE to_char(next_run, 'Day') != day_of_week LOOP
          next_run := next_run + INTERVAL '1 day';
        END LOOP;
      END IF;
    WHEN 'monthly' THEN
      next_run := (CURRENT_DATE + INTERVAL '1 month')::date + (hour || ':' || minute || ':00')::time;
    ELSE
      -- Default to daily
      next_run := (CURRENT_DATE + INTERVAL '1 day')::date + (hour || ':' || minute || ':00')::time;
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: Enable Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: Create RLS Policies
-- =====================================================

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Streams policies
CREATE POLICY "Users can view own streams" ON public.streams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streams" ON public.streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streams" ON public.streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own streams" ON public.streams
  FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages from own streams" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own streams" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages from own streams" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own streams" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Newsletters policies
CREATE POLICY "Users can view own newsletters" ON public.newsletters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own newsletters" ON public.newsletters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own newsletters" ON public.newsletters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own newsletters" ON public.newsletters
  FOR DELETE USING (auth.uid() = user_id);

-- Research sessions policies
CREATE POLICY "Users can view own research sessions" ON public.research_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research sessions" ON public.research_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research sessions" ON public.research_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research sessions" ON public.research_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled tasks policies
CREATE POLICY "Users can view own scheduled tasks" ON public.scheduled_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled tasks" ON public.scheduled_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled tasks" ON public.scheduled_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled tasks" ON public.scheduled_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Service role policies (for backend operations)
CREATE POLICY "Service role can access all data" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all streams" ON public.streams
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all newsletters" ON public.newsletters
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all research sessions" ON public.research_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all scheduled tasks" ON public.scheduled_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- STEP 9: Add Comments
-- =====================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.streams IS 'Research streams/topics that users track';
COMMENT ON TABLE public.messages IS 'Chat messages within streams';
COMMENT ON TABLE public.newsletters IS 'Generated research reports/newsletters';
COMMENT ON TABLE public.research_sessions IS 'Research session tracking';
COMMENT ON TABLE public.scheduled_tasks IS 'Automated task scheduling';

COMMENT ON COLUMN public.users.preferences IS 'JSON object containing user preferences like timezone, notifications, theme';
COMMENT ON COLUMN public.messages.metadata IS 'JSON object containing message metadata like confidence, sources, research phase';
COMMENT ON COLUMN public.newsletters.sources IS 'JSON array of source URLs and descriptions';
COMMENT ON COLUMN public.newsletters.key_insights IS 'JSON array of key insights extracted from research';
COMMENT ON COLUMN public.research_sessions.methodology IS 'JSON array of research methods used in the session';

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- The database is now fully set up with:
-- ✅ All tables created with proper relationships
-- ✅ Indexes for optimal performance
-- ✅ Triggers for automatic updates
-- ✅ Helper functions for common operations
-- ✅ Row Level Security enabled
-- ✅ RLS policies for data protection
-- ✅ Service role access for backend operations

-- Next steps:
-- 1. Configure your environment variables
-- 2. Test the setup with your application
-- 3. Optionally run the sample data migration for development 