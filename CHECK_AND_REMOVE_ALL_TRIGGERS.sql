-- COMPREHENSIVE TRIGGER CHECK AND REMOVAL
-- Run this to see what's actually in your database and remove problematic triggers

-- STEP 1: Check what triggers exist
SELECT 
    'CURRENT TRIGGERS ON FEES TABLE:' as info;

SELECT 
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    substring(action_statement, 1, 100) as action
FROM information_schema.triggers
WHERE event_object_table = 'fees'
ORDER BY trigger_name;

-- STEP 2: Check what triggers exist on installments
SELECT 
    'CURRENT TRIGGERS ON INSTALLMENTS TABLE:' as info;

SELECT 
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    substring(action_statement, 1, 100) as action
FROM information_schema.triggers
WHERE event_object_table = 'installments'
ORDER BY trigger_name;

-- STEP 3: Remove ALL triggers from fees table
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;
DROP TRIGGER IF EXISTS update_fee_balance_trigger ON fees;
DROP TRIGGER IF EXISTS calculate_fee_balance_trigger ON fees;
DROP TRIGGER IF EXISTS trigger_update_fee_balance ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_balance ON fees;
DROP TRIGGER IF EXISTS fee_balance_trigger ON fees;
DROP TRIGGER IF EXISTS update_fee_from_installments_trigger ON fees;

-- STEP 4: Remove the functions
DROP FUNCTION IF EXISTS calculate_fee_balance_on_fee_update() CASCADE;
DROP FUNCTION IF EXISTS update_fee_balance() CASCADE;
DROP FUNCTION IF EXISTS calculate_fee_balance() CASCADE;

-- STEP 5: Verify triggers are gone
SELECT 
    'REMAINING TRIGGERS ON FEES TABLE (should be empty):' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'fees';

-- STEP 6: Keep ONLY the installments trigger (this one is good)
SELECT 
    'TRIGGERS ON INSTALLMENTS TABLE (should have trigger_update_fee_on_installment_change):' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'installments';

SELECT 'Trigger cleanup complete!' as result;
