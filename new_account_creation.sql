-- NEW AUTOMATIC ACCOUNT CREATION SCRIPT (CORRECTED)
-- This creates functions and triggers to automatically create admin accounts for schools
-- Run this to enable automatic account creation for new and existing schools

-- Function to create a school admin account
CREATE OR REPLACE FUNCTION create_school_account(school_id_param UUID, school_name_param TEXT, contact_email_param TEXT)
RETURNS UUID AS $$
DECLARE
    new_account_id UUID;
    account_username TEXT;
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create accounts for existing schools that don't have admin accounts
DO $$
DECLARE
    school_record RECORD;
    new_account_id UUID;
BEGIN
    FOR school_record IN 
        SELECT s.id, s.name, s.email
        FROM public.schools s
        WHERE s.email IS NOT NULL
        AND s.email != ''
        AND NOT EXISTS (
            SELECT 1 FROM public.accounts a 
            WHERE a.school_id = s.id AND a.role = 'school_admin'
        )
    LOOP
        BEGIN
            new_account_id := create_school_account(
                school_record.id,
                school_record.name,
                school_record.email
            );
            
            RAISE NOTICE 'Created account for school: % (ID: %)', school_record.name, new_account_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create account for school: % - Error: %', school_record.name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Function to automatically create account when new school is inserted
CREATE OR REPLACE FUNCTION auto_create_school_account()
RETURNS TRIGGER AS $$
DECLARE
    new_account_id UUID;
BEGIN
    -- Only create account if email is provided
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        new_account_id := create_school_account(
            NEW.id,
            NEW.name,
            NEW.email
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic account creation
DROP TRIGGER IF EXISTS trigger_auto_create_school_account ON public.schools;
CREATE TRIGGER trigger_auto_create_school_account
    AFTER INSERT ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_school_account();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Account creation system setup successfully!' as message;