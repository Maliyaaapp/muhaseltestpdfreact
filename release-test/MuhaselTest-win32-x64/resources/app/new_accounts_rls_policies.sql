-- NEW ACCOUNTS RLS POLICIES UPDATE (CORRECTED)
-- This updates the Row Level Security policies for the accounts table
-- Run this to ensure proper access control for accounts

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can manage all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their own account" ON public.accounts;
DROP POLICY IF EXISTS "School admins can view their school accounts" ON public.accounts;

-- Create new RLS policies for accounts table
CREATE POLICY "Service role can manage all accounts" ON public.accounts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage all accounts" ON public.accounts
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own account" ON public.accounts
    FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

-- Allow users to update only their own account (needed for last_login and profile updates)
CREATE POLICY "Users can update their own account" ON public.accounts
    FOR UPDATE USING (auth.uid()::TEXT = id::TEXT)
    WITH CHECK (auth.uid()::TEXT = id::TEXT);

-- Removed recursive policy to prevent infinite recursion error (42P17).
-- School admins currently can only view their own account; broader access can be implemented via JWT claims.

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Show newly created school admin accounts
SELECT 
    a.id,
    a.username,
    a.email,
    a.role,
    s.name as school_name,
    a.created_at
FROM public.accounts a
JOIN public.schools s ON a.school_id = s.id
WHERE a.role = 'school_admin'
ORDER BY a.created_at DESC;

SELECT 'Accounts RLS policies updated successfully!' as message;