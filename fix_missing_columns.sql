-- COMPREHENSIVE FIX FOR MISSING COLUMNS CAUSING PGRST204 ERRORS
-- This script adds the missing columns that are causing the current errors
-- Run this in your Supabase SQL Editor

-- Add missing 'includes_transportation' column to fees table
ALTER TABLE fees ADD COLUMN IF NOT EXISTS includes_transportation BOOLEAN;

-- Set default value for existing records
UPDATE fees SET includes_transportation = false WHERE includes_transportation IS NULL;

-- Add missing 'installment_receipt_number_counter' column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_counter INTEGER;

-- Set default value for existing records
UPDATE settings SET installment_receipt_number_counter = 1 WHERE installment_receipt_number_counter IS NULL;

-- Make the counter column NOT NULL after setting default values
ALTER TABLE settings ALTER COLUMN installment_receipt_number_counter SET NOT NULL;

-- CRITICAL: Reload PostgREST schema cache to recognize all new columns
NOTIFY pgrst, 'reload schema';

-- Verify the changes for fees table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fees' AND column_name = 'includes_transportation'
ORDER BY column_name;

-- Verify the changes for settings table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name = 'installment_receipt_number_counter'
ORDER BY column_name;

-- Success message
SELECT 'Missing columns have been successfully added to fix PGRST204 errors!' as status;