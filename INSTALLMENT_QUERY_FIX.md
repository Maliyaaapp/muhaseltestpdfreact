# Installment Query Issue - Diagnosis and Fix

## Problem Summary
Partial payments from the Fees page were not finding related installments, even though the installments existed in the database with proper `fee_id` and `student_id` links.

## Root Cause Analysis

### Data Verification
The installments **DO exist** in the database with correct linking:
- All installments have proper `student_id` values (UUIDs)
- All installments have proper `fee_id` values
- All installments have proper `school_id` values
- Some installments already have payments recorded (status: 'paid' or 'partial')

### Code Analysis
1. **Query Function (`getInstallments`)** - ✅ CORRECT
   - Properly accepts `studentId` parameter
   - Correctly passes it as `student_id` filter to `getAll`
   - Properly maps snake_case to camelCase in response

2. **Filtering Logic (`getAll`)** - ✅ CORRECT
   - Correctly applies filters: `item[key] === value`
   - Properly handles both single values and arrays
   - Merges sync queue operations correctly

3. **Fee Object Mapping (`getFees`)** - ✅ CORRECT
   - Properly maps `student_id` to `studentId`
   - Fee objects have both snake_case and camelCase properties

### Actual Issue
**Stale Cache** - The cache was not being invalidated before querying installments, causing the system to return old/empty data even though fresh installments existed in the database.

## Fixes Applied

### 1. Cache Invalidation Before Payment Processing
```typescript
// Clear installments cache to ensure fresh data
console.log('🗑️ Clearing installments cache before payment processing');
hybridApi.invalidateCache('installments');
```

### 2. Cache Invalidation Before Auto-Linking
```typescript
// CRITICAL FIX: Clear cache before querying to ensure fresh data
hybridApi.invalidateCache('installments');
```

### 3. Fallback to snake_case Properties
```typescript
// Use both camelCase and snake_case for compatibility
const studentIdToUse = selectedFee.studentId || selectedFee.student_id;
```

### 4. Enhanced Logging
```typescript
console.log('📦 Response details:', {
  success: allStudentInstallmentsResponse?.success,
  dataLength: allStudentInstallmentsResponse?.data?.length,
  fromCache: allStudentInstallmentsResponse?.fromCache,
  fromLocalStorage: allStudentInstallmentsResponse?.fromLocalStorage
});
```

## Testing Steps

1. **Clear Browser Cache**
   ```javascript
   // In browser console
   localStorage.clear();
   location.reload();
   ```

2. **Test Installment Query**
   ```javascript
   // Run the test script
   testInstallmentQuery();
   ```

3. **Test Partial Payment**
   - Navigate to Fees page
   - Select a student with installments
   - Click "دفع جزئي" (Partial Payment)
   - Check console logs for:
     - Cache invalidation messages
     - Installment query results
     - Auto-linking attempts

## Expected Behavior After Fix

1. **Cache is cleared** before each payment operation
2. **Fresh data is fetched** from database/localStorage
3. **Installments are found** by both `fee_id` and `student_id`
4. **Auto-linking works** when installments exist but aren't linked
5. **Payments are distributed** correctly across installments

## Verification

Check console logs for these messages:
- ✅ `🗑️ Clearing installments cache before payment processing`
- ✅ `📦 Total student installments: X` (where X > 0)
- ✅ `✅ Auto-linked X installments`
- ✅ `✅ Payment distributed across X installments`

## Additional Notes

- The `getAll` function uses a **local-first** approach with background refresh
- Cache keys include filter parameters: `installments_{"student_id":"uuid"}`
- Sync queue operations are merged with cached data
- The system works offline with localStorage fallback
