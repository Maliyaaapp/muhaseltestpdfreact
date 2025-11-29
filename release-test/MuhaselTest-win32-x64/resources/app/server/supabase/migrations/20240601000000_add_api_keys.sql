-- Migration script to add API keys table and related functions

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT '{}',
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_school_id ON api_keys(school_id);

-- Create RLS policies

-- Admins can see all API keys
CREATE POLICY admin_view_api_keys ON api_keys
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid() AND (accounts.role = 'admin' OR accounts.role = 'superadmin')
  ));

-- School admins can see their school's API keys
CREATE POLICY school_admin_view_api_keys ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid() 
      AND accounts.role = 'school_admin'
      AND accounts.school_id = api_keys.school_id
    )
  );

-- Admins can create API keys
CREATE POLICY admin_insert_api_keys ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid() AND (accounts.role = 'admin' OR accounts.role = 'superadmin')
  ));

-- School admins can create API keys for their school
CREATE POLICY school_admin_insert_api_keys ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid() 
      AND accounts.role = 'school_admin'
      AND accounts.school_id = api_keys.school_id
    )
  );

-- Admins can update API keys
CREATE POLICY admin_update_api_keys ON api_keys
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid() AND (accounts.role = 'admin' OR accounts.role = 'superadmin')
  ));

-- School admins can update their school's API keys
CREATE POLICY school_admin_update_api_keys ON api_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid() 
      AND accounts.role = 'school_admin'
      AND accounts.school_id = api_keys.school_id
    )
  );

-- Admins can delete API keys
CREATE POLICY admin_delete_api_keys ON api_keys
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = auth.uid() AND (accounts.role = 'admin' OR accounts.role = 'superadmin')
  ));

-- School admins can delete their school's API keys
CREATE POLICY school_admin_delete_api_keys ON api_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = auth.uid() 
      AND accounts.role = 'school_admin'
      AND accounts.school_id = api_keys.school_id
    )
  );

-- Create function to verify API key
CREATE OR REPLACE FUNCTION verify_api_key(api_key_value TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  account_id UUID,
  school_id UUID,
  permissions TEXT[]
) AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Find the API key record
  SELECT * INTO key_record FROM api_keys
  WHERE key_hash = api_key_value
  LIMIT 1;
  
  -- Check if key exists and is not expired
  IF key_record.id IS NULL OR 
     (key_record.expires_at IS NOT NULL AND key_record.expires_at < NOW()) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT[];
    RETURN;
  END IF;
  
  -- Update last_used timestamp
  UPDATE api_keys SET last_used = NOW() WHERE id = key_record.id;
  
  -- Return key information
  RETURN QUERY SELECT 
    true, 
    key_record.created_by, 
    key_record.school_id,
    key_record.permissions;
    
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;