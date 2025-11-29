-- NUCLEAR OPTION: Remove ALL calculation triggers
-- Your application handles all logic correctly
-- These triggers are causing race conditions and incorrect calculations

-- Remove ALL installment triggers except version and timestamp
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_from_installments ON installments;
DROP TRIGGER IF EXISTS trigger_distribute_combined_payment ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_installment_balance ON installments;
DROP TRIGGER IF EXISTS trigger_auto_link_installment ON installments;

-- Remove the functions
DROP FUNCTION IF EXISTS calculate_fee_balance_from_installments() CASCADE;
DROP FUNCTION IF EXISTS distribute_combined_payment() CASCADE;
DROP FUNCTION IF EXISTS calculate_installment_balance() CASCADE;
DROP FUNCTION IF EXISTS auto_link_installment_to_fee() CASCADE;

-- Verify only safe triggers remain
SELECT 
    'REMAINING TRIGGERS (should only be version and timestamp):' as info;

SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('fees', 'installments')
ORDER BY event_object_table, trigger_name;

SELECT 'All calculation triggers removed! Your app now has FULL control.' as result;
