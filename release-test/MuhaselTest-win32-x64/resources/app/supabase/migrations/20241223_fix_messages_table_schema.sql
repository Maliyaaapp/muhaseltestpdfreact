-- Fix messages table schema to match application requirements
-- Add missing columns that the Communications component is trying to use

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS template TEXT;

-- Update the messages table to use proper field names that match the application
-- The application sends: studentId, studentName, grade, parentName, phone, template, message, sentAt, status, schoolId
-- But the database expects: student_id, student_name, grade, parent_name, phone, template, message, sent_at, status, school_id

-- Add sent_at column if it doesn't exist (application uses sentAt)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Update existing sent_at column from the old sent_at field if it exists
UPDATE messages SET sent_at = created_at WHERE sent_at IS NULL;

-- Comment: The application is using camelCase field names but Supabase/PostgreSQL typically uses snake_case
-- The hybridApi.ts should handle the field name mapping between camelCase and snake_case
-- This migration ensures all required columns exist in the database