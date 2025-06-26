# Database Setup Guide for Updates Agent

This directory contains all the SQL scripts needed to set up the database for the Updates Agent application.

## Overview

The Updates Agent uses Supabase as its database backend, which provides:

- **PostgreSQL database** for data storage
- **Supabase Auth** for user authentication
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates

## Database Schema

The application uses the following main tables:

### Core Tables

1. **`users`** - User profiles (extends Supabase auth.users)
2. **`streams`** - Research topics/streams that users track
3. **`messages`** - Chat messages within streams
4. **`newsletters`** - Generated research reports
5. **`research_sessions`** - Research session tracking
6. **`scheduled_tasks`** - Automated task scheduling

### Key Features

- **UUID primary keys** for all tables
- **Automatic timestamps** (created_at, updated_at)
- **JSONB columns** for flexible metadata storage
- **Foreign key relationships** with cascade deletes
- **Custom enums** for type safety
- **Comprehensive indexing** for performance

## Setup Instructions

### Option 1: Complete Setup (Recommended)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Go to the SQL Editor** in your Supabase dashboard
3. **Copy and paste** the contents of `database/setup.sql`
4. **Run the script** to set up the complete database

### Option 2: Step-by-Step Migrations

If you prefer to run migrations individually:

1. **Run `database/migrations/001_initial_schema.sql`** - Creates tables and indexes
2. **Run `database/migrations/002_triggers_and_functions.sql`** - Adds triggers and helper functions
3. **Run `database/migrations/003_row_level_security.sql`** - Sets up RLS policies
4. **Optionally run `database/migrations/004_sample_data.sql`** - Adds sample data for development

### Option 3: Use the Main Schema File

Run `database/supabase-schema.sql` which contains the complete schema.

## Environment Configuration

After setting up the database, configure your environment variables:

### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (.env)

```bash
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Database Functions

The setup includes several helper functions:

### User Functions

- `get_user_streams(user_uuid)` - Get all streams for a user with counts
- `get_stream_messages(stream_uuid, user_uuid)` - Get messages for a stream
- `get_stream_newsletters(stream_uuid, user_uuid)` - Get newsletters for a stream

### System Functions

- `get_active_scheduled_tasks()` - Get tasks ready to run
- `calculate_next_run(frequency, day_of_week, time)` - Calculate next run time

### Trigger Functions

- `update_updated_at_column()` - Automatically update timestamps
- `update_stream_counters()` - Update stream source/insight counts
- `update_stream_last_update()` - Update stream last update time

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:

- **Users can only access their own data**
- **Proper foreign key validation**
- **Service role access for backend operations**

### Policy Examples

```sql
-- Users can only view their own streams
CREATE POLICY "Users can view own streams" ON public.streams
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert messages to their own streams
CREATE POLICY "Users can insert messages to own streams" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.streams
      WHERE streams.id = messages.stream_id
      AND streams.user_id = auth.uid()
    )
  );
```

## Data Types

### Custom Enums

```sql
-- Priority levels for streams
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');

-- Stream colors for UI
CREATE TYPE stream_color AS ENUM ('emerald', 'blue', 'purple', 'orange');

-- Message types
CREATE TYPE message_type AS ENUM (
  'user', 'agent', 'newsletter', 'research_update',
  'insight', 'schedule_request', 'schedule_confirmation'
);
```

### JSONB Usage

Several columns use JSONB for flexible data storage:

- **`users.preferences`** - User settings (timezone, theme, notifications)
- **`messages.metadata`** - Message metadata (confidence, sources, research phase)
- **`newsletters.sources`** - Array of source URLs
- **`newsletters.key_insights`** - Array of key insights
- **`research_sessions.methodology`** - Array of research methods

## Indexes

The database includes comprehensive indexing for optimal performance:

- **Primary key indexes** on all tables
- **Foreign key indexes** for joins
- **Composite indexes** for common queries
- **Partial indexes** for active records

## Triggers

Automatic triggers handle:

- **Timestamp updates** when records are modified
- **Counter updates** when related records are created
- **Stream last_update** when messages are added

## Sample Data

The `database/migrations/004_sample_data.sql` file contains sample data for development:

- Sample users (requires Supabase Auth setup)
- Sample streams with different categories
- Sample messages showing conversation flow
- Sample newsletters with realistic content
- Sample research sessions and scheduled tasks

**Note:** Only use sample data in development environments.

## Testing the Setup

After setup, you can test the database with these queries:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Troubleshooting

### Common Issues

1. **"Extension not found"** - Make sure to enable the required extensions
2. **"Permission denied"** - Check that RLS policies are correctly configured
3. **"Foreign key constraint"** - Ensure users exist in Supabase Auth before creating profiles

### Reset Database

To completely reset the database:

```sql
-- Drop all tables (WARNING: This will delete all data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run the setup script again
```

## Security Considerations

- **Never expose the service role key** on the frontend
- **Use RLS policies** to enforce data access control
- **Validate user permissions** in your application code
- **Use parameterized queries** to prevent SQL injection
- **Regularly backup** your database

## Performance Tips

- **Monitor query performance** using Supabase's built-in analytics
- **Use appropriate indexes** for your query patterns
- **Consider pagination** for large result sets
- **Use connection pooling** for production applications

## Support

For database-related issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the migration files for specific setup steps
3. Test with the sample data to verify functionality
4. Check the application logs for error messages
