# URGENT FIX FOR PGRST204 ERROR AND MISSING LOGO

## Issues Identified:
1. `PGRST204` error due to missing `default_installments` column
2. School logo and information not appearing in receipts
3. Duplicate 'discount' key warnings in hybridApi.ts

## IMMEDIATE SOLUTION:

### Step 1: Run This SQL Script in Supabase SQL Editor

```sql
-- COMPLETE FIX FOR SETTINGS TABLE
-- Run this entire script in Supabase SQL Editor

-- First, check if columns exist and add them if missing
DO $$
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'address') THEN
        ALTER TABLE settings ADD COLUMN address TEXT;
    END IF;
    
    -- Add logo column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'logo') THEN
        ALTER TABLE settings ADD COLUMN logo TEXT;
    END IF;
    
    -- Add english_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'english_name') THEN
        ALTER TABLE settings ADD COLUMN english_name TEXT;
    END IF;
    
    -- Add phone_whatsapp column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'phone_whatsapp') THEN
        ALTER TABLE settings ADD COLUMN phone_whatsapp TEXT;
    END IF;
    
    -- Add phone_call column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'phone_call') THEN
        ALTER TABLE settings ADD COLUMN phone_call TEXT;
    END IF;
    
    -- Add default_installments column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'default_installments') THEN
        ALTER TABLE settings ADD COLUMN default_installments INTEGER;
    END IF;
END $$;

-- Set default values for all missing columns
UPDATE settings SET 
    address = COALESCE(address, 'عنوان المدرسة'),
    logo = COALESCE(logo, ''),
    english_name = COALESCE(english_name, 'School Name'),
    phone_whatsapp = COALESCE(phone_whatsapp, ''),
    phone_call = COALESCE(phone_call, ''),
    default_installments = COALESCE(default_installments, 10)
WHERE 
    address IS NULL OR 
    logo IS NULL OR 
    english_name IS NULL OR 
    phone_whatsapp IS NULL OR 
    phone_call IS NULL OR 
    default_installments IS NULL;

-- Make critical columns NOT NULL
ALTER TABLE settings ALTER COLUMN address SET NOT NULL;
ALTER TABLE settings ALTER COLUMN logo SET NOT NULL;
ALTER TABLE settings ALTER COLUMN default_installments SET NOT NULL;

-- Set default for default_installments
ALTER TABLE settings ALTER COLUMN default_installments SET DEFAULT 10;

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT 
    id,
    name,
    address,
    logo,
    english_name,
    phone_whatsapp,
    phone_call,
    default_installments
FROM settings 
LIMIT 5;
```

### Step 2: Clear Browser Cache and Restart Development Server

1. **Clear browser cache completely** (Ctrl+Shift+Delete)
2. **Stop the development server** (Ctrl+C)
3. **Restart the development server**
4. **Hard refresh the browser** (Ctrl+Shift+R)

### Step 3: Verify the Fix

1. Go to Settings page and check if school information is properly saved
2. Try generating a receipt and check if:
   - School logo appears in the header
   - School name, phone, email appear correctly
   - No PGRST204 errors occur

## Root Cause Analysis:

1. **Database Schema Issue**: The `default_installments` column was missing from the settings table
2. **Field Mapping Issue**: Inconsistent camelCase/snake_case mapping between frontend and database
3. **Cache Issue**: Browser and development server were using cached versions

## Files Already Fixed:
- `src/services/hybridApi.ts` - Added proper field mapping for settings
- `src/utils/runMigration.ts` - Updated to handle default_installments column
- Error handling improved for missing columns

## If Issues Persist:

1. Check browser console for any remaining errors
2. Verify Supabase connection is working
3. Check if PostgREST schema was properly reloaded
4. Ensure all environment variables are correct

## Expected Result:
- ✅ No more PGRST204 errors
- ✅ School logo appears in receipts
- ✅ School information displays correctly
- ✅ No duplicate key warnings
- ✅ All receipt functionality works properly