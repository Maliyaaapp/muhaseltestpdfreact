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

-- Create RLS policies
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "School admins can view their school subscriptions" ON public.subscriptions
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM public.accounts 
            WHERE id = auth.uid() AND role = 'school_admin'
        )
    );

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