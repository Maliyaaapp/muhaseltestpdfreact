-- COMPLETE FIX FOR SETTINGS TABLE PGRST204 ERRORS
-- This script adds ALL missing columns and fixes the schema issues
-- Run this in your Supabase SQL Editor

-- Add all missing columns to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_installments INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tuition_fee_category TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS transportation_fee_one_way NUMERIC(10,2);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS transportation_fee_two_way NUMERIC(10,2);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_prefix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_suffix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_start INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_current INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_prefix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_suffix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_start INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_current INTEGER;

-- Set default values for existing records
UPDATE settings SET 
  address = COALESCE(address, ''),
  logo = COALESCE(logo, ''),
  english_name = COALESCE(english_name, ''),
  email = COALESCE(email, ''),
  phone_whatsapp = COALESCE(phone_whatsapp, ''),
  phone_call = COALESCE(phone_call, ''),
  default_installments = COALESCE(default_installments, 10),
  tuition_fee_category = COALESCE(tuition_fee_category, 'رسوم دراسية'),
  transportation_fee_one_way = COALESCE(transportation_fee_one_way, 0),
  transportation_fee_two_way = COALESCE(transportation_fee_two_way, 0),
  receipt_number_prefix = COALESCE(receipt_number_prefix, 'R'),
  receipt_number_suffix = COALESCE(receipt_number_suffix, ''),
  receipt_number_start = COALESCE(receipt_number_start, 1),
  receipt_number_current = COALESCE(receipt_number_current, 1),
  installment_receipt_number_prefix = COALESCE(installment_receipt_number_prefix, 'IR'),
  installment_receipt_number_suffix = COALESCE(installment_receipt_number_suffix, ''),
  installment_receipt_number_start = COALESCE(installment_receipt_number_start, 1),
  installment_receipt_number_current = COALESCE(installment_receipt_number_current, 1)
WHERE 
  address IS NULL OR 
  logo IS NULL OR 
  english_name IS NULL OR 
  email IS NULL OR 
  phone_whatsapp IS NULL OR 
  phone_call IS NULL OR 
  default_installments IS NULL OR
  tuition_fee_category IS NULL OR
  transportation_fee_one_way IS NULL OR
  transportation_fee_two_way IS NULL OR
  receipt_number_prefix IS NULL OR
  receipt_number_suffix IS NULL OR
  receipt_number_start IS NULL OR
  receipt_number_current IS NULL OR
  installment_receipt_number_prefix IS NULL OR
  installment_receipt_number_suffix IS NULL OR
  installment_receipt_number_start IS NULL OR
  installment_receipt_number_current IS NULL;

-- Make critical columns NOT NULL
ALTER TABLE settings ALTER COLUMN address SET NOT NULL;
ALTER TABLE settings ALTER COLUMN logo SET NOT NULL;
ALTER TABLE settings ALTER COLUMN default_installments SET NOT NULL;

-- CRITICAL: Reload PostgREST schema cache to recognize all new columns
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'settings' 
ORDER BY column_name;

-- Success message
SELECT 'Settings table schema has been successfully updated with all missing columns!' as status;