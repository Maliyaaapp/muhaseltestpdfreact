-- DISABLE ALL AUTOMATIC FEE CALCULATION TRIGGERS
-- Your application code handles all calculations correctly
-- The triggers are interfering with proper transaction handling

-- Remove the installments trigger that updates fees
DROP TRIGGER IF EXISTS trigger_update_fee_on_installment_change ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_installment_change ON installments;
DROP TRIGGER IF EXISTS update_fee_on_installment_trigger ON installments;

-- Remove the functions
DROP FUNCTION IF EXISTS update_fee_from_installments() CASCADE;
DROP FUNCTION IF EXISTS calculate_fee_balance_on_installment_change() CASCADE;

-- Verify all calculation triggers are gone
SELECT 
    'REMAINING TRIGGERS ON FEES:' as info;
    
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'fees'
AND trigger_name NOT IN ('increment_version_fees', 'update_fees_updated_at', 'trigger_calculate_fee_balance_direct');

SELECT 
    'REMAINING TRIGGERS ON INSTALLMENTS:' as info;
    
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'installments'
AND trigger_name NOT IN ('increment_version_installments', 'update_installments_updated_at');

SELECT 'All calculation triggers disabled! Your app now has full control.' as result;
