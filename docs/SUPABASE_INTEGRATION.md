# Supabase Integration for Muhasel

This document provides detailed information about the Supabase integration in the Muhasel School Finance Management System.

## Overview

Muhasel now supports a hybrid API approach that:

1. Uses Supabase for cloud storage when online
2. Falls back to local storage when offline
3. Automatically synchronizes data when connection is restored

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
2. Copy the contents of `supabase/schema.sql` from this repository
3. Paste and run the SQL in the Supabase SQL Editor

## Architecture

### Key Components

1. **Supabase Client Configuration** (`src/services/supabase.ts`)
   - Initializes the Supabase client
   - Provides utility functions to check online status and Supabase configuration

2. **Hybrid API Service** (`src/services/hybridApi.ts`)
   - Implements CRUD operations that work with both Supabase and local storage
   - Maintains a sync queue for offline operations
   - Automatically processes the sync queue when connection is restored

3. **Type Definitions** (`src/types/supabase.ts`)
   - TypeScript types for Supabase database schema

4. **UI Components**
   - `SupabaseSyncStatus.tsx` - Shows sync status and pending changes
   - `SupabaseMigration.tsx` - Helps migrate existing data to Supabase

### Data Flow

1. **Online Mode**:
   - API calls go directly to Supabase
   - Data is stored in both Supabase and local storage

2. **Offline Mode**:
   - API calls use local storage
   - Operations are added to a sync queue

3. **Reconnection**:
   - Sync queue is processed
   - Local changes are pushed to Supabase

## Migration

When you first set up Supabase, you'll need to migrate your existing data. The application includes a migration tool that will:

1. Check if migration is needed
2. Display a migration dialog
3. Transfer all local data to Supabase

The migration process is handled by `src/scripts/migrateToSupabase.ts` and the UI component `src/components/SupabaseMigration.tsx`.

## Security

The Supabase schema includes Row Level Security (RLS) policies to ensure data is properly secured:

- Admins can access all data
- School admins can only access their school's data
- Grade managers can only access their assigned grades

## Troubleshooting

### Common Issues

1. **Connection Problems**
   - Check that your Supabase URL and anon key are correct in the `.env` file
   - Verify your internet connection

2. **Sync Failures**
   - Check the browser console for detailed error messages
   - Verify that your Supabase schema matches the expected structure

3. **Migration Issues**
   - If migration fails, check the error details in the migration dialog
   - You can retry the migration by refreshing the application

4. **Schema Cache Errors (PGRST204)**
   - If you encounter errors like "Could not find column in schema cache", you need to reload the PostgREST schema cache
   - Execute this SQL command in the Supabase SQL Editor:
     ```sql
     NOTIFY pgrst, 'reload schema';
     ```
   - This is particularly important after making schema changes or when columns appear to be missing

### Debugging

The application includes extensive logging for Supabase operations. Check the browser console for:

- Connection status changes
- Sync queue operations
- API call results

## Development

### Adding New Tables

If you need to add new tables to the schema:

1. Update the SQL schema in `supabase/schema.sql`
2. Add corresponding types to `src/types/supabase.ts`
3. Add API functions to `src/services/hybridApi.ts`

### Testing Offline Mode

You can test offline functionality by:

1. Using the browser's network tab to simulate offline mode
2. Disconnecting from the internet
3. Temporarily changing the Supabase URL to an invalid value

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Types with Supabase](https://supabase.com/docs/reference/javascript/typescript-support)
- [Offline-First Web Applications](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Offline_Service_workers)