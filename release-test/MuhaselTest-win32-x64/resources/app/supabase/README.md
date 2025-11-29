# Supabase Integration for Muhasel

This directory contains the necessary files for integrating Supabase with the Muhasel School Finance Management System.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Note your project URL and anon key (public API key)

### 2. Set Up Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Initialize the Database Schema

1. In your Supabase project dashboard, go to the SQL Editor
2. Copy the contents of `schema.sql` from this directory
3. Paste and run the SQL in the Supabase SQL Editor

### 4. Authentication Setup

1. In your Supabase dashboard, go to Authentication → Settings
2. Configure your authentication providers as needed
3. For email/password authentication:
   - Enable Email provider
   - Configure email templates
   - Set up SMTP settings if needed

## Hybrid API Usage

The application uses a hybrid API approach that:

1. Uses Supabase when online
2. Falls back to local storage when offline
3. Syncs data when connection is restored

Key files for this implementation:

- `src/services/supabase.ts` - Supabase client configuration
- `src/services/hybridApi.ts` - Hybrid API implementation
- `src/types/supabase.ts` - TypeScript types for Supabase tables

## Data Synchronization

When the application is offline:

1. All operations are stored in local storage
2. A sync queue tracks pending operations
3. When the application comes back online, the sync queue is processed
4. Data is synchronized with Supabase

## Row Level Security

The schema includes Row Level Security (RLS) policies to ensure data is properly secured:

- Admins can access all data
- School admins can only access their school's data
- Grade managers can only access their assigned grades

## Troubleshooting

- If you encounter connection issues, check your environment variables
- For data synchronization problems, check the browser console for errors
- Make sure your Supabase project is on the correct plan for your usage needs
- If you encounter PGRST204 errors ("Could not find column in schema cache"), you need to reload the PostgREST schema cache by executing this SQL command in the Supabase SQL Editor:
  ```sql
  NOTIFY pgrst, 'reload schema';
  ```
- This command is included at the end of the schema files, but you may need to run it manually after making schema changes