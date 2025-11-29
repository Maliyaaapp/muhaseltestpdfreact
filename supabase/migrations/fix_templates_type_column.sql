-- Fix templates table type column issue for WhatsApp custom templates
-- This migration adds the missing 'type' column and sets up proper permissions

-- Add type column if it doesn't exist
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- Update existing templates to have a default type
UPDATE templates 
SET type = 'general' 
WHERE type IS NULL;

-- Add CHECK constraint to ensure valid template types
ALTER TABLE templates 
ADD CONSTRAINT templates_type_check 
CHECK (type IN ('general', 'message', 'email', 'sms', 'whatsapp'));

-- Grant permissions for template operations
GRANT ALL ON templates TO authenticated;
GRANT SELECT ON templates TO anon;

-- Enable RLS if not already enabled
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for templates
CREATE POLICY "Users can manage their school templates" ON templates
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE email = auth.email() AND school_id = templates.school_id
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_templates_school_type ON templates(school_id, type);