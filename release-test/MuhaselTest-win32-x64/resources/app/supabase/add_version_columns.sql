-- Add version columns for optimistic locking
-- This script adds version columns to all tables to support optimistic locking

-- Add version column to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to fees table
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to installments table
ALTER TABLE installments 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to api_keys table
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create or replace function to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-increment version on update for all tables
DROP TRIGGER IF EXISTS increment_version_schools ON schools;
CREATE TRIGGER increment_version_schools
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_students ON students;
CREATE TRIGGER increment_version_students
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_fees ON fees;
CREATE TRIGGER increment_version_fees
  BEFORE UPDATE ON fees
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_installments ON installments;
CREATE TRIGGER increment_version_installments
  BEFORE UPDATE ON installments
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_accounts ON accounts;
CREATE TRIGGER increment_version_accounts
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_messages ON messages;
CREATE TRIGGER increment_version_messages
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_settings ON settings;
CREATE TRIGGER increment_version_settings
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_templates ON templates;
CREATE TRIGGER increment_version_templates
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_subscriptions ON subscriptions;
CREATE TRIGGER increment_version_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS increment_version_api_keys ON api_keys;
CREATE TRIGGER increment_version_api_keys
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- Initialize version for existing records
UPDATE schools SET version = 1 WHERE version IS NULL;
UPDATE students SET version = 1 WHERE version IS NULL;
UPDATE fees SET version = 1 WHERE version IS NULL;
UPDATE installments SET version = 1 WHERE version IS NULL;
UPDATE accounts SET version = 1 WHERE version IS NULL;
UPDATE messages SET version = 1 WHERE version IS NULL;
UPDATE settings SET version = 1 WHERE version IS NULL;
UPDATE templates SET version = 1 WHERE version IS NULL;
UPDATE subscriptions SET version = 1 WHERE version IS NULL;
UPDATE api_keys SET version = 1 WHERE version IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Version columns and triggers added successfully for optimistic locking!' as message;