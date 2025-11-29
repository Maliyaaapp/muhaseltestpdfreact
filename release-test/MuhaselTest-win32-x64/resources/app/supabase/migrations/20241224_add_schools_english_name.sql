-- Migration to fix PGRST204 error by adding missing english_name column to schools table
-- This addresses the "Could not find the 'englishName' column of 'schools' in the schema cache" error

-- Add missing english_name column to schools table if it doesn't exist
ALTER TABLE schools ADD COLUMN IF NOT EXISTS english_name TEXT;

-- Add other potentially missing columns that might be referenced in school updates
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone_call TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS payment NUMERIC(10, 2);

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'schools' 
AND column_name IN ('english_name', 'phone_whatsapp', 'phone_call', 'logo', 'payment')
ORDER BY column_name;

-- Success message
SELECT 'Schools table schema has been updated! Missing columns added and schema cache reloaded.' as status;