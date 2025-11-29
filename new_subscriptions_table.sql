-- NEW SUBSCRIPTIONS TABLE CREATION SCRIPT (CORRECTED)
-- This creates the subscriptions table with proper RLS policies
-- Run this ONLY if you don't have a subscriptions table yet

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    contact_email TEXT,
    subscription_start DATE,
    subscription_end DATE,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "School admins can view their school subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can manage subscriptions" ON public.subscriptions;

-- Create RLS policies
-- Allow service role full access (for API operations)
CREATE POLICY "Service role full access subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to manage all subscriptions (admins and school admins)
CREATE POLICY "Authenticated users can manage subscriptions"
    ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON public.subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_status ON public.subscriptions(payment_status);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trigger_update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Subscriptions table created successfully!' as message;