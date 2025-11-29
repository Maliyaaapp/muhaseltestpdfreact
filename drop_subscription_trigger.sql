-- DROP SUBSCRIPTION TRIGGER AND FUNCTION
-- Run this to remove the problematic subscription trigger
-- Since we're managing subscriptions through school fields directly

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_sync_subscription_with_school ON public.schools;
DROP TRIGGER IF EXISTS trigger_create_default_subscription ON public.schools;

-- Drop the functions
DROP FUNCTION IF EXISTS sync_subscription_with_school();
DROP FUNCTION IF EXISTS create_default_subscription(UUID, TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS create_default_subscription(UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS create_default_subscription();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Subscription trigger and functions removed successfully!' as message;
