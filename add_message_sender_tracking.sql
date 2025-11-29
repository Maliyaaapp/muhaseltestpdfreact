-- ADD SENDER TRACKING COLUMNS TO MESSAGES TABLE
-- This adds columns to track who sent each message

-- Add sender tracking columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS sent_by TEXT,
ADD COLUMN IF NOT EXISTS sent_by_role TEXT,
ADD COLUMN IF NOT EXISTS sent_by_email TEXT,
ADD COLUMN IF NOT EXISTS sent_by_grade_levels TEXT,
ADD COLUMN IF NOT EXISTS sent_by_id UUID;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sent_by ON public.messages(sent_by);
CREATE INDEX IF NOT EXISTS idx_messages_sent_by_role ON public.messages(sent_by_role);
CREATE INDEX IF NOT EXISTS idx_messages_sent_by_id ON public.messages(sent_by_id);

-- Add comments to document the columns
COMMENT ON COLUMN public.messages.sent_by IS 'Name of the user who sent the message';
COMMENT ON COLUMN public.messages.sent_by_role IS 'Role of the user who sent the message (schoolAdmin, gradeManager, etc.)';
COMMENT ON COLUMN public.messages.sent_by_email IS 'Email of the user who sent the message';
COMMENT ON COLUMN public.messages.sent_by_grade_levels IS 'Grade levels managed by the sender (for grade managers)';
COMMENT ON COLUMN public.messages.sent_by_id IS 'User ID of the sender';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Sender tracking columns added to messages table successfully!' as message;
