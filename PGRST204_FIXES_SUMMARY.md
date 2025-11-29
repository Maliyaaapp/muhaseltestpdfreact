# PGRST204 Error Fixes Summary

This document summarizes all the fixes applied to resolve the PGRST204 errors related to missing columns in the database schema.

## Issues Fixed

### 1. Missing `transportationType` in fees table
**Error:** `Could not find the 'transportationType' column of 'fees' in the schema cache`

**Root Cause:** The application was trying to access `transportationType` field, but the API mapping in `hybridApi.ts` was missing the mapping between `transportationType` (camelCase) and `transportation_type` (snake_case).

**Fix Applied:**
- Added `transportationType: fee.transportation_type` mapping in `getFees()` function
- Added `transportation_type: fee.transportation_type` for backward compatibility
- Added `transportationType: response.data.transportation_type` mapping in `getFee()` function
- Added `transportation_type: feeData.transportationType` mapping in `createFee()` and `updateFee()` functions
- Added `transportationType: undefined` to cleanup sections

### 2. Missing `paid_date` in installments table
**Error:** `Could not find the 'paid_date' column of 'installments' in the schema cache`

**Root Cause:** The `paid_date` column mapping was already present in `hybridApi.ts`, but the database schema might be missing the column.

**Fix Applied:**
- Verified existing mapping: `paidDate: installment.paid_date`
- Added migration to ensure `paid_date` column exists

### 3. Missing `discount` field mapping
**Issue:** The `Installment` interface includes a `discount` field, but it wasn't mapped in the API functions.

**Fix Applied:**
- Added `discount: installment.discount` mapping in all installment functions
- Added `discount: installmentData.discount` in create/update functions
- Added `discount: undefined` to cleanup sections

## Files Modified

### 1. `src/services/hybridApi.ts`
- Updated `getFees()` function to include `transportationType` mapping
- Updated `getFee()` function to include `transportationType` mapping
- Updated `createFee()` function to include `transportationType` mapping
- Updated `updateFee()` function to include `transportationType` mapping
- Added `discount` field mapping to all installment functions

### 2. Migration Files Created
- `supabase/migrations/20241220_fix_missing_columns.sql` - Comprehensive migration to add all missing columns

## Database Schema Updates

The migration adds the following columns if they don't exist:

### Fees Table
- `transportation_type TEXT`
- `division TEXT`
- `check_number TEXT`
- `check_date TIMESTAMP WITH TIME ZONE`
- `bank_name_arabic TEXT`
- `bank_name_english TEXT`

### Installments Table
- `paid_date TIMESTAMP WITH TIME ZONE`
- `installment_number INTEGER`
- `discount NUMERIC(10, 2)`
- `installment_month TEXT`
- `check_number TEXT`
- `check_date TIMESTAMP WITH TIME ZONE`
- `bank_name_arabic TEXT`
- `bank_name_english TEXT`

## How to Apply the Fixes

1. **Code Changes:** The `hybridApi.ts` file has been updated with all necessary mappings.

2. **Database Migration:** Run the migration file:
   ```sql
   -- Apply the migration
   \i supabase/migrations/20241220_fix_missing_columns.sql
   ```

3. **Verify:** After applying the migration, the PostgREST schema cache will be reloaded automatically.

## Prevention

To prevent similar issues in the future:

1. **Always map new fields:** When adding new fields to interfaces, ensure they are properly mapped in `hybridApi.ts`
2. **Follow naming convention:** Use camelCase in application code and snake_case in database
3. **Test thoroughly:** Test both read and write operations when adding new fields
4. **Keep schema in sync:** Ensure database schema matches the application's data model

## Verification

After applying these fixes, the following should work without PGRST204 errors:
- Fetching fees with `transportationType` field
- Creating/updating fees with `transportationType`
- Fetching installments with `paid_date` field
- All installment operations with proper field mappings