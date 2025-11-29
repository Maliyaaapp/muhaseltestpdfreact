-- Migration to add missing 'note' column to installments table
-- This fixes the PGRST204 error where note field was not found in schema cache

-- Add the missing note column to installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS note TEXT;

-- Reload PostgREST schema cache to recognize the new column
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Note column added to installments table successfully!' as status;