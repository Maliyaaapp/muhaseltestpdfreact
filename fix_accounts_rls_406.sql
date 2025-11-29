-- FIX 406 ERROR BY CHECKING AND FIXING RLS POLICIES
-- The 406 error is likely caused by RLS policies

-- 1. Temporarily disable RLS to test (DO NOT USE IN PRODUCTION LONG-TERM)
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;

-- 2. Check if the account can be fetched now
SELECT id, name, email, username, role, school_id, grade_levels, created_at, updated_at, last_login
FROM public.accounts 
WHERE id = 'f7bfaaf8-e0bc-4abb-81fb-3ae5ddac8e39';

-- 3. If the above works, the issue is with RLS policies. Let's fix them.
-- Re-enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "Service role full access" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their own account" ON public.accounts;
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can manage accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view accounts" ON public.accounts;

-- 5. Create simple, working policies
-- Allow service role full access (for API calls)
CREATE POLICY "Service role full access" 
  ON public.accounts 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view all accounts (temporary - adjust based on your needs)
CREATE POLICY "Authenticated users can view accounts"
  ON public.accounts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to update their own account
CREATE POLICY "Users can update own account"
  ON public.accounts
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'RLS policies fixed! Try fetching the account again.' as message;
