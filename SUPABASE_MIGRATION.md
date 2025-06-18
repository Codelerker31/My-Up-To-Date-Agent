# Supabase Migration Guide

This document outlines the migration from SQLite + JWT to Supabase for both authentication and database.

## Overview

The application has been migrated to use:

- **Supabase Auth** for user authentication (replaces custom JWT)
- **Supabase Database** (PostgreSQL) for data storage (replaces SQLite)
- **Row Level Security (RLS)** for data access control

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Wait for the project to be fully provisioned

### 2. Set Up Database Schema

1. Go to the **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database/supabase-schema.sql`
3. Paste and run the SQL to create all tables, indexes, and RLS policies

### 3. Configure Environment Variables

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

#### Backend (.env)

```bash
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Other existing variables...
OPENAI_API_KEY=your-openai-api-key
# etc...
```

### 4. Get Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings** > **API**
2. Copy the **Project URL** (SUPABASE_URL)
3. Copy the **anon public** key (SUPABASE_ANON_KEY)
4. Copy the **service_role secret** key (SUPABASE_SERVICE_ROLE_KEY)

⚠️ **Important**: Never expose the service role key on the frontend!

### 5. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 6. Configure Supabase Auth Settings

In your Supabase dashboard:

1. Go to **Authentication** > **Settings**
2. Configure **Site URL**: `http://localhost:3000` (for development)
3. Add **Redirect URLs** if needed
4. Configure **Email Templates** if using email auth
5. Set up **Providers** if using OAuth (Google, GitHub, etc.)

## Key Changes Made

### Frontend Changes

1. **Auth Provider** (`components/auth/auth-provider.tsx`)

   - Replaced custom JWT auth with Supabase auth
   - Added `signUp`, `signIn`, `signOut` methods
   - Automatic session management

2. **Auth Forms** (`components/auth/login-form.tsx`, `register-form.tsx`)

   - Updated to use Supabase auth methods
   - Removed manual token storage

3. **Supabase Client** (`lib/supabase.ts`)
   - Configured Supabase client for browser and server use

### Backend Changes

1. **Supabase Service** (`server/services/SupabaseService.js`)

   - Replaced DatabaseService and AuthService
   - Unified database and auth operations
   - Added RLS-aware queries

2. **Server Setup** (`server/index.js`)

   - Updated to use SupabaseService
   - Removed SQLite initialization

3. **Route Updates**
   - Updated auth routes for Supabase token verification
   - All other routes now use Supabase service

## Database Schema

The new PostgreSQL schema includes:

- **users** - User profiles (extends Supabase auth.users)
- **streams** - Research streams/topics
- **messages** - Chat messages
- **newsletters** - Generated research reports
- **research_sessions** - Research tracking
- **scheduled_tasks** - Automated scheduling

All tables have:

- UUID primary keys
- Row Level Security (RLS) policies
- Proper foreign key relationships
- Automatic timestamps

## Security

### Row Level Security (RLS)

All tables have RLS policies ensuring:

- Users can only access their own data
- Proper foreign key validation
- Server-side enforcement

### Authentication

- JWT tokens are managed by Supabase
- Automatic token refresh
- Secure session management
- Configurable auth providers

## Migration Steps

If migrating from existing SQLite data:

1. Export existing data from SQLite
2. Transform to match new schema (camelCase → snake_case)
3. Import via Supabase dashboard or API
4. Verify data integrity
5. Test authentication flows

## Development

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. The frontend will be available at `http://localhost:3000`
3. The backend will be available at `http://localhost:5000`

### Testing

1. Create a test user through the registration form
2. Verify data appears in Supabase dashboard
3. Test CRUD operations for streams and messages
4. Verify RLS policies are working

## Production Deployment

1. Update environment variables with production URLs
2. Configure Supabase auth settings for production domain
3. Set up proper CORS policies
4. Enable database backups
5. Monitor usage and performance

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Check that policies allow the intended operations
2. **Auth Token Issues**: Verify Supabase URL and keys are correct
3. **CORS Errors**: Check Supabase CORS settings and API configuration
4. **Database Connection**: Verify service role key has proper permissions

### Debug Tips

1. Check Supabase logs in the dashboard
2. Use browser dev tools to inspect network requests
3. Test API endpoints directly with curl or Postman
4. Verify environment variables are loaded correctly

## Benefits of Migration

1. **Scalability**: PostgreSQL scales better than SQLite
2. **Security**: Built-in RLS and auth management
3. **Real-time**: Supabase real-time subscriptions
4. **Maintenance**: Managed database and auth
5. **Features**: Built-in admin dashboard, logs, and monitoring
