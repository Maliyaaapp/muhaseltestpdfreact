-- Supabase SQL schema for Muhasel School Finance Management System
-- Updated to match actual application implementation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  school_id UUID,
  school_name TEXT,
  school_logo TEXT,
  grade_levels TEXT[] DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schools table
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
  default_installments INTEGER DEFAULT 1,
  tuition_fee_category TEXT DEFAULT 'Tuition Fee',
  transportation_fee_one_way NUMERIC(10, 2) DEFAULT 0,
  transportation_fee_two_way NUMERIC(10, 2) DEFAULT 0,
  receipt_number_format TEXT,
  receipt_number_counter INTEGER DEFAULT 1,
  receipt_number_prefix TEXT,
  show_receipt_watermark BOOLEAN DEFAULT TRUE,
  show_student_report_watermark BOOLEAN DEFAULT TRUE,
  show_logo_background BOOLEAN DEFAULT TRUE,
  show_signature_on_receipt BOOLEAN DEFAULT TRUE,
  show_signature_on_student_report BOOLEAN DEFAULT TRUE,
  show_signature_on_installment_report BOOLEAN DEFAULT TRUE,
  show_signature_on_partial_payment BOOLEAN DEFAULT TRUE,
  installment_receipt_number_counter INTEGER DEFAULT 1,
  installment_receipt_number_format TEXT,
  installment_receipt_number_prefix TEXT,
  receipt_number_year INTEGER,
  installment_receipt_number_year INTEGER,
  payment NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  parent_email TEXT, -- Optional field as used in app
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create installments table
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  paid NUMERIC(10, 2) DEFAULT 0,
  balance NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  payment_note TEXT,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  financial_settings JSONB DEFAULT '{}'::jsonb,
  display_settings JSONB DEFAULT '{}'::jsonb,
  receipt_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id)
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts
CREATE POLICY "Admins can see all accounts" ON accounts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND role = 'admin'
    )
  );

CREATE POLICY "School admins can see their school accounts" ON accounts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND role = 'schoolAdmin'
    ) AND
    (school_id IN (
      SELECT school_id FROM accounts WHERE email = auth.email()
    ) OR role = 'admin')
  );

CREATE POLICY "Users can update their own account" ON accounts
  FOR UPDATE USING (auth.email() = email);

CREATE POLICY "Admins can insert accounts" ON accounts
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND role = 'admin'
    )
  );

-- Create policies for schools
CREATE POLICY "Admins can manage all schools" ON schools
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND role = 'admin'
    )
  );

CREATE POLICY "School admins can see their school" ON schools
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = schools.id
    )
  );

CREATE POLICY "School admins can update their school" ON schools
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND role = 'schoolAdmin' AND school_id = schools.id
    )
  );

-- Create policies for students
CREATE POLICY "School users can manage their students" ON students
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = students.school_id
    )
  );

-- Create policies for fees
CREATE POLICY "School users can manage their fees" ON fees
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = fees.school_id
    )
  );

-- Create policies for installments
CREATE POLICY "School users can manage their installments" ON installments
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = installments.school_id
    )
  );

-- Create policies for messages
CREATE POLICY "School users can manage their messages" ON messages
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = messages.school_id
    )
  );

-- Create policies for settings
CREATE POLICY "School users can manage their settings" ON settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = settings.school_id
    )
  );

-- Create policies for templates
CREATE POLICY "School users can manage their templates" ON templates
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = templates.school_id
    )
  );

-- Create indexes for performance
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_school_id ON accounts(school_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_fees_school_id ON fees(school_id);
CREATE INDEX idx_fees_student_id ON fees(student_id);
CREATE INDEX idx_installments_school_id ON installments(school_id);
CREATE INDEX idx_installments_student_id ON installments(student_id);
CREATE INDEX idx_installments_fee_id ON installments(fee_id);
CREATE INDEX idx_messages_school_id ON messages(school_id);
CREATE INDEX idx_messages_student_id ON messages(student_id);
CREATE INDEX idx_settings_school_id ON settings(school_id);
CREATE INDEX idx_templates_school_id ON templates(school_id);

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';