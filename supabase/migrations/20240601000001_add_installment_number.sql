-- Migration to add missing installment_number column to installments table
-- This fixes the PGRST204 error where installmentNumber field was not found

-- Add the missing installment_number column
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_number INTEGER;

-- Reload PostgREST schema cache to recognize the new column
NOTIFY pgrst, 'reload schema';