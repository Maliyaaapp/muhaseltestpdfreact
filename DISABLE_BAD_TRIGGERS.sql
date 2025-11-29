-- DISABLE THE TRIGGERS THAT ARE CAUSING PROBLEMS
-- These triggers recalculate fee totals but use stale installment data

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_installment_change ON installments;

-- Drop the functions too
DROP FUNCTION IF EXISTS calculate_fee_balance_on_fee_update();
DROP FUNCTION IF EXISTS calculate_fee_balance();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Problematic triggers disabled - fee calculations now handled by application code' as status;
