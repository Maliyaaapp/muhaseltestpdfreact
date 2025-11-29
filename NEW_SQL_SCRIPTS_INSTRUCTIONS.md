# NEW SQL SCRIPTS - EXECUTION ORDER

These are the **NEW** SQL scripts that need to be run in your Supabase database. Run them in this exact order:

## 1. Create Subscriptions Table
```sql
-- Run: new_subscriptions_table.sql
```
This creates the subscriptions table with proper RLS policies and triggers.

## 2. Add Subscription Functions
```sql
-- Run: new_subscription_functions.sql
```
This adds functions to automatically manage subscriptions when schools are created/updated.

## 3. Setup Account Creation
```sql
-- Run: new_account_creation.sql
```
This creates functions and triggers for automatic account creation, plus creates accounts for existing schools.

## 4. Update Account Policies
```sql
-- Run: new_accounts_rls_policies.sql
```
This updates the RLS policies for the accounts table to ensure proper access control.

## After Running All Scripts:
1. Restart your backend server
2. Test the subscription endpoints
3. Verify that new schools automatically get admin accounts

## Files Created:
- `new_subscriptions_table.sql` - Creates subscriptions table
- `new_subscription_functions.sql` - Adds subscription management functions
- `new_account_creation.sql` - Sets up automatic account creation
- `new_accounts_rls_policies.sql` - Updates account access policies

**Note:** These are completely separate from your existing schema files and only contain the NEW functionality.