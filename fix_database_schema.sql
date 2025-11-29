-- Fix Database Schema Issues
-- This script addresses the missing subscriptions table and other schema issues
-- Run this in your Supabase project's SQL Editor

-- Create subscriptions table (separate from schools for better data management)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_phone_whatsapp TEXT,
  contact_phone_call TEXT,
  subscription_start TIMESTAMP WITH TIME ZONE NOT NULL,
  subscription_end TIMESTAMP WITH TIME ZONE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending', 'paused')),
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, subscription_start)
);

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Admins can manage all subscriptions" ON subscriptions
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    (SELECT role FROM accounts WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "School admins can view their school subscriptions" ON subscriptions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    school_id = (SELECT school_id FROM accounts WHERE id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dates ON subscriptions(subscription_start, subscription_end);

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Function to create subscription when school is created
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create subscription if school has subscription dates
  IF NEW.subscription_start IS NOT NULL AND NEW.subscription_end IS NOT NULL THEN
    INSERT INTO subscriptions (
      school_id,
      school_name,
      contact_email,
      contact_phone,
      contact_phone_whatsapp,
      contact_phone_call,
      subscription_start,
      subscription_end,
      amount,
      paid,
      status
    ) VALUES (
      NEW.id,
      NEW.name,
      NEW.email,
      NEW.phone,
      NEW.phone_whatsapp,
      NEW.phone_call,
      NEW.subscription_start,
      NEW.subscription_end,
      COALESCE(NEW.payment, 0),
      CASE WHEN NEW.payment > 0 THEN TRUE ELSE FALSE END,
      CASE WHEN NEW.active THEN 'active' ELSE 'pending' END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create subscription when school is created
CREATE OR REPLACE TRIGGER trigger_create_default_subscription
  AFTER INSERT ON schools
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- Function to sync subscription when school is updated
CREATE OR REPLACE FUNCTION sync_subscription_with_school()
RETURNS TRIGGER AS $$
BEGIN
  -- Update existing subscription or create new one
  IF NEW.subscription_start IS NOT NULL AND NEW.subscription_end IS NOT NULL THEN
    -- Try to update existing subscription
    UPDATE subscriptions SET
      school_name = NEW.name,
      contact_email = NEW.email,
      contact_phone = NEW.phone,
      contact_phone_whatsapp = NEW.phone_whatsapp,
      contact_phone_call = NEW.phone_call,
      subscription_start = NEW.subscription_start,
      subscription_end = NEW.subscription_end,
      amount = COALESCE(NEW.payment, 0),
      paid = CASE WHEN NEW.payment > 0 THEN TRUE ELSE FALSE END,
      status = CASE WHEN NEW.active THEN 'active' ELSE 'pending' END,
      updated_at = NOW()
    WHERE school_id = NEW.id;
    
    -- If no subscription exists, create one
    IF NOT FOUND THEN
      INSERT INTO subscriptions (
        school_id,
        school_name,
        contact_email,
        contact_phone,
        contact_phone_whatsapp,
        contact_phone_call,
        subscription_start,
        subscription_end,
        amount,
        paid,
        status
      ) VALUES (
        NEW.id,
        NEW.name,
        NEW.email,
        NEW.phone,
        NEW.phone_whatsapp,
        NEW.phone_call,
        NEW.subscription_start,
        NEW.subscription_end,
        COALESCE(NEW.payment, 0),
        CASE WHEN NEW.payment > 0 THEN TRUE ELSE FALSE END,
        CASE WHEN NEW.active THEN 'active' ELSE 'pending' END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync subscription when school is updated
CREATE OR REPLACE TRIGGER trigger_sync_subscription_with_school
  AFTER UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_with_school();

-- Migrate existing schools to create subscriptions
INSERT INTO subscriptions (
  school_id,
  school_name,
  contact_email,
  contact_phone,
  contact_phone_whatsapp,
  contact_phone_call,
  subscription_start,
  subscription_end,
  amount,
  paid,
  status
)
SELECT 
  s.id,
  s.name,
  s.email,
  s.phone,
  s.phone_whatsapp,
  s.phone_call,
  COALESCE(s.subscription_start, NOW()),
  COALESCE(s.subscription_end, NOW() + INTERVAL '1 year'),
  COALESCE(s.payment, 0),
  CASE WHEN s.payment > 0 THEN TRUE ELSE FALSE END,
  CASE WHEN s.active THEN 'active' ELSE 'pending' END
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions sub WHERE sub.school_id = s.id
);

-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Database schema fixes applied successfully! Subscriptions table created and synced with existing schools.' AS message;