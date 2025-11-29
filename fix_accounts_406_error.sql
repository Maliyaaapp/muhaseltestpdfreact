-- FIX 406 ERROR WHEN FETCHING ACCOUNTS
-- This checks and fixes potential issues with the accounts table

-- Check if there are any problematic columns or data types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- Check for any NULL values in critical fields
SELECT 
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
    COUNT(CASE WHEN email IS NULL THEN 1 END) as null_emails,
    COUNT(CASE WHEN name IS NULL THEN 1 END) as null_names,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles
FROM public.accounts;

-- Fix any accounts with NULL critical fields
UPDATE public.accounts
SET 
    name = COALESCE(name, 'Unknown User'),
    email = COALESCE(email, 'noemail@example.com'),
    username = COALESCE(username, email, 'user_' || id::text),
    role = COALESCE(role, 'school_admin')
WHERE name IS NULL OR email IS NULL OR username IS NULL OR role IS NULL;

-- Ensure all accounts have proper timestamps
UPDATE public.accounts
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Check for any duplicate emails (which might cause issues)
SELECT email, COUNT(*) as count
FROM public.accounts
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Accounts table checked and fixed!' as message;
