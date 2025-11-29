-- FIX INSTALLMENTS TABLE SCHEMA - ADD MISSING COLUMNS
-- This script adds all missing columns to the installments table to fix PGRST204 errors
-- Run this in your Supabase SQL Editor

-- Add missing payment-related columns to installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS payment_note TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_date DATE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_english TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;

-- Ensure other commonly used columns exist
ALTER TABLE installments ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS fee_id TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS fee_type TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_count INTEGER;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_month TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE installments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set default values for existing records
UPDATE installments SET 
  paid_amount = COALESCE(paid_amount, 0),
  discount = COALESCE(discount, 0),
  payment_method = COALESCE(payment_method, 'cash'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE paid_amount IS NULL OR discount IS NULL OR payment_method IS NULL OR created_at IS NULL OR updated_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_installments_student_id ON installments(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_fee_id ON installments(fee_id);
CREATE INDEX IF NOT EXISTS idx_installments_school_id ON installments(school_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);

-- CRITICAL: Reload PostgREST schema cache to recognize all new columns
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'installments' 
AND column_name IN (
  'paid_amount', 'paid_date', 'payment_method', 'payment_note',
  'check_number', 'check_date', 'bank_name_arabic', 'bank_name_english',
  'receipt_number', 'discount', 'student_id', 'fee_id'
)
ORDER BY column_name;

-- Success message
SELECT 'Installments table schema has been updated! All missing columns added.' as status;