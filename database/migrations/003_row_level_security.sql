-- =====================================================
-- Migration 003: Row Level Security (RLS)
-- =====================================================

-- This migration sets up Row Level Security policies for all tables
-- Run this after the triggers and functions migration

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS POLICIES
-- =====================================================

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- STREAMS POLICIES
-- =====================================================

-- Users can view own streams
CREATE POLICY "Users can view own streams" ON public.streams
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own streams
CREATE POLICY "Users can insert own streams" ON public.streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own streams
CREATE POLICY "Users can update own streams" ON public.streams
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own streams
CREATE POLICY "Users can delete own streams" ON public.streams
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================

-- Users can view messages from own streams
CREATE POLICY "Users can view messages from own streams" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Users can insert messages to own streams
CREATE POLICY "Users can insert messages to own streams" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Users can update messages from own streams
CREATE POLICY "Users can update messages from own streams" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Users can delete messages from own streams
CREATE POLICY "Users can delete messages from own streams" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = messages.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- =====================================================
-- NEWSLETTERS POLICIES
-- =====================================================

-- Users can view own newsletters
CREATE POLICY "Users can view own newsletters" ON public.newsletters
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own newsletters
CREATE POLICY "Users can insert own newsletters" ON public.newsletters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own newsletters
CREATE POLICY "Users can update own newsletters" ON public.newsletters
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own newsletters
CREATE POLICY "Users can delete own newsletters" ON public.newsletters
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- RESEARCH SESSIONS POLICIES
-- =====================================================

-- Users can view own research sessions
CREATE POLICY "Users can view own research sessions" ON public.research_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own research sessions
CREATE POLICY "Users can insert own research sessions" ON public.research_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own research sessions
CREATE POLICY "Users can update own research sessions" ON public.research_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own research sessions
CREATE POLICY "Users can delete own research sessions" ON public.research_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SCHEDULED TASKS POLICIES
-- =====================================================

-- Users can view own scheduled tasks
CREATE POLICY "Users can view own scheduled tasks" ON public.scheduled_tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own scheduled tasks
CREATE POLICY "Users can insert own scheduled tasks" ON public.scheduled_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own scheduled tasks
CREATE POLICY "Users can update own scheduled tasks" ON public.scheduled_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own scheduled tasks
CREATE POLICY "Users can delete own scheduled tasks" ON public.scheduled_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE ROLE POLICIES (for backend operations)
-- =====================================================

-- Allow service role to access all data (for backend operations)
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