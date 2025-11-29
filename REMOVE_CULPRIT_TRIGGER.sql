-- REMOVE THE ACTUAL CULPRIT TRIGGER
-- This is the trigger that's overwriting your payment data

DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_direct ON fees;
DROP FUNCTION IF EXISTS calculate_fee_balance_direct() CASCADE;

-- Verify it's gone
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'fees'
AND trigger_name = 'trigger_calculate_fee_balance_direct';

-- This should return 0 rows
SELECT 'Culprit trigger removed!' as result;
