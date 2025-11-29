-- Add receipt_number column to fees table if it doesn't exist

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'fees' 
        AND column_name = 'receipt_number'
    ) THEN
        ALTER TABLE fees ADD COLUMN receipt_number TEXT;
        RAISE NOTICE 'Added receipt_number column to fees table';
    ELSE
        RAISE NOTICE 'receipt_number column already exists';
    END IF;
END $$;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Receipt number column added successfully!' as result;
