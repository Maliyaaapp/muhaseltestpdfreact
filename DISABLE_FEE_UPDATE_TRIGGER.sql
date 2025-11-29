-- DISABLE THE PROBLEMATIC FEE UPDATE TRIGGER
-- This trigger is interfering with application-level payment calculations

-- The issue: When the app updates a fee after distributing payment to installments,
-- the BEFORE UPDATE trigger recalculates from installments but may read stale data
-- because the installment updates haven't been committed yet.

-- Solution: Drop the BEFORE UPDATE trigger on fees table
-- Keep only the AFTER INSERT/UPDATE/DELETE trigger on installments table

DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;

-- Also drop the function since we're not using it
DROP FUNCTION IF EXISTS calculate_fee_balance_on_fee_update();

-- Keep the installments trigger - it's useful for recalculating when installments change
-- But we don't need the fee trigger because the app calculates correctly

SELECT 'Fee update trigger disabled successfully!' as result;
SELECT 'The installments trigger is still active and will update fees when installments change.' as note;
