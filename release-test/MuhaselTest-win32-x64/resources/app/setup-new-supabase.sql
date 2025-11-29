-- Complete Supabase Setup Script for New Project
-- This script sets up the entire database schema for the Muhasel School Finance Management System
-- Run this in your new Supabase project's SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schools table (matching dataStore.ts School interface)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  english_name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_whatsapp TEXT,
  phone_call TEXT,
  address TEXT NOT NULL,
  location TEXT,
  active BOOLEAN DEFAULT TRUE,
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  logo TEXT,
  payment NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create accounts table (matching AccountForm.tsx fields)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  grade_levels TEXT[] DEFAULT '{}',
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  english_name TEXT,
  student_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  english_grade TEXT,
  division TEXT,
  parent_name TEXT NOT NULL,
  parent_email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  transportation TEXT NOT NULL,
  transportation_direction TEXT,
  transportation_fee NUMERIC(10, 2),
  custom_transportation_fee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

-- Create fees table
CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  division TEXT,
  fee_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0,
  paid NUMERIC(10, 2) DEFAULT 0,
  balance NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  transportation_type TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_note TEXT,
  check_number TEXT,
  check_date TIMESTAMP WITH TIME ZONE,
  bank_name_arabic TEXT,
  bank_name_english TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create installments table (matching dataStore.ts Installment interface)
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  fee_type TEXT,
  note TEXT,
  installment_count INTEGER,
  installment_number INTEGER,
  installment_month TEXT,
  paid_amount NUMERIC(10, 2),
  discount NUMERIC(10, 2),
  payment_method TEXT,
  payment_note TEXT,
  check_number TEXT,
  check_date TIMESTAMP WITH TIME ZONE,
  bank_name_arabic TEXT,
  bank_name_english TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (matching dataStore.ts Message interface)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  template TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table (matching dataStore.ts Settings interface)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  english_name TEXT,
  phone TEXT NOT NULL,
  phone_whatsapp TEXT,
  phone_call TEXT,
  address TEXT NOT NULL,
  logo TEXT NOT NULL,
  default_installments INTEGER NOT NULL,
  tuition_fee_category TEXT NOT NULL,
  transportation_fee_one_way NUMERIC(10, 2) NOT NULL,
  transportation_fee_two_way NUMERIC(10, 2) NOT NULL,
  receipt_number_format TEXT,
  receipt_number_counter INTEGER,
  receipt_number_prefix TEXT,
  show_logo_background BOOLEAN DEFAULT TRUE,
  installment_receipt_number_counter INTEGER,
  installment_receipt_number_format TEXT,
  installment_receipt_number_prefix TEXT,
  receipt_number_year INTEGER,
  installment_receipt_number_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Create templates table (matching dataStore.ts Template interface)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT '{}',
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key_hash)
);

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Schools policies - ONLY ADMINS can manage schools
CREATE POLICY "Admins can view all schools" ON schools
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can create schools" ON schools
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update schools" ON schools
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete schools" ON schools
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can view schools" ON schools
  FOR SELECT USING (true);

-- Accounts policies
CREATE POLICY "Service role full access" 
  ON accounts 
  FOR ALL 
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own account" 
  ON accounts 
  FOR SELECT 
  USING (auth.role() = 'authenticated' AND id = auth.uid());

-- Students policies
CREATE POLICY "Users can view students in their school" ON students
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage students in their school" ON students
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Fees policies
CREATE POLICY "Users can view fees in their school" ON fees
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage fees in their school" ON fees
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Installments policies
CREATE POLICY "Users can view installments in their school" ON installments
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage installments in their school" ON installments
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their school" ON messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage messages in their school" ON messages
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Settings policies
CREATE POLICY "Users can view settings in their school" ON settings
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage settings in their school" ON settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Templates policies
CREATE POLICY "Users can view templates in their school" ON templates
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage templates in their school" ON templates
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- API Keys policies
CREATE POLICY "Admins can view all API keys" ON api_keys
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'superadmin'
  );

CREATE POLICY "School admins can view their school API keys" ON api_keys
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'school_admin' AND
     school_id::text = auth.jwt() ->> 'school_id')
  );

CREATE POLICY "Admins can create API keys" ON api_keys
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'superadmin' OR
    (auth.jwt() ->> 'role' = 'school_admin' AND
     school_id::text = auth.jwt() ->> 'school_id')
  );

CREATE POLICY "Admins can update API keys" ON api_keys
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'superadmin' OR
    (auth.jwt() ->> 'role' = 'school_admin' AND
     school_id::text = auth.jwt() ->> 'school_id')
  );

CREATE POLICY "Admins can delete API keys" ON api_keys
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'superadmin' OR
    (auth.jwt() ->> 'role' = 'school_admin' AND
     school_id::text = auth.jwt() ->> 'school_id')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_school_id ON accounts(school_id);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_id_role ON accounts(id, role);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_school_id ON fees(school_id);
CREATE INDEX IF NOT EXISTS idx_fees_student_id ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_school_id ON installments(school_id);
CREATE INDEX IF NOT EXISTS idx_installments_student_id ON installments(student_id);
CREATE INDEX IF NOT EXISTS idx_installments_fee_id ON installments(fee_id);
CREATE INDEX IF NOT EXISTS idx_messages_school_id ON messages(school_id);
CREATE INDEX IF NOT EXISTS idx_messages_student_id ON messages(student_id);
CREATE INDEX IF NOT EXISTS idx_settings_school_id ON settings(school_id);
CREATE INDEX IF NOT EXISTS idx_templates_school_id ON templates(school_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_school_id ON api_keys(school_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_installments_updated_at BEFORE UPDATE ON installments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database schema setup completed successfully! All tables, policies, indexes, and triggers have been created.' as status;