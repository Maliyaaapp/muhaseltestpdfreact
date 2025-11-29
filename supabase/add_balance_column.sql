-- Add missing balance column to installments table
-- This fixes the PGRST204 error: "Could not find the 'balance' column of 'installments' in the schema cache"

-- Add balance column to installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0;

-- Add balance column to fees table if it doesn't exist
ALTER TABLE fees ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0;

-- Update existing installments to calculate their balance
UPDATE installments 
SET balance = amount - COALESCE(paid_amount, 0)
WHERE balance IS NULL OR balance = 0;

-- Update existing fees to calculate their balance
UPDATE fees 
SET balance = (amount - COALESCE(discount, 0)) - COALESCE(paid, 0)
WHERE balance IS NULL;

-- Refresh PostgREST schema cache to recognize the new column
NOTIFY pgrst, 'reload schema';

-- Verify the balance column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'installments' AND column_name = 'balance'
ORDER BY column_name;

-- Success message
SELECT 'Balance column added successfully to installments and fees tables!' as message;