-- Fix Account Creation for Schools
-- This script creates accounts for schools that don't have them
-- Run this in your Supabase project's SQL Editor AFTER running fix_database_schema.sql

-- Function to create account for school
CREATE OR REPLACE FUNCTION create_school_account(
  p_school_id UUID,
  p_school_name TEXT,
  p_school_email TEXT,
  p_default_password TEXT DEFAULT 'TempPassword123!'
)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
  v_username TEXT;
BEGIN
  -- Generate username from school email
  v_username := LOWER(REPLACE(SPLIT_PART(p_school_email, '@', 1), ' ', ''));
  
  -- Create account record
  INSERT INTO accounts (
    id,
    name,
    email,
    username,
    role,
    school_id,
    grade_levels,
    password,
    created_at,
    updated_at
  ) VALUES (
    uuid_generate_v4(),
    p_school_name || ' - Admin',
    p_school_email,
    v_username,
    'schoolAdmin',
    p_school_id,
    '{}',
    p_default_password, -- In production, this should be hashed
    NOW(),
    NOW()
  ) RETURNING id INTO v_account_id;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Create accounts for schools that don't have them
DO $$
DECLARE
  school_record RECORD;
  new_account_id UUID;
BEGIN
  FOR school_record IN 
    SELECT s.id, s.name, s.email
    FROM schools s
    WHERE NOT EXISTS (
      SELECT 1 FROM accounts a WHERE a.school_id = s.id
    )
  LOOP
    -- Create account for this school
    SELECT create_school_account(
      school_record.id,
      school_record.name,
      school_record.email
    ) INTO new_account_id;
    
    RAISE NOTICE 'Created account % for school %', new_account_id, school_record.name;
  END LOOP;
END;
$$;

-- Function to automatically create account when school is created
CREATE OR REPLACE FUNCTION auto_create_school_account()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Create account for the new school
  SELECT create_school_account(
    NEW.id,
    NEW.name,
    NEW.email
  ) INTO v_account_id;
  
  RAISE NOTICE 'Auto-created account % for new school %', v_account_id, NEW.name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create account when school is created
DROP TRIGGER IF EXISTS trigger_auto_create_school_account ON schools;
CREATE TRIGGER trigger_auto_create_school_account
  AFTER INSERT ON schools
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_school_account();

-- Update RLS policies to allow school account creation
DROP POLICY IF EXISTS "Service role full access" ON accounts;
CREATE POLICY "Service role full access" 
  ON accounts 
  FOR ALL 
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage all accounts" ON accounts;
CREATE POLICY "Admins can manage all accounts" ON accounts
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can view their own account" ON accounts;
CREATE POLICY "Users can view their own account" 
  ON accounts 
  FOR SELECT 
  USING (auth.role() = 'authenticated' AND id = auth.uid());

DROP POLICY IF EXISTS "School admins can view their school accounts" ON accounts;
CREATE POLICY "School admins can view their school accounts" ON accounts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    (
      (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin' OR
      school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
    )
  );

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Show created accounts
SELECT 
  a.id,
  a.name,
  a.email,
  a.username,
  a.role,
  s.name as school_name
FROM accounts a
JOIN schools s ON a.school_id = s.id
WHERE a.role = 'schoolAdmin'
ORDER BY a.created_at DESC;

SELECT 'Account creation fixes applied successfully! Accounts created for schools without them.' AS message;