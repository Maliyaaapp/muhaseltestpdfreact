-- Fix for the fee balance calculation trigger error
-- The issue is that the calculate_fee_balance() function is trying to access fee_id
-- from the fees table, but fees table uses 'id' not 'fee_id'

-- Create a separate function for fee table operations
CREATE OR REPLACE FUNCTION calculate_fee_balance_on_fee_update()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
BEGIN
    -- Get the fee amount from the updated record
    fee_amount := NEW.amount;
    
    -- Calculate total paid amount from all installments for this fee
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
    FROM installments 
    WHERE fee_id = NEW.id
    AND status = 'paid';
    
    -- Calculate new balance
    new_balance := fee_amount - total_paid;
    
    -- Determine new status
    IF total_paid = 0 THEN
        new_status := 'unpaid';
    ELSIF total_paid >= fee_amount THEN
        new_status := 'paid';
        new_balance := 0;
    ELSE
        new_status := 'partial';
    END IF;
    
    -- Update the current record with new balance and status
    NEW.paid := total_paid;
    NEW.balance := new_balance;
    NEW.status := new_status;
    NEW.updated_at := NOW();
    
    -- Log the balance calculation
    RAISE NOTICE 'Fee % balance updated: amount=%, paid=%, balance=%, status=%', 
        NEW.id, fee_amount, total_paid, new_balance, new_status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;

-- Create a new trigger that uses the correct function
CREATE TRIGGER trigger_calculate_fee_balance_on_fee_change
    BEFORE UPDATE OF amount ON fees
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance_on_fee_update();

-- Also create a trigger for any fee updates (not just amount changes)
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;
CREATE TRIGGER trigger_calculate_fee_balance_on_any_fee_update
    BEFORE UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance_on_fee_update();

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Fee balance trigger fixed successfully!' as result;