-- CHECK IF SUBSCRIPTIONS TABLE EXISTS AND ITS STRUCTURE

-- 1. Check if the table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'subscriptions'
) as table_exists;

-- 2. If it exists, show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 3. Check if there are any records
SELECT COUNT(*) as total_subscriptions FROM public.subscriptions;

-- 4. Show all subscriptions if any exist
SELECT * FROM public.subscriptions LIMIT 10;

-- 5. Check RLS policies on subscriptions table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'subscriptions';

SELECT 'Subscriptions table check complete!' as message;
