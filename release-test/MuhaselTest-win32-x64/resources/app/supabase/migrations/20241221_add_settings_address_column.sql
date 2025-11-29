-- Migration to fix PGRST204 error by adding missing address column to settings table
-- This addresses the "Could not find the 'address' column of 'settings' in the schema cache" error

-- Add missing address column to settings table if it doesn't exist
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;

-- Update the column to be NOT NULL with a default value for existing records
UPDATE settings SET address = '' WHERE address IS NULL;
ALTER TABLE settings ALTER COLUMN address SET NOT NULL;

-- Add other potentially missing columns that might be referenced
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';