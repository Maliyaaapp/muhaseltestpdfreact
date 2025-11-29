-- NEW SUBSCRIPTION MANAGEMENT FUNCTIONS (CORRECTED)
-- This adds functions to automatically manage subscriptions when schools are created/updated
-- Run this AFTER creating the subscriptions table

-- Function to create default subscription for a school
CREATE OR REPLACE FUNCTION create_default_subscription(school_id_param UUID, contact_email_param TEXT DEFAULT NULL, subscription_start_param DATE DEFAULT NULL, subscription_end_param DATE DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_subscription_id UUID;
BEGIN
    -- Only create if subscription dates are provided
    IF subscription_start_param IS NOT NULL AND subscription_end_param IS NOT NULL THEN
        INSERT INTO public.subscriptions (
            school_id,
            contact_email,
            subscription_start,
            subscription_end,
            amount,
            currency,
            status,
            payment_status
        ) VALUES (
            school_id_param,
            contact_email_param,
            subscription_start_param,
            subscription_end_param,
            0.00,
            'USD',
            'active',
            'pending'
        ) RETURNING id INTO new_subscription_id;
        
        RETURN new_subscription_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync subscription with school updates
CREATE OR REPLACE FUNCTION sync_subscription_with_school()
RETURNS TRIGGER AS $$
DECLARE
    existing_subscription_id UUID;
BEGIN
    -- Check if school has subscription dates
    IF NEW.subscription_start IS NOT NULL AND NEW.subscription_end IS NOT NULL THEN
        -- Check if subscription already exists
        SELECT id INTO existing_subscription_id
        FROM public.subscriptions
        WHERE school_id = NEW.id
        LIMIT 1;
        
        IF existing_subscription_id IS NOT NULL THEN
            -- Update existing subscription
            UPDATE public.subscriptions
            SET 
                contact_email = COALESCE(NEW.email, contact_email),
                subscription_start = NEW.subscription_start,
                subscription_end = NEW.subscription_end,
                updated_at = NOW()
            WHERE id = existing_subscription_id;
        ELSE
            -- Create new subscription
            PERFORM create_default_subscription(
                NEW.id,
                NEW.email,
                NEW.subscription_start,
                NEW.subscription_end
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for school updates
DROP TRIGGER IF EXISTS trigger_sync_subscription_with_school ON public.schools;
CREATE TRIGGER trigger_sync_subscription_with_school
    AFTER INSERT OR UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION sync_subscription_with_school();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Subscription management functions created successfully!' as message;