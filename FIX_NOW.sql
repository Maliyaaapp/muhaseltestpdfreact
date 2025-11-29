-- URGENT FIX: Disable the trigger that's overwriting payment data
-- This trigger is causing the fee to be recalculated with stale installment data

-- Drop ALL fee update triggers
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;
DROP TRIGGER IF EXISTS update_fee_balance_trigger ON fees;
DROP TRIGGER IF EXISTS calculate_fee_balance_trigger ON fees;

-- Drop the function
DROP FUNCTION IF EXISTS calculate_fee_balance_on_fee_update();
DROP FUNCTION IF EXISTS update_fee_balance();
DROP FUNCTION IF EXISTS calculate_fee_balance();

-- Verify triggers are gone
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'fees'
ORDER BY trigger_name;

-- This should return ONLY the installments trigger, NOT any fee triggers
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('fees', 'installments')
ORDER BY event_object_table, trigger_name;
