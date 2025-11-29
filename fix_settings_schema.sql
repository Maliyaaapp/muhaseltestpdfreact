-- Fix settings table schema to match application expectations
-- This script updates the settings table from JSONB structure to individual columns

-- First, backup existing settings data
CREATE TABLE IF NOT EXISTS settings_backup AS SELECT * FROM settings;

-- Drop the old settings table
DROP TABLE IF EXISTS settings CASCADE;

-- Create the new settings table with proper column structure
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'اسم المدرسة',
  email TEXT NOT NULL DEFAULT '',
  english_name TEXT DEFAULT 'School Name',
  phone TEXT NOT NULL DEFAULT '',
  phone_whatsapp TEXT DEFAULT '',
  phone_call TEXT DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',

  default_installments INTEGER NOT NULL DEFAULT 4,
  tuition_fee_category TEXT NOT NULL DEFAULT 'رسوم دراسية',
  transportation_fee_one_way NUMERIC(10, 2) NOT NULL DEFAULT 150,
  transportation_fee_two_way NUMERIC(10, 2) NOT NULL DEFAULT 300,
  receipt_number_format TEXT DEFAULT 'auto',
  receipt_number_counter INTEGER DEFAULT 1,
  receipt_number_prefix TEXT DEFAULT '',
  receipt_number_suffix TEXT DEFAULT '',
  receipt_number_start INTEGER DEFAULT 1,
  receipt_number_current INTEGER DEFAULT 1,
  show_receipt_watermark BOOLEAN DEFAULT TRUE,
  show_student_report_watermark BOOLEAN DEFAULT TRUE,
  show_logo_background BOOLEAN DEFAULT TRUE,
  show_signature_on_receipt BOOLEAN DEFAULT TRUE,
  show_signature_on_student_report BOOLEAN DEFAULT TRUE,
  show_signature_on_installment_report BOOLEAN DEFAULT TRUE,
  show_signature_on_partial_payment BOOLEAN DEFAULT TRUE,
  show_stamp_on_receipt BOOLEAN DEFAULT TRUE,
  show_footer_in_receipts BOOLEAN DEFAULT TRUE,
  show_footer BOOLEAN DEFAULT TRUE,
  installment_receipt_number_counter INTEGER DEFAULT 1,
  installment_receipt_number_format TEXT DEFAULT 'auto',
  installment_receipt_number_prefix TEXT DEFAULT '',
  installment_receipt_number_suffix TEXT DEFAULT '',
  installment_receipt_number_start INTEGER DEFAULT 1,
  installment_receipt_number_current INTEGER DEFAULT 1,
  receipt_number_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  installment_receipt_number_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Enable RLS on the new settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Users can view settings in their school" ON settings
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      -- Admin users can see all settings
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      -- School users can see settings in their school
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage settings in their school" ON settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      -- Admin users can manage all settings
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      -- School users can manage settings in their school
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Create index for performance
CREATE INDEX idx_settings_school_id ON settings(school_id);

-- Insert default settings for existing schools that don't have settings
INSERT INTO settings (school_id, name, email, phone, address, logo)
SELECT 
  s.id as school_id,
  s.name,
  COALESCE(s.email, '') as email,
  COALESCE(s.phone, '') as phone,
  COALESCE(s.address, '') as address,
  COALESCE(s.logo, '') as logo
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM settings st WHERE st.school_id = s.id
)
ON CONFLICT (school_id) DO NOTHING;

-- Clean up backup table (optional - comment out if you want to keep the backup)
-- DROP TABLE IF EXISTS settings_backup;