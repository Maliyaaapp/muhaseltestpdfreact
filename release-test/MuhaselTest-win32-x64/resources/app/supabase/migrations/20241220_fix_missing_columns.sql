-- Migration to fix PGRST204 errors by adding missing columns
-- This addresses the transportationType and paid_date column issues

-- Add missing transportation_type column to fees table if it doesn't exist
ALTER TABLE fees ADD COLUMN IF NOT EXISTS transportation_type TEXT;

-- Add missing discount column to installments table if it doesn't exist
ALTER TABLE installments ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2);

-- Ensure paid_date column exists in installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;

-- Ensure installment_number column exists in installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_number INTEGER;

-- Add any other potentially missing columns for completeness
ALTER TABLE fees ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS bank_name_english TEXT;

ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_month TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_english TEXT;

-- Reload PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';