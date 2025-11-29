-- Add missing defaultInstallments column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_installments INTEGER;

-- Update existing settings records to have a default value if null
UPDATE settings SET default_installments = 10 WHERE default_installments IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE settings ALTER COLUMN default_installments SET NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';