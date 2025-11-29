-- =====================================================
-- ENSURE RECEIPT NUMBER COLUMNS EXIST
-- Run this script to ensure receipt_number columns exist
-- in both fees and installments tables
-- =====================================================

-- Add receipt_number column to fees table if not exists
ALTER TABLE fees ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Add receipt_number column to installments table if not exists
ALTER TABLE installments ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Ensure settings table has all receipt number related columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_format TEXT DEFAULT 'auto';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_counter INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_prefix TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());

ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_format TEXT DEFAULT 'auto';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_counter INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_prefix TEXT DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());

-- Update existing settings records with default values if null
UPDATE settings SET
  receipt_number_format = COALESCE(receipt_number_format, 'auto'),
  receipt_number_counter = COALESCE(receipt_number_counter, 1),
  receipt_number_prefix = COALESCE(receipt_number_prefix, ''),
  receipt_number_year = COALESCE(receipt_number_year, EXTRACT(YEAR FROM NOW())),
  installment_receipt_number_format = COALESCE(installment_receipt_number_format, 'auto'),
  installment_receipt_number_counter = COALESCE(installment_receipt_number_counter, 1),
  installment_receipt_number_prefix = COALESCE(installment_receipt_number_prefix, ''),
  installment_receipt_number_year = COALESCE(installment_receipt_number_year, EXTRACT(YEAR FROM NOW()));

-- Notify schema cache to refresh
NOTIFY pgrst, 'reload schema';

-- Verify columns exist
SELECT 
  'fees' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'fees' AND column_name = 'receipt_number'
UNION ALL
SELECT 
  'installments' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'installments' AND column_name = 'receipt_number';
