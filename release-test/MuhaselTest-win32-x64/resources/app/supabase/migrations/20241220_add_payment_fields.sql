-- Add missing payment-related fields to fees and installments tables
-- This migration adds support for check number, check date, and bank names

-- Add missing fields to fees table
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT,
ADD COLUMN IF NOT EXISTS bank_name_english TEXT;

-- Add missing fields to installments table
ALTER TABLE installments 
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT,
ADD COLUMN IF NOT EXISTS bank_name_english TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';