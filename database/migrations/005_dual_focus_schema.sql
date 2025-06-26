-- =====================================================
-- Migration 005: Dual Focus Architecture
-- =====================================================

-- This migration adds support for dual-focus architecture (News vs Research)
-- Run this migration to enable News and Research focus separation

-- =====================================================
-- SCHEMA UPDATES
-- =====================================================

-- Add focus_type enum
CREATE TYPE focus_type AS ENUM ('news', 'research');

-- Add focus_type to streams table
ALTER TABLE public.streams 
ADD COLUMN focus_type focus_type DEFAULT 'research';

-- Add index for focus_type
CREATE INDEX IF NOT EXISTS idx_streams_focus_type ON public.streams(focus_type);

-- =====================================================
-- FOCUS-SPECIFIC TABLES
-- =====================================================

-- News streams configuration table
CREATE TABLE IF NOT EXISTS public.news_streams (
  stream_id UUID PRIMARY KEY REFERENCES public.streams(id) ON DELETE CASCADE,
  alert_threshold INTEGER DEFAULT 5, -- Minimum importance score for alerts
  source_types JSONB DEFAULT '["news_api", "rss", "social"]'::jsonb, -- Types of sources to monitor
  breaking_news_enabled BOOLEAN DEFAULT true,
  trend_tracking BOOLEAN DEFAULT true,
  bias_analysis_enabled BOOLEAN DEFAULT false,
  real_time_alerts BOOLEAN DEFAULT false,
  max_articles_per_hour INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research projects configuration table
CREATE TABLE IF NOT EXISTS public.research_projects (
  stream_id UUID PRIMARY KEY REFERENCES public.streams(id) ON DELETE CASCADE,
  methodology JSONB DEFAULT '["web_search", "academic_sources"]'::jsonb, -- Research methods
  citation_style TEXT DEFAULT 'APA', -- APA, MLA, Chicago, etc.
  collaboration_enabled BOOLEAN DEFAULT false,
  export_format TEXT DEFAULT 'markdown', -- markdown, pdf, docx
  academic_sources_only BOOLEAN DEFAULT false,
  min_source_quality INTEGER DEFAULT 3, -- 1-5 quality threshold
  research_depth TEXT DEFAULT 'standard', -- quick, standard, comprehensive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content sources table (enhanced for dual focus)
CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  title TEXT,
  source_type TEXT NOT NULL, -- 'news', 'academic', 'blog', 'social', etc.
  credibility_score REAL DEFAULT 0.5, -- 0.0 to 1.0
  bias_rating TEXT, -- 'left', 'center', 'right', 'unknown'
  academic_tier INTEGER, -- 1-5 for academic sources
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Additional source-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citations table for research projects
CREATE TABLE IF NOT EXISTS public.citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  research_project_id UUID NOT NULL REFERENCES public.research_projects(stream_id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.content_sources(id),
  citation_text TEXT NOT NULL,
  citation_style TEXT DEFAULT 'APA',
  page_number TEXT,
  quote_text TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News alerts table
CREATE TABLE IF NOT EXISTS public.news_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_stream_id UUID NOT NULL REFERENCES public.news_streams(stream_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  importance_score INTEGER DEFAULT 1, -- 1-10 importance scale
  alert_type TEXT DEFAULT 'breaking', -- 'breaking', 'trending', 'update'
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- News streams indexes
CREATE INDEX IF NOT EXISTS idx_news_streams_breaking_enabled ON public.news_streams(breaking_news_enabled);
CREATE INDEX IF NOT EXISTS idx_news_streams_real_time ON public.news_streams(real_time_alerts);

-- Research projects indexes
CREATE INDEX IF NOT EXISTS idx_research_projects_collaboration ON public.research_projects(collaboration_enabled);
CREATE INDEX IF NOT EXISTS idx_research_projects_academic_only ON public.research_projects(academic_sources_only);

-- Content sources indexes
CREATE INDEX IF NOT EXISTS idx_content_sources_type ON public.content_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_content_sources_credibility ON public.content_sources(credibility_score);
CREATE INDEX IF NOT EXISTS idx_content_sources_active ON public.content_sources(is_active);

-- Citations indexes
CREATE INDEX IF NOT EXISTS idx_citations_research_project ON public.citations(research_project_id);
CREATE INDEX IF NOT EXISTS idx_citations_source ON public.citations(source_id);

-- News alerts indexes
CREATE INDEX IF NOT EXISTS idx_news_alerts_stream ON public.news_alerts(news_stream_id);
CREATE INDEX IF NOT EXISTS idx_news_alerts_user ON public.news_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_news_alerts_unread ON public.news_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_news_alerts_importance ON public.news_alerts(importance_score);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update triggers for new tables
CREATE TRIGGER update_news_streams_updated_at 
  BEFORE UPDATE ON public.news_streams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_projects_updated_at 
  BEFORE UPDATE ON public.research_projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.news_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_alerts ENABLE ROW LEVEL SECURITY;

-- News streams policies
CREATE POLICY "Users can view own news streams" ON public.news_streams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = news_streams.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own news streams" ON public.news_streams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = news_streams.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own news streams" ON public.news_streams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = news_streams.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own news streams" ON public.news_streams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = news_streams.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Research projects policies
CREATE POLICY "Users can view own research projects" ON public.research_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = research_projects.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own research projects" ON public.research_projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = research_projects.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own research projects" ON public.research_projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = research_projects.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own research projects" ON public.research_projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.streams 
      WHERE streams.id = research_projects.stream_id 
      AND streams.user_id = auth.uid()
    )
  );

-- Content sources policies (public read, admin write)
CREATE POLICY "Anyone can view content sources" ON public.content_sources
  FOR SELECT USING (true);

-- Citations policies
CREATE POLICY "Users can view citations from own research" ON public.citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.research_projects rp
      JOIN public.streams s ON s.id = rp.stream_id
      WHERE rp.stream_id = citations.research_project_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert citations to own research" ON public.citations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_projects rp
      JOIN public.streams s ON s.id = rp.stream_id
      WHERE rp.stream_id = citations.research_project_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update citations from own research" ON public.citations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.research_projects rp
      JOIN public.streams s ON s.id = rp.stream_id
      WHERE rp.stream_id = citations.research_project_id 
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete citations from own research" ON public.citations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.research_projects rp
      JOIN public.streams s ON s.id = rp.stream_id
      WHERE rp.stream_id = citations.research_project_id 
      AND s.user_id = auth.uid()
    )
  );

-- News alerts policies
CREATE POLICY "Users can view own news alerts" ON public.news_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own news alerts" ON public.news_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS (Updated)
-- =====================================================

-- Enhanced function to get user's streams with focus-specific data
CREATE OR REPLACE FUNCTION get_user_streams_with_focus(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  priority priority_level,
  color stream_color,
  focus_type focus_type,
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
  has_new_update BOOLEAN,
  focus_config JSONB
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
    s.focus_type,
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
    END as has_new_update,
    CASE 
      WHEN s.focus_type = 'news' THEN
        (SELECT row_to_json(ns.*) FROM public.news_streams ns WHERE ns.stream_id = s.id)
      WHEN s.focus_type = 'research' THEN
        (SELECT row_to_json(rp.*) FROM public.research_projects rp WHERE rp.stream_id = s.id)
      ELSE NULL
    END as focus_config
  FROM public.streams s
  WHERE s.user_id = user_uuid
  ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get news alerts for user
CREATE OR REPLACE FUNCTION get_user_news_alerts(user_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_url TEXT,
  importance_score INTEGER,
  alert_type TEXT,
  is_read BOOLEAN,
  sent_at TIMESTAMPTZ,
  stream_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    na.id,
    na.title,
    na.content,
    na.source_url,
    na.importance_score,
    na.alert_type,
    na.is_read,
    na.sent_at,
    s.title as stream_title
  FROM public.news_alerts na
  JOIN public.news_streams ns ON ns.stream_id = na.news_stream_id
  JOIN public.streams s ON s.id = ns.stream_id
  WHERE na.user_id = user_uuid
  ORDER BY na.sent_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get research citations
CREATE OR REPLACE FUNCTION get_research_citations(stream_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  citation_text TEXT,
  citation_style TEXT,
  page_number TEXT,
  quote_text TEXT,
  context TEXT,
  source_url TEXT,
  source_title TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if user owns the research project
  IF NOT EXISTS (
    SELECT 1 FROM public.streams 
    WHERE id = stream_uuid AND user_id = user_uuid AND focus_type = 'research'
  ) THEN
    RAISE EXCEPTION 'Access denied or not a research project';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.citation_text,
    c.citation_style,
    c.page_number,
    c.quote_text,
    c.context,
    cs.url as source_url,
    cs.title as source_title,
    c.created_at
  FROM public.citations c
  LEFT JOIN public.content_sources cs ON cs.id = c.source_id
  WHERE c.research_project_id = stream_uuid
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 