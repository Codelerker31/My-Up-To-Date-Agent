-- =====================================================
-- Migration 004: Sample Data (Optional)
-- =====================================================

-- This migration inserts sample data for development and testing
-- Only run this in development environments, not in production
-- You can comment out or skip this migration in production

-- =====================================================
-- SAMPLE USERS
-- =====================================================

-- Note: These sample users will only work if you create them in Supabase Auth first
-- You can create them through the Supabase dashboard or via the API

-- Sample user 1 (replace with actual UUID from Supabase Auth)
-- INSERT INTO public.users (id, email, name, preferences) VALUES 
--   ('00000000-0000-0000-0000-000000000001', 'demo@example.com', 'Demo User', '{
--     "timezone": "America/New_York",
--     "emailNotifications": true,
--     "theme": "dark",
--     "defaultFrequency": "weekly",
--     "defaultTime": "09:00"
--   }'::jsonb);

-- Sample user 2
-- INSERT INTO public.users (id, email, name, preferences) VALUES 
--   ('00000000-0000-0000-0000-000000000002', 'test@example.com', 'Test User', '{
--     "timezone": "Europe/London",
--     "emailNotifications": false,
--     "theme": "light",
--     "defaultFrequency": "daily",
--     "defaultTime": "08:00"
--   }'::jsonb);

-- =====================================================
-- SAMPLE STREAMS
-- =====================================================

-- Sample streams for user 1
-- INSERT INTO public.streams (id, user_id, title, description, category, priority, color, frequency, day_of_week, schedule_time, next_update, last_update, sources_count, insights_count) VALUES
--   ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'AI Research Updates', 'Latest developments in artificial intelligence and machine learning', 'Technology', 'high', 'emerald', 'weekly', 'Monday', '09:00', NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 days', 15, 8),
--   ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Market Trends', 'Financial market analysis and economic trends', 'Finance', 'medium', 'blue', 'daily', NULL, '08:00', NOW() + INTERVAL '1 day', NOW() - INTERVAL '6 hours', 25, 12),
--   ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Health & Wellness', 'Latest health research and wellness tips', 'Health', 'low', 'purple', 'weekly', 'Wednesday', '10:00', NOW() + INTERVAL '5 days', NOW() - INTERVAL '4 days', 8, 5),
--   ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Climate Science', 'Environmental research and climate change updates', 'Science', 'high', 'orange', 'bi-weekly', 'Friday', '14:00', NOW() + INTERVAL '14 days', NOW() - INTERVAL '10 days', 20, 15);

-- Sample streams for user 2
-- INSERT INTO public.streams (id, user_id, title, description, category, priority, color, frequency, day_of_week, schedule_time, next_update, last_update, sources_count, insights_count) VALUES
--   ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000002', 'Startup News', 'Latest startup funding and tech industry news', 'Business', 'high', 'emerald', 'daily', NULL, '07:00', NOW() + INTERVAL '1 day', NOW() - INTERVAL '12 hours', 30, 18),
--   ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000002', 'Crypto Updates', 'Cryptocurrency market analysis and blockchain news', 'Finance', 'medium', 'blue', 'daily', NULL, '06:00', NOW() + INTERVAL '1 day', NOW() - INTERVAL '18 hours', 22, 14);

-- =====================================================
-- SAMPLE MESSAGES
-- =====================================================

-- Sample messages for AI Research stream
-- INSERT INTO public.messages (id, stream_id, user_id, type, content, metadata, message_timestamp) VALUES
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'user', 'Can you research the latest developments in large language models?', NULL, NOW() - INTERVAL '2 days'),
--   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'agent', 'I''ll research the latest developments in large language models for you. Let me gather information from recent papers and industry reports.', '{"researchPhase": "initializing", "sourcesFound": 0}', NOW() - INTERVAL '2 days' + INTERVAL '30 seconds'),
--   ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'research_update', 'I''ve found 15 recent sources on large language model developments. Key areas include multimodal models, efficiency improvements, and new architectures.', '{"researchPhase": "gathering", "sourcesFound": 15, "confidence": 0.85}', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
--   ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'insight', 'Key finding: GPT-4 and similar models are showing significant improvements in reasoning capabilities and multimodal understanding.', '{"confidence": 0.92, "sources": ["arxiv.org/abs/2303.08774", "openai.com/research/gpt-4"]}', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes');

-- Sample messages for Market Trends stream
-- INSERT INTO public.messages (id, stream_id, user_id, type, content, metadata, message_timestamp) VALUES
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'user', 'What are the current market trends for Q4 2024?', NULL, NOW() - INTERVAL '6 hours'),
--   ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'agent', 'I''ll analyze the current market trends for Q4 2024. Let me gather data from financial reports and market analysis.', '{"researchPhase": "initializing", "sourcesFound": 0}', NOW() - INTERVAL '6 hours' + INTERVAL '30 seconds'),
--   ('gggggggg-gggg-gggg-gggg-gggggggggggg', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'insight', 'Market analysis shows continued growth in tech stocks, with AI and renewable energy sectors leading gains. Inflation concerns remain but are stabilizing.', '{"confidence": 0.88, "sources": ["bloomberg.com/markets", "reuters.com/business"]}', NOW() - INTERVAL '6 hours' + INTERVAL '10 minutes');

-- =====================================================
-- SAMPLE NEWSLETTERS
-- =====================================================

-- Sample newsletter for AI Research stream
-- INSERT INTO public.newsletters (id, stream_id, user_id, title, summary, content, sources, key_insights, confidence, is_automated, report_number, generated_at) VALUES
--   ('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'AI Research Weekly Update - Week 45', 'This week''s developments in artificial intelligence focus on multimodal models, efficiency improvements, and new architectural innovations.', '## Executive Summary

-- This week has seen significant progress in large language models, particularly in multimodal capabilities and efficiency improvements. Key developments include new model architectures and improved reasoning capabilities.

-- ## Key Developments

-- ### 1. Multimodal Model Advances
-- Recent research shows GPT-4 and similar models demonstrating enhanced ability to process and understand both text and visual information simultaneously.

-- ### 2. Efficiency Improvements
-- New techniques are reducing computational requirements while maintaining or improving model performance.

-- ### 3. Reasoning Capabilities
-- Models are showing improved logical reasoning and problem-solving abilities across various domains.

-- ## Implications

-- These developments suggest continued rapid advancement in AI capabilities, with practical applications becoming more accessible to developers and businesses.', 
--   '["arxiv.org/abs/2303.08774", "openai.com/research/gpt-4", "anthropic.com/research", "deepmind.com/blog"]'::jsonb,
--   '["Multimodal models show 40% improvement in visual reasoning tasks", "New efficiency techniques reduce training costs by 60%", "Reasoning capabilities improved across mathematical and logical domains"]'::jsonb,
--   0.92, true, 1, NOW() - INTERVAL '2 days');

-- Sample newsletter for Market Trends stream
-- INSERT INTO public.newsletters (id, stream_id, user_id, title, summary, content, sources, key_insights, confidence, is_automated, report_number, generated_at) VALUES
--   ('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Market Trends Daily - November 15, 2024', 'Today''s market analysis shows continued strength in tech stocks with AI and renewable energy sectors leading gains.', '## Market Overview

-- Today''s trading session showed continued strength in technology stocks, with particular focus on AI-related companies and renewable energy sectors.

-- ## Sector Performance

-- ### Technology
-- AI and machine learning companies continue to outperform, with gains averaging 2.5% across the sector.

-- ### Renewable Energy
-- Solar and wind energy stocks showed strong performance, up 1.8% on average.

-- ### Financial Services
-- Traditional banking stocks remained stable with minimal movement.

-- ## Economic Indicators

-- Inflation data shows stabilization, with CPI remaining within expected ranges. Federal Reserve signals suggest continued cautious approach to interest rates.', 
--   '["bloomberg.com/markets", "reuters.com/business", "wsj.com/markets", "cnbc.com/markets"]'::jsonb,
--   '["Tech stocks up 2.5% led by AI companies", "Renewable energy sector gains 1.8%", "Inflation stabilizing within expected ranges"]'::jsonb,
--   0.88, true, 1, NOW() - INTERVAL '6 hours');

-- =====================================================
-- SAMPLE RESEARCH SESSIONS
-- =====================================================

-- Sample research session for AI Research stream
-- INSERT INTO public.research_sessions (id, stream_id, user_id, status, start_time, end_time, sources_analyzed, key_findings, confidence, methodology, is_automated) VALUES
--   ('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '20 minutes', 15, 8, 0.92, '["academic_papers", "industry_reports", "conference_proceedings", "technical_blog_posts"]'::jsonb, true);

-- Sample research session for Market Trends stream
-- INSERT INTO public.research_sessions (id, stream_id, user_id, status, start_time, end_time, sources_analyzed, key_findings, confidence, methodology, is_automated) VALUES
--   ('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'completed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours' + INTERVAL '15 minutes', 25, 12, 0.88, '["financial_reports", "market_analysis", "economic_indicators", "expert_opinions"]'::jsonb, true);

-- =====================================================
-- SAMPLE SCHEDULED TASKS
-- =====================================================

-- Sample scheduled tasks
-- INSERT INTO public.scheduled_tasks (id, stream_id, user_id, task_type, frequency, day_of_week, schedule_time, next_run, last_run, is_active) VALUES
--   ('llllllll-llll-llll-llll-llllllllllll', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'research', 'weekly', 'Monday', '09:00', NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 days', true),
--   ('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'research', 'daily', NULL, '08:00', NOW() + INTERVAL '1 day', NOW() - INTERVAL '6 hours', true),
--   ('nnnnnnnn-nnnn-nnnn-nnnn-nnnnnnnnnnnn', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'newsletter', 'weekly', 'Wednesday', '10:00', NOW() + INTERVAL '5 days', NOW() - INTERVAL '4 days', true);

-- =====================================================
-- COMMENTS
-- =====================================================

-- This sample data provides a realistic starting point for development and testing
-- Remember to:
-- 1. Create the users in Supabase Auth first
-- 2. Replace the UUIDs with actual user IDs from your Supabase project
-- 3. Only use this in development environments
-- 4. Comment out or skip this migration in production 