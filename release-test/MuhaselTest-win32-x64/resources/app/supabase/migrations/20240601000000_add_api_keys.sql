-- Migration: Add API keys table and related functionality
-- This migration adds support for API keys used by the backend service

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

-- Enable RLS on the api_keys table
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys
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

-- Create index for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_school_id ON api_keys(school_id);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to verify API key
CREATE OR REPLACE FUNCTION verify_api_key(api_key TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  account_id UUID,
  school_id UUID,
  permissions TEXT[]
) AS $$
DECLARE
  key_hash TEXT;
  key_record RECORD;
BEGIN
  -- Simple hash function for the key (in production, use a proper crypto hash)
  key_hash := encode(digest(api_key, 'sha256'), 'hex');
  
  -- Look up the key
  SELECT * INTO key_record FROM api_keys 
  WHERE api_keys.key_hash = key_hash
  AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Update last_used timestamp if key found
  IF FOUND THEN
    UPDATE api_keys SET last_used = NOW() WHERE id = key_record.id;
    
    RETURN QUERY SELECT 
      TRUE, 
      key_record.created_by, 
      key_record.school_id,
      key_record.permissions;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT[];
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload the PostgREST schema cache to ensure all changes are recognized
NOTIFY pgrst, 'reload schema';