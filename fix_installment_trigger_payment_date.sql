-- Fix the distribute_combined_payment trigger to use paid_date instead of payment_date
-- The installments table uses 'paid_date' not 'payment_date'

CREATE OR REPLACE FUNCTION distribute_combined_payment()
RETURNS TRIGGER AS $$
DECLARE
    tuition_fee_id UUID;
    transportation_fee_id UUID;
    tuition_amount NUMERIC(10,2) := 0;
    transportation_amount NUMERIC(10,2) := 0;
    total_payment NUMERIC(10,2) := 0;
    tuition_payment NUMERIC(10,2) := 0;
    transportation_payment NUMERIC(10,2) := 0;
    student_id_val UUID;
BEGIN
    -- Only process if this is a combined fee payment
    IF NEW.fee_type = 'transportation_and_tuition' AND NEW.paid_amount > 0 THEN
        
        -- Get the student ID from the fee
        SELECT student_id INTO student_id_val
        FROM fees 
        WHERE id = NEW.fee_id;
        
        -- Find the individual tuition and transportation fees for this student
        SELECT id INTO tuition_fee_id
        FROM fees 
        WHERE student_id = student_id_val 
        AND fee_type = 'tuition'
        AND id != NEW.fee_id
        LIMIT 1;
        
        SELECT id INTO transportation_fee_id
        FROM fees 
        WHERE student_id = student_id_val 
        AND fee_type = 'transportation'
        AND id != NEW.fee_id
        LIMIT 1;
        
        -- Get the amounts for tuition and transportation fees
        IF tuition_fee_id IS NOT NULL THEN
            SELECT (amount - COALESCE(discount, 0)) INTO tuition_amount
            FROM fees 
            WHERE id = tuition_fee_id;
        END IF;
        
        IF transportation_fee_id IS NOT NULL THEN
            SELECT (amount - COALESCE(discount, 0)) INTO transportation_amount
            FROM fees 
            WHERE id = transportation_fee_id;
        END IF;
        
        -- Calculate payment distribution
        total_payment := NEW.paid_amount;
        
        -- Distribute payment proportionally or based on remaining balances
        IF tuition_amount > 0 AND transportation_amount > 0 THEN
            -- Calculate proportional distribution
            tuition_payment := (total_payment * tuition_amount) / (tuition_amount + transportation_amount);
            transportation_payment := total_payment - tuition_payment;
        ELSIF tuition_amount > 0 THEN
            -- Only tuition fee exists
            tuition_payment := total_payment;
            transportation_payment := 0;
        ELSIF transportation_amount > 0 THEN
            -- Only transportation fee exists
            transportation_payment := total_payment;
            tuition_payment := 0;
        END IF;
        
        -- Update tuition fee if it exists
        IF tuition_fee_id IS NOT NULL AND tuition_payment > 0 THEN
            UPDATE fees 
            SET 
                paid = COALESCE(paid, 0) + tuition_payment,
                balance = GREATEST(0, (amount - COALESCE(discount, 0)) - (COALESCE(paid, 0) + tuition_payment)),
                status = CASE 
                    WHEN (COALESCE(paid, 0) + tuition_payment) >= (amount - COALESCE(discount, 0)) THEN 'paid'
                    WHEN (COALESCE(paid, 0) + tuition_payment) > 0 THEN 'partial'
                    ELSE 'unpaid'
                END,
                payment_date = COALESCE(payment_date, NEW.paid_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, NEW.payment_method),
                payment_note = COALESCE(payment_note, 'دفع من رسوم مدمجة'),
                updated_at = NOW()
            WHERE id = tuition_fee_id;
        END IF;
        
        -- Update transportation fee if it exists
        IF transportation_fee_id IS NOT NULL AND transportation_payment > 0 THEN
            UPDATE fees 
            SET 
                paid = COALESCE(paid, 0) + transportation_payment,
                balance = GREATEST(0, (amount - COALESCE(discount, 0)) - (COALESCE(paid, 0) + transportation_payment)),
                status = CASE 
                    WHEN (COALESCE(paid, 0) + transportation_payment) >= (amount - COALESCE(discount, 0)) THEN 'paid'
                    WHEN (COALESCE(paid, 0) + transportation_payment) > 0 THEN 'partial'
                    ELSE 'unpaid'
                END,
                payment_date = COALESCE(payment_date, NEW.paid_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, NEW.payment_method),
                payment_note = COALESCE(payment_note, 'دفع من رسوم مدمجة'),
                updated_at = NOW()
            WHERE id = transportation_fee_id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_distribute_combined_payment ON installments;

CREATE TRIGGER trigger_distribute_combined_payment
    AFTER INSERT OR UPDATE ON installments
    FOR EACH ROW
    WHEN (NEW.fee_type = 'transportation_and_tuition' AND NEW.paid_amount > 0)
    EXECUTE FUNCTION distribute_combined_payment();
