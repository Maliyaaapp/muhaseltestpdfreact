-- Corrected installments table schema with all required fields
-- This includes the missing installment_number column that was causing PGRST204 errors

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
  installment_number INTEGER,  -- This was missing and causing the PGRST204 error
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

-- Add the missing column to existing table if it doesn't exist
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_number INTEGER;

-- Enable RLS
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for installments
CREATE POLICY "Users can view installments in their school" ON installments
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      -- Admin users can see all installments
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      -- School users can see installments in their school
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage installments in their school" ON installments
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (
      -- Admin users can manage all installments
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      -- School users can manage installments in their school
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';