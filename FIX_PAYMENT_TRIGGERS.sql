-- COMPLETE FIX FOR PAYMENT TRIGGERS
-- This ensures fees are updated when installments are created/updated

-- 1. Function to update fee when installments change
CREATE OR REPLACE FUNCTION update_fee_from_installments()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    fee_discount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
    target_fee_id UUID;
BEGIN
    -- Determine which fee_id to update
    IF TG_OP = 'DELETE' THEN
        target_fee_id := OLD.fee_id;
    ELSE
        target_fee_id := NEW.fee_id;
    END IF;
    
    -- Get the fee details
    SELECT amount, COALESCE(discount, 0) 
    INTO fee_amount, fee_discount
    FROM fees 
    WHERE id = target_fee_id;
    
    -- Calculate total paid from all installments
    SELECT COALESCE(SUM(paid_amount), 0) 
    INTO total_paid
    FROM installments 
    WHERE fee_id = target_fee_id;
    
    -- Calculate net amount and balance
    fee_amount := fee_amount - fee_discount;
    new_balance := GREATEST(0, fee_amount - total_paid);
    
    -- Determine status
    IF total_paid = 0 THEN
        new_status := 'unpaid';
    ELSIF total_paid >= fee_amount THEN
        new_status := 'paid';
        new_balance := 0;
    ELSE
        new_status := 'partial';
    END IF;
    
    -- Update the fee
    UPDATE fees 
    SET 
        paid = total_paid,
        balance = new_balance,
        status = new_status,
        updated_at = NOW()
    WHERE id = target_fee_id;
    
    RAISE NOTICE 'Fee % updated from installments: paid=%, balance=%, status=%', 
        target_fee_id, total_paid, new_balance, new_status;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_fee_on_installment_change ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_installment_change ON installments;

-- 3. Create trigger on installments table
CREATE TRIGGER trigger_update_fee_on_installment_change
    AFTER INSERT OR UPDATE OR DELETE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_from_installments();

-- 4. Function to calculate fee balance on direct fee updates
CREATE OR REPLACE FUNCTION calculate_fee_balance_on_fee_update()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
BEGIN
    -- Get the fee amount (after discount)
    fee_amount := NEW.amount - COALESCE(NEW.discount, 0);
    
    -- Calculate total paid amount from all installments
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
    FROM installments 
    WHERE fee_id = NEW.id;
    
    -- If no installments exist and paid is being set directly, use that value
    IF total_paid = 0 AND NEW.paid > 0 THEN
        total_paid := NEW.paid;
    END IF;
    
    -- Calculate new balance
    new_balance := GREATEST(0, fee_amount - total_paid);
    
    -- Determine new status
    IF total_paid = 0 THEN
        new_status := 'unpaid';
    ELSIF total_paid >= fee_amount THEN
        new_status := 'paid';
        new_balance := 0;
    ELSE
        new_status := 'partial';
    END IF;
    
    -- Update the current record
    NEW.paid := total_paid;
    NEW.balance := new_balance;
    NEW.status := new_status;
    NEW.updated_at := NOW();
    
    RAISE NOTICE 'Fee % balance calculated: amount=%, paid=%, balance=%, status=%', 
        NEW.id, fee_amount, total_paid, new_balance, new_status;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop existing fee triggers
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_update ON fees;

-- 6. Create trigger on fees table (only for direct updates, not when triggered by installments)
CREATE TRIGGER trigger_calculate_fee_balance_on_fee_update
    BEFORE UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance_on_fee_update();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Payment triggers fixed successfully!' as result;
