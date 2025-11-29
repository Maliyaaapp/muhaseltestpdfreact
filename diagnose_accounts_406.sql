-- DIAGNOSE AND FIX 406 ERROR FOR ACCOUNTS TABLE
-- Run this to find and fix the root cause

-- 1. Check the table structure
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- 2. Check for any problematic data in the specific account
SELECT * FROM public.accounts WHERE id = 'f7bfaaf8-e0bc-4abb-81fb-3ae5ddac8e39';

-- 3. Check if there are any views or computed columns causing issues
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'accounts';

-- 4. Check RLS policies that might be interfering
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'accounts';

-- 5. Try to select the account with explicit column names (to identify problematic column)
SELECT 
    id,
    name,
    email,
    username,
    role,
    school_id,
    grade_levels,
    created_at,
    updated_at,
    last_login
FROM public.accounts 
WHERE id = 'f7bfaaf8-e0bc-4abb-81fb-3ae5ddac8e39';

-- 6. Check if password column exists and might be causing issues
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name = 'password';

SELECT 'Diagnosis complete. Check the results above for issues.' as message;
