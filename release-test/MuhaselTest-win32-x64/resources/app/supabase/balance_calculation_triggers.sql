-- Balance Calculation Triggers
-- This script creates triggers to automatically calculate and update balances
-- when fees and installments are modified

-- Function to calculate fee balance based on installments
CREATE OR REPLACE FUNCTION calculate_fee_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
BEGIN
    -- Get the fee amount
    SELECT amount INTO fee_amount 
    FROM fees 
    WHERE id = COALESCE(NEW.fee_id, OLD.fee_id);
    
    -- Calculate total paid amount from all installments for this fee
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
    FROM installments 
    WHERE fee_id = COALESCE(NEW.fee_id, OLD.fee_id)
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
    
    -- Update the fee with new balance and status
    UPDATE fees 
    SET 
        paid = total_paid,
        balance = new_balance,
        status = new_status,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.fee_id, OLD.fee_id);
    
    -- Log the balance calculation
    RAISE NOTICE 'Fee % balance updated: amount=%, paid=%, balance=%, status=%', 
        COALESCE(NEW.fee_id, OLD.fee_id), fee_amount, total_paid, new_balance, new_status;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update installment balance when paid amount changes
CREATE OR REPLACE FUNCTION calculate_installment_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate balance for the installment
    NEW.balance := NEW.amount - COALESCE(NEW.paid_amount, 0);
    
    -- Update status based on payment
    IF NEW.paid_amount IS NULL OR NEW.paid_amount = 0 THEN
        NEW.status := 'unpaid';
    ELSIF NEW.paid_amount >= NEW.amount THEN
        NEW.status := 'paid';
        NEW.balance := 0;
    ELSE
        NEW.status := 'partial';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_installment_change ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_installment_balance ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;

-- Create trigger to recalculate fee balance when installments change
CREATE TRIGGER trigger_calculate_fee_balance_on_installment_change
    AFTER INSERT OR UPDATE OR DELETE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance();

-- Create trigger to calculate installment balance before insert/update
CREATE TRIGGER trigger_calculate_installment_balance
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_installment_balance();

-- Create trigger to ensure fee balance is calculated when fee amount changes
CREATE TRIGGER trigger_calculate_fee_balance_on_fee_change
    AFTER UPDATE OF amount ON fees
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance();

-- Function to fix existing balances (run once)
CREATE OR REPLACE FUNCTION fix_existing_balances()
RETURNS TEXT AS $$
DECLARE
    fee_record RECORD;
    installment_record RECORD;
    total_paid NUMERIC(10, 2);
    new_balance NUMERIC(10, 2);
    new_status TEXT;
    updated_fees INTEGER := 0;
    updated_installments INTEGER := 0;
BEGIN
    -- Fix installment balances first
    FOR installment_record IN 
        SELECT id, amount, paid_amount FROM installments
    LOOP
        UPDATE installments 
        SET 
            balance = amount - COALESCE(paid_amount, 0),
            status = CASE 
                WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
                WHEN paid_amount >= amount THEN 'paid'
                ELSE 'partial'
            END
        WHERE id = installment_record.id;
        
        updated_installments := updated_installments + 1;
    END LOOP;
    
    -- Fix fee balances based on installments
    FOR fee_record IN 
        SELECT id, amount FROM fees
    LOOP
        -- Calculate total paid from installments
        SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
        FROM installments 
        WHERE fee_id = fee_record.id AND status = 'paid';
        
        -- Calculate balance and status
        new_balance := fee_record.amount - total_paid;
        
        IF total_paid = 0 THEN
            new_status := 'unpaid';
        ELSIF total_paid >= fee_record.amount THEN
            new_status := 'paid';
            new_balance := 0;
        ELSE
            new_status := 'partial';
        END IF;
        
        -- Update fee
        UPDATE fees 
        SET 
            paid = total_paid,
            balance = new_balance,
            status = new_status,
            updated_at = NOW()
        WHERE id = fee_record.id;
        
        updated_fees := updated_fees + 1;
    END LOOP;
    
    RETURN format('Fixed %s fees and %s installments', updated_fees, updated_installments);
END;
$$ LANGUAGE plpgsql;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Balance calculation triggers created successfully! Run SELECT fix_existing_balances(); to fix existing data.' as message;