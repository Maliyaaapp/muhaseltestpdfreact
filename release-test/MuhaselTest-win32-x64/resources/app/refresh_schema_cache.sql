-- REFRESH POSTGREST SCHEMA CACHE
-- This script refreshes the PostgREST schema cache to recognize all table columns
-- Run this in your Supabase SQL Editor to fix PGRST204 errors

-- Step 1: Check if receipt_number column exists in installments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'installments' 
    AND column_name = 'receipt_number'
  ) THEN
    RAISE NOTICE 'Adding receipt_number column to installments table';
    ALTER TABLE installments ADD COLUMN receipt_number TEXT;
  ELSE
    RAISE NOTICE 'receipt_number column already exists in installments table';
  END IF;
END $$;

-- Step 2: Check if receipt_number column exists in fees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fees' 
    AND column_name = 'receipt_number'
  ) THEN
    RAISE NOTICE 'Adding receipt_number column to fees table';
    ALTER TABLE fees ADD COLUMN receipt_number TEXT;
  ELSE
    RAISE NOTICE 'receipt_number column already exists in fees table';
  END IF;
END $$;

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify columns exist
SELECT 
  'installments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'installments' 
AND column_name IN ('receipt_number', 'paid_amount', 'paid_date', 'payment_method', 'payment_note')
ORDER BY column_name;

SELECT 
  'fees' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'fees' 
AND column_name IN ('receipt_number', 'payment_method', 'payment_note', 'check_number', 'check_date')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=== SCHEMA CACHE REFRESH COMPLETED ==='; 
  RAISE NOTICE 'PostgREST schema cache has been refreshed.';
  RAISE NOTICE 'All receipt_number columns should now be recognized.';
  RAISE NOTICE 'Try your payment operation again.';
END $$;