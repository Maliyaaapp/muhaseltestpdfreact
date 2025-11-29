# Admin Account Setup Guide

Since all hardcoded admin credentials have been removed from the codebase, you need to create an admin account manually in Supabase to access the admin portal.

## Steps to Create Admin Account

### 1. Access Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to Authentication > Users

### 2. Create Admin User
- Click "Add user" or "Invite user"
- Enter admin email (e.g., `admin@yourschool.com`)
- Set a secure password
- Confirm the user creation

### 3. Set Admin Role in Database
After creating the user in Supabase Auth, you need to add them to your `accounts` table with admin role:

```sql
-- Replace 'your-admin-email@domain.com' with the actual admin email
-- Replace 'uuid-from-auth-users' with the actual UUID from auth.users table

INSERT INTO accounts (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  'uuid-from-auth-users',  -- Get this from auth.users table
  'your-admin-email@domain.com',
  'Admin User',
  'admin',
  NOW(),
  NOW()
);
```

### 4. Get User UUID
To get the UUID from Supabase Auth:
1. Go to Authentication > Users in Supabase dashboard
2. Find your admin user
3. Copy the UUID from the user list
4. Use this UUID in the SQL query above

### 5. Alternative: Use SQL Editor
You can also run this query in Supabase SQL Editor:

```sql
-- First, find the user UUID
SELECT id, email FROM auth.users WHERE email = 'your-admin-email@domain.com';

-- Then insert into accounts table using the UUID
INSERT INTO accounts (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'your-admin-email@domain.com';
```

## Login to Admin Portal

Once the admin account is created:
1. Go to your application login page
2. Use the admin email and password you set in Supabase
3. You should now have access to the admin portal with full permissions

## Important Notes

- The admin role gives full access to manage schools, accounts, and all system features
- Make sure to use a strong password for the admin account
- Keep the admin credentials secure and don't share them
- You can create multiple admin accounts if needed by repeating this process

## Troubleshooting

If you can't login:
1. Verify the user exists in Supabase Auth
2. Check that the account exists in the `accounts` table with role 'admin'
3. Ensure the UUIDs match between `auth.users` and `accounts` tables
4. Check browser console for any error messages