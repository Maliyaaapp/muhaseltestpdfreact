-- COMPLETE FIX FOR ALL SETTINGS TABLE PGRST204 ERRORS
-- This script fixes the settings table schema to match application expectations
-- Updated to remove obsolete stamp fields and keep only actively used fields
-- Run this in your Supabase SQL Editor

-- Add ALL missing columns to settings table (excluding obsolete stamp fields)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS english_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone_call TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_installments INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tuition_fee_category TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS transportation_fee_one_way NUMERIC(10,2);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS transportation_fee_two_way NUMERIC(10,2);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_format TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_counter INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_prefix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_suffix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_start INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_current INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_number_year INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_receipt_watermark BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_student_report_watermark BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_logo_background BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_signature_on_receipt BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_signature_on_student_report BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_signature_on_installment_report BOOLEAN;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_signature_on_partial_payment BOOLEAN;
-- Note: show_stamp_on_receipt removed as stamp functionality has been disabled in the app
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_footer_in_receipts BOOLEAN;
-- Note: show_footer removed as it's not used in the current settings UI
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_counter INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_format TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_prefix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_suffix TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_start INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_current INTEGER;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS installment_receipt_number_year INTEGER;

-- Set default values for existing records to ensure school info appears correctly
UPDATE settings SET 
  name = COALESCE(name, 'اسم المدرسة'),
  address = COALESCE(address, ''),
  logo = COALESCE(logo, ''),
  english_name = COALESCE(english_name, 'School Name'),
  email = COALESCE(email, ''),
  phone = COALESCE(phone, ''),
  phone_whatsapp = COALESCE(phone_whatsapp, ''),
  phone_call = COALESCE(phone_call, ''),
  default_installments = COALESCE(default_installments, 4),
  tuition_fee_category = COALESCE(tuition_fee_category, 'رسوم دراسية'),
  transportation_fee_one_way = COALESCE(transportation_fee_one_way, 150),
  transportation_fee_two_way = COALESCE(transportation_fee_two_way, 300),
  receipt_number_format = COALESCE(receipt_number_format, 'auto'),
  receipt_number_counter = COALESCE(receipt_number_counter, 1),
  receipt_number_prefix = COALESCE(receipt_number_prefix, ''),
  receipt_number_suffix = COALESCE(receipt_number_suffix, ''),
  receipt_number_start = COALESCE(receipt_number_start, 1),
  receipt_number_current = COALESCE(receipt_number_current, 1),
  receipt_number_year = COALESCE(receipt_number_year, EXTRACT(YEAR FROM NOW())),
  show_receipt_watermark = COALESCE(show_receipt_watermark, TRUE),
  show_student_report_watermark = COALESCE(show_student_report_watermark, TRUE),
  show_logo_background = COALESCE(show_logo_background, TRUE),
  show_signature_on_receipt = COALESCE(show_signature_on_receipt, TRUE),
  show_signature_on_student_report = COALESCE(show_signature_on_student_report, TRUE),
  show_signature_on_installment_report = COALESCE(show_signature_on_installment_report, TRUE),
  show_signature_on_partial_payment = COALESCE(show_signature_on_partial_payment, TRUE),
  show_footer_in_receipts = COALESCE(show_footer_in_receipts, TRUE),
  installment_receipt_number_counter = COALESCE(installment_receipt_number_counter, 1),
  installment_receipt_number_format = COALESCE(installment_receipt_number_format, 'auto'),
  installment_receipt_number_prefix = COALESCE(installment_receipt_number_prefix, ''),
  installment_receipt_number_suffix = COALESCE(installment_receipt_number_suffix, ''),
  installment_receipt_number_start = COALESCE(installment_receipt_number_start, 1),
  installment_receipt_number_current = COALESCE(installment_receipt_number_current, 1),
  installment_receipt_number_year = COALESCE(installment_receipt_number_year, EXTRACT(YEAR FROM NOW()));

-- Create default settings for schools that don't have any settings record
-- This ensures school info and logo will appear in receipts
INSERT INTO settings (
  school_id, name, email, phone, address, logo, english_name,
  default_installments, tuition_fee_category, transportation_fee_one_way, transportation_fee_two_way,
  receipt_number_format, receipt_number_counter, receipt_number_prefix, receipt_number_suffix,
  receipt_number_start, receipt_number_current, receipt_number_year,
  show_receipt_watermark, show_student_report_watermark, show_logo_background,
  show_signature_on_receipt, show_signature_on_student_report, show_signature_on_installment_report,
  show_signature_on_partial_payment, show_footer_in_receipts,
  installment_receipt_number_counter, installment_receipt_number_format,
  installment_receipt_number_prefix, installment_receipt_number_suffix,
  installment_receipt_number_start, installment_receipt_number_current, installment_receipt_number_year
)
SELECT 
  s.id as school_id,
  COALESCE(s.name, 'اسم المدرسة') as name,
  COALESCE(s.email, '') as email,
  COALESCE(s.phone, '') as phone,
  COALESCE(s.address, '') as address,
  COALESCE(s.logo, '') as logo,
  COALESCE(s.english_name, 'School Name') as english_name,
  4 as default_installments,
  'رسوم دراسية' as tuition_fee_category,
  150 as transportation_fee_one_way,
  300 as transportation_fee_two_way,
  'auto' as receipt_number_format,
  1 as receipt_number_counter,
  '' as receipt_number_prefix,
  '' as receipt_number_suffix,
  1 as receipt_number_start,
  1 as receipt_number_current,
  EXTRACT(YEAR FROM NOW()) as receipt_number_year,
  TRUE as show_receipt_watermark,
  TRUE as show_student_report_watermark,
  TRUE as show_logo_background,
  TRUE as show_signature_on_receipt,
  TRUE as show_signature_on_student_report,
  TRUE as show_signature_on_installment_report,
  TRUE as show_signature_on_partial_payment,
  TRUE as show_footer_in_receipts,
  1 as installment_receipt_number_counter,
  'auto' as installment_receipt_number_format,
  '' as installment_receipt_number_prefix,
  '' as installment_receipt_number_suffix,
  1 as installment_receipt_number_start,
  1 as installment_receipt_number_current,
  EXTRACT(YEAR FROM NOW()) as installment_receipt_number_year
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM settings st WHERE st.school_id = s.id
)
ON CONFLICT (school_id) DO NOTHING;

-- CRITICAL: Reload PostgREST schema cache to recognize all new columns
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND column_name IN (
  'name', 'email', 'phone', 'address', 'logo', 'english_name',
  'installment_receipt_number_format', 'receipt_number_format',
  'show_logo_background', 'default_installments', 'show_footer_in_receipts'
)
ORDER BY column_name;

-- Success message
SELECT 'Settings table schema has been updated to match current app usage! Removed obsolete stamp fields and show_footer.' as status;