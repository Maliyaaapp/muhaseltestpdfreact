# Complete Database Fix Instructions

This guide will help you fix all the database issues you're experiencing:

1. ✅ Missing subscriptions table
2. ✅ Account creation not working when schools are created
3. ✅ Column name mismatch (createdAt vs created_at)
4. ✅ Login errors due to missing accounts

## Step 1: Run the Database Schema Fix

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `fix_database_schema.sql`
4. Click **Run** to execute the script

This will:
- Create the missing `subscriptions` table
- Add proper RLS policies
- Create triggers for automatic timestamp updates
- Add functions to sync subscriptions with schools

## Step 2: Fix Account Creation Issues

1. In the same SQL Editor
2. Copy and paste the contents of `fix_account_creation.sql`
3. Click **Run** to execute the script

This will:
- Create accounts for existing schools that don't have them
- Set up automatic account creation when new schools are added
- Fix RLS policies for proper account access

## Step 3: Restart Your Backend Server

1. Stop your current backend server (Ctrl+C)
2. Navigate to the server directory:
   ```bash
   cd server
   ```
3. Install any new dependencies:
   ```bash
   npm install
   ```
4. Start the server again:
   ```bash
   npm run dev
   ```

## Step 4: Test the Fixes

### Test 1: Check Subscriptions Table
1. Go to your Supabase dashboard
2. Navigate to **Table Editor**
3. You should now see a `subscriptions` table

### Test 2: Create a New School
1. Go to your admin portal
2. Try creating a new school
3. Check that:
   - The school is created successfully
   - An account is automatically created for the school
   - You can see the account in both the admin portal and Supabase

### Test 3: Login with School Account
1. Try logging in with the school's email and the default password: `TempPassword123!`
2. The login should work without errors

### Test 4: Check Subscriptions
1. Go to the subscriptions section in your admin portal
2. You should be able to view and manage subscriptions
3. Creating/editing subscriptions should work properly

## Expected Results

After running these fixes:

✅ **Subscriptions table exists** - You can manage subscriptions properly
✅ **Automatic account creation** - When you create a school, an account is automatically created
✅ **No more createdAt errors** - Column name mapping is fixed
✅ **Login works** - School accounts can log in successfully
✅ **Backend API supports subscriptions** - Full CRUD operations available

## Troubleshooting

### If you still get "Account not found" errors:
1. Check that the account was created in the `accounts` table
2. Verify the email matches exactly
3. Try the default password: `TempPassword123!`

### If subscriptions don't work:
1. Verify the `subscriptions` table was created
2. Check that RLS policies are enabled
3. Restart your backend server

### If school creation still fails:
1. Check the browser console for detailed errors
2. Verify your Supabase credentials are correct
3. Make sure both SQL scripts ran successfully

## Default Credentials

For any school accounts created by the fix script:
- **Username**: Generated from school email (part before @)
- **Password**: `TempPassword123!`
- **Role**: `schoolAdmin`

**Important**: Change these default passwords after testing!

## Files Modified/Created

- ✅ `fix_database_schema.sql` - Creates subscriptions table and related functions
- ✅ `fix_account_creation.sql` - Fixes account creation for schools
- ✅ `server/src/routes/subscriptionRoutes.ts` - Backend API routes for subscriptions
- ✅ `server/src/controllers/subscriptionController.ts` - Business logic for subscriptions
- ✅ `server/src/config/supabase.ts` - Server-side Supabase configuration
- ✅ `server/index.ts` - Updated to include subscription routes
- ✅ `src/services/schoolService.ts` - Fixed column name mapping

Your database and application should now work correctly! 🎉