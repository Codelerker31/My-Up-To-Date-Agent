-- =====================================================
-- Migration 001: Initial Schema Setup
-- =====================================================

-- This migration creates the initial database schema for the Updates Agent application
-- Run this migration first when setting up a new Supabase project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES
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
-- TABLES
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
-- INDEXES
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