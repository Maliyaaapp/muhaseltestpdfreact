-- Add missing division column to fees table
ALTER TABLE fees ADD COLUMN IF NOT EXISTS division TEXT;

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';