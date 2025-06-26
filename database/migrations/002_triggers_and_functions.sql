-- =====================================================
-- Migration 002: Triggers and Functions
-- =====================================================

-- This migration adds triggers and helper functions to the database
-- Run this after the initial schema migration

-- =====================================================
-- TRIGGERS AND FUNCTIONS
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
-- HELPER FUNCTIONS
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