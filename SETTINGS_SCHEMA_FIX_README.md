# Settings Schema Fix - School Info and Logo Display Issue

## Problem Description

The application was experiencing `PGRST204` errors when trying to display school information and logos in receipts, reports, and PDF files. The errors indicated that several columns were missing from the `settings` table schema cache, specifically:

- `installmentReceiptNumberFormat`
- `address`
- Various receipt number format fields
- Display and signature settings

## Root Cause

The issue was caused by two main problems:

1. **Database Schema Mismatch**: The `settings` table in the database was missing several columns that the application code expected to exist.

2. **Incomplete Default Settings**: When no settings existed for a school, the application would create default settings objects that were missing many required fields, causing `PGRST204` errors when trying to save them to the database.

## Solution Implemented

### 1. Database Schema Fix

Created a comprehensive SQL migration script (`fix_complete_settings_schema.sql`) that:

- Adds ALL missing columns to the `settings` table
- Sets appropriate default values for existing records
- Creates default settings for schools that don't have any settings
- Reloads the PostgREST schema cache

### 2. Application Code Fixes

Updated default settings objects in multiple files to include all required fields:

- `src/pages/school/fees/Fees.tsx` - Main fees page
- `src/pages/school/students/fees/Fees.tsx` - Student fees page
- `src/pages/school/installments/Installments.tsx` - Installments page
- `src/pages/school/installments/InstallmentForm.tsx` - Installment form
- `src/pages/school/settings/Settings.tsx` - Settings page
- `src/services/api.ts` - API service
- `src/services/dataStore.ts` - Data store interface

Each default settings object now includes:
- Basic school information (name, email, phone, address, logo)
- Receipt number formatting settings
- Installment receipt number formatting settings
- Display settings (watermarks, signatures, footers for receipts only)
- Financial settings (default installments, fee categories, transportation fees)

### 3. Obsolete Fields Removal

Removed obsolete fields that are no longer used in the application:

- `showFooter` - General footer display (removed from all components)
- `showFooterInReports` - Footer in reports (removed)
- `showFooterInInstallments` - Footer in installments (removed)
- `showStampOnReceipt` - Stamp functionality (disabled)
- `show_stamp_on_receipt` - Database column (removed)
- `show_footer` - Database column (removed)

Retained only:
- `showFooterInReceipts` - Footer display in receipts only

## How to Apply the Fix

### Step 1: Run the Database Migration

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_complete_settings_schema.sql`
4. Run the script

### Step 2: Verify the Fix

After running the migration:

1. Try generating a receipt or report
2. Check that school information and logos appear correctly
3. Verify that no `PGRST204` errors occur in the browser console

### Step 3: Test All Receipt Types

Test the following to ensure everything works:

- Fee receipts
- Installment receipts
- Student reports
- PDF exports
- Print functionality

## Files Modified

### New Files Created:
- `fix_complete_settings_schema.sql` - Database migration script
- `SETTINGS_SCHEMA_FIX_README.md` - This documentation

### Files Updated:
- `src/pages/school/fees/Fees.tsx` - Removed obsolete footer fields
- `src/pages/school/students/fees/Fees.tsx` - Removed obsolete footer fields
- `src/pages/school/installments/Installments.tsx` - Removed obsolete footer fields
- `src/pages/school/installments/InstallmentForm.tsx` - Removed obsolete footer fields
- `src/pages/school/settings/Settings.tsx` - Updated interface and default settings
- `src/services/api.ts` - Removed obsolete fields from API calls
- `src/services/dataStore.ts` - Updated SchoolSettings interface
- `fix_complete_settings_schema.sql` - Removed obsolete database columns

## Expected Results

After applying this fix:

✅ School information (name, email, phone, address) will appear in all receipts and reports
✅ School logos will display correctly in PDFs and print files
✅ No more `PGRST204` errors related to missing columns
✅ Receipt number formatting will work properly for both fees and installments
✅ All display settings (watermarks, signatures, stamps) will function correctly

## Technical Details

### Missing Columns Added:
- `name`, `email`, `phone`, `address`, `logo`
- `english_name`, `phone_whatsapp`, `phone_call`
- `receipt_number_format`, `receipt_number_prefix`, `receipt_number_suffix`
- `receipt_number_start`, `receipt_number_current`, `receipt_number_counter`, `receipt_number_year`
- `installment_receipt_number_format`, `installment_receipt_number_prefix`, `installment_receipt_number_suffix`
- `installment_receipt_number_start`, `installment_receipt_number_current`, `installment_receipt_number_counter`, `installment_receipt_number_year`
- `default_installments`, `tuition_fee_category`
- `transportation_fee_one_way`, `transportation_fee_two_way`
- Various display settings (`show_receipt_watermark`, `show_logo_background`, etc.)

### Default Values Set:
- School name: 'اسم المدرسة' (Arabic) / 'School Name' (English)
- Default installments: 4
- Transportation fees: 150 (one way), 300 (two way)
- Receipt format: 'auto'
- All display settings: TRUE (enabled)

## Troubleshooting

If you still experience issues after applying the fix:

1. **Check the SQL migration ran successfully**: Look for the success message in the SQL Editor
2. **Verify column existence**: Run the verification query included in the migration script
3. **Clear browser cache**: Sometimes cached API responses can cause issues
4. **Check browser console**: Look for any remaining error messages
5. **Restart the application**: If using a development server, restart it to ensure all changes are loaded

## Support

If you encounter any issues with this fix, please check:
1. That the SQL migration completed without errors
2. That all modified files have been saved
3. That your Supabase project has the latest schema changes

The fix addresses the core issue of missing database columns and incomplete default settings that were preventing school information and logos from appearing in receipts and reports.