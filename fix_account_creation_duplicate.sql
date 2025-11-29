-- FIX ACCOUNT CREATION TO HANDLE DUPLICATE EMAILS
-- This updates the account creation function to handle duplicate emails gracefully

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_auto_create_school_account ON public.schools;

-- Updated function to create a school admin account (handles duplicates)
CREATE OR REPLACE FUNCTION create_school_account(school_id_param UUID, school_name_param TEXT, contact_email_param TEXT)
RETURNS UUID AS $$
DECLARE
    new_account_id UUID;
    account_username TEXT;
    existing_account_id UUID;
BEGIN
    -- Check if an account with this email already exists
    SELECT id INTO existing_account_id
    FROM public.accounts
    WHERE email = contact_email_param
    LIMIT 1;
    
    -- If account exists, update it to link to this school
    IF existing_account_id IS NOT NULL THEN
        UPDATE public.accounts
        SET school_id = school_id_param,
            updated_at = NOW()
        WHERE id = existing_account_id;
        
        RETURN existing_account_id;
    END IF;
    
    -- Generate username from school name (remove spaces, convert to lowercase)
    account_username := LOWER(REPLACE(school_name_param, ' ', ''));
    
    -- Ensure username is unique by appending school_id if needed
    IF EXISTS (SELECT 1 FROM public.accounts WHERE username = account_username) THEN
        account_username := account_username || '_' || SUBSTRING(school_id_param::TEXT, 1, 8);
    END IF;
    
    -- Create the account
    INSERT INTO public.accounts (
        name,
        username,
        email,
        role,
        school_id
    ) VALUES (
        school_name_param || ' Admin',
        account_username,
        contact_email_param,
        'school_admin',
        school_id_param
    ) RETURNING id INTO new_account_id;
    
    RETURN new_account_id;
EXCEPTION
    WHEN unique_violation THEN
        -- If we still get a unique violation, try to find and return the existing account
        SELECT id INTO existing_account_id
        FROM public.accounts
        WHERE email = contact_email_param
        LIMIT 1;
        
        IF existing_account_id IS NOT NULL THEN
            -- Update the existing account to link to this school
            UPDATE public.accounts
            SET school_id = school_id_param,
                updated_at = NOW()
            WHERE id = existing_account_id;
            
            RETURN existing_account_id;
        END IF;
        
        -- If we can't find it, re-raise the error
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to automatically create account when new school is inserted
CREATE OR REPLACE FUNCTION auto_create_school_account()
RETURNS TRIGGER AS $$
DECLARE
    new_account_id UUID;
BEGIN
    -- Only create account if email is provided
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        BEGIN
            new_account_id := create_school_account(
                NEW.id,
                NEW.name,
                NEW.email
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the school creation
                RAISE NOTICE 'Failed to create account for school %: %', NEW.name, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger for automatic account creation
CREATE TRIGGER trigger_auto_create_school_account
    AFTER INSERT ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_school_account();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Account creation system fixed to handle duplicates!' as message;
