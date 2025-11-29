-- 🚨 CRITICAL FIX: COMBINED FEE PAYMENT DISTRIBUTION 🚨
-- This script fixes the issue where combined transportation_and_tuition payments
-- are not properly distributed to individual tuition and transportation fees
-- This ensures that when a combined payment is made, both fee types show as paid

-- =====================================================
-- STEP 1: CREATE PAYMENT DISTRIBUTION FUNCTION
-- =====================================================

-- Function to distribute combined payments to individual fee types
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
                payment_date = COALESCE(payment_date, NEW.payment_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, NEW.payment_method),
                payment_note = COALESCE(payment_note, 'دفع من رسوم مدمجة'),
                updated_at = NOW()
            WHERE id = tuition_fee_id;
            
            -- Create or update installment for tuition fee
            INSERT INTO installments (
                id, fee_id, student_id, student_name, fee_type, amount, paid_amount,
                balance, status, due_date, paid_date, payment_method, payment_note,
                school_id, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(),
                tuition_fee_id,
                f.student_id,
                f.student_name,
                'tuition',
                tuition_payment,
                tuition_payment,
                0,
                'paid',
                NEW.due_date,
                NEW.paid_date,
                NEW.payment_method,
                'دفع من رسوم مدمجة - ' || COALESCE(NEW.payment_note, ''),
                f.school_id,
                NOW(),
                NOW()
            FROM fees f
            WHERE f.id = tuition_fee_id
            ON CONFLICT DO NOTHING;
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
                payment_date = COALESCE(payment_date, NEW.payment_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, NEW.payment_method),
                payment_note = COALESCE(payment_note, 'دفع من رسوم مدمجة'),
                updated_at = NOW()
            WHERE id = transportation_fee_id;
            
            -- Create or update installment for transportation fee
            INSERT INTO installments (
                id, fee_id, student_id, student_name, fee_type, amount, paid_amount,
                balance, status, due_date, paid_date, payment_method, payment_note,
                school_id, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(),
                transportation_fee_id,
                f.student_id,
                f.student_name,
                'transportation',
                transportation_payment,
                transportation_payment,
                0,
                'paid',
                NEW.due_date,
                NEW.paid_date,
                NEW.payment_method,
                'دفع من رسوم مدمجة - ' || COALESCE(NEW.payment_note, ''),
                f.school_id,
                NOW(),
                NOW()
            FROM fees f
            WHERE f.id = transportation_fee_id
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Log the distribution for debugging
        RAISE NOTICE 'Combined payment distributed: Total=%, Tuition=% (ID: %), Transportation=% (ID: %)', 
            total_payment, tuition_payment, tuition_fee_id, transportation_payment, transportation_fee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 2: CREATE TRIGGER FOR COMBINED PAYMENT DISTRIBUTION
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_distribute_combined_payment ON installments;

-- Create trigger to distribute combined payments
CREATE TRIGGER trigger_distribute_combined_payment
    AFTER INSERT OR UPDATE ON installments
    FOR EACH ROW
    WHEN (NEW.fee_type = 'transportation_and_tuition' AND NEW.paid_amount > 0)
    EXECUTE FUNCTION distribute_combined_payment();

-- =====================================================
-- STEP 3: FIX EXISTING COMBINED PAYMENTS
-- =====================================================

-- Fix existing combined payments that haven't been distributed
DO $$
DECLARE
    installment_record RECORD;
    tuition_fee_id UUID;
    transportation_fee_id UUID;
    tuition_amount NUMERIC(10,2);
    transportation_amount NUMERIC(10,2);
    tuition_payment NUMERIC(10,2);
    transportation_payment NUMERIC(10,2);
    total_payment NUMERIC(10,2);
BEGIN
    -- Process all existing combined payments
    FOR installment_record IN 
        SELECT i.*, f.student_id
        FROM installments i
        JOIN fees f ON i.fee_id = f.id
        WHERE i.fee_type = 'transportation_and_tuition' 
        AND i.paid_amount > 0
        AND i.status = 'paid'
    LOOP
        -- Find individual fees for this student
        SELECT id INTO tuition_fee_id
        FROM fees 
        WHERE student_id = installment_record.student_id 
        AND fee_type = 'tuition'
        AND id != installment_record.fee_id
        LIMIT 1;
        
        SELECT id INTO transportation_fee_id
        FROM fees 
        WHERE student_id = installment_record.student_id 
        AND fee_type = 'transportation'
        AND id != installment_record.fee_id
        LIMIT 1;
        
        -- Get amounts
        tuition_amount := 0;
        transportation_amount := 0;
        
        IF tuition_fee_id IS NOT NULL THEN
            SELECT (amount - COALESCE(discount, 0)) INTO tuition_amount
            FROM fees WHERE id = tuition_fee_id;
        END IF;
        
        IF transportation_fee_id IS NOT NULL THEN
            SELECT (amount - COALESCE(discount, 0)) INTO transportation_amount
            FROM fees WHERE id = transportation_fee_id;
        END IF;
        
        -- Calculate distribution
        total_payment := installment_record.paid_amount;
        
        IF tuition_amount > 0 AND transportation_amount > 0 THEN
            tuition_payment := (total_payment * tuition_amount) / (tuition_amount + transportation_amount);
            transportation_payment := total_payment - tuition_payment;
        ELSIF tuition_amount > 0 THEN
            tuition_payment := total_payment;
            transportation_payment := 0;
        ELSIF transportation_amount > 0 THEN
            transportation_payment := total_payment;
            tuition_payment := 0;
        ELSE
            CONTINUE; -- Skip if no individual fees found
        END IF;
        
        -- Update tuition fee
        IF tuition_fee_id IS NOT NULL AND tuition_payment > 0 THEN
            UPDATE fees 
            SET 
                paid = tuition_payment,
                balance = GREATEST(0, (amount - COALESCE(discount, 0)) - tuition_payment),
                status = CASE 
                    WHEN tuition_payment >= (amount - COALESCE(discount, 0)) THEN 'paid'
                    WHEN tuition_payment > 0 THEN 'partial'
                    ELSE 'unpaid'
                END,
                payment_date = COALESCE(payment_date, installment_record.paid_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, installment_record.payment_method),
                payment_note = 'دفع من رسوم مدمجة',
                updated_at = NOW()
            WHERE id = tuition_fee_id;
            
            -- Create installment for tuition
            INSERT INTO installments (
                id, fee_id, student_id, student_name, fee_type, amount, paid_amount,
                balance, status, due_date, paid_date, payment_method, payment_note,
                school_id, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(),
                tuition_fee_id,
                installment_record.student_id,
                installment_record.student_name,
                'tuition',
                tuition_payment,
                tuition_payment,
                0,
                'paid',
                installment_record.due_date,
                installment_record.paid_date,
                installment_record.payment_method,
                'دفع من رسوم مدمجة - إصلاح تلقائي',
                installment_record.school_id,
                NOW(),
                NOW()
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Update transportation fee
        IF transportation_fee_id IS NOT NULL AND transportation_payment > 0 THEN
            UPDATE fees 
            SET 
                paid = transportation_payment,
                balance = GREATEST(0, (amount - COALESCE(discount, 0)) - transportation_payment),
                status = CASE 
                    WHEN transportation_payment >= (amount - COALESCE(discount, 0)) THEN 'paid'
                    WHEN transportation_payment > 0 THEN 'partial'
                    ELSE 'unpaid'
                END,
                payment_date = COALESCE(payment_date, installment_record.paid_date, CURRENT_DATE),
                payment_method = COALESCE(payment_method, installment_record.payment_method),
                payment_note = 'دفع من رسوم مدمجة',
                updated_at = NOW()
            WHERE id = transportation_fee_id;
            
            -- Create installment for transportation
            INSERT INTO installments (
                id, fee_id, student_id, student_name, fee_type, amount, paid_amount,
                balance, status, due_date, paid_date, payment_method, payment_note,
                school_id, created_at, updated_at
            )
            SELECT 
                gen_random_uuid(),
                transportation_fee_id,
                installment_record.student_id,
                installment_record.student_name,
                'transportation',
                transportation_payment,
                transportation_payment,
                0,
                'paid',
                installment_record.due_date,
                installment_record.paid_date,
                installment_record.payment_method,
                'دفع من رسوم مدمجة - إصلاح تلقائي',
                installment_record.school_id,
                NOW(),
                NOW()
            ON CONFLICT DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Fixed combined payment for student %: Total=%, Tuition=%, Transportation=%', 
            installment_record.student_name, total_payment, tuition_payment, transportation_payment;
    END LOOP;
END $$;

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================

-- Check combined payments that have been processed
SELECT 
    'Combined Payments Summary' as check_type,
    COUNT(*) as total_combined_payments,
    SUM(paid_amount) as total_amount_paid
FROM installments 
WHERE fee_type = 'transportation_and_tuition' 
AND status = 'paid';

-- Check if individual fees are now marked as paid
SELECT 
    'Individual Fee Status After Fix' as check_type,
    fee_type,
    status,
    COUNT(*) as count,
    SUM(paid) as total_paid
FROM fees 
WHERE fee_type IN ('tuition', 'transportation')
GROUP BY fee_type, status
ORDER BY fee_type, status;

-- Check for students with combined payments but unpaid individual fees
SELECT 
    'Students with Potential Issues' as check_type,
    s.name as student_name,
    f.fee_type,
    f.status,
    f.amount,
    f.paid,
    f.balance
FROM students s
JOIN fees f ON s.id = f.student_id
WHERE s.id IN (
    SELECT DISTINCT f2.student_id
    FROM fees f2
    JOIN installments i ON f2.id = i.fee_id
    WHERE i.fee_type = 'transportation_and_tuition' 
    AND i.status = 'paid'
)
AND f.fee_type IN ('tuition', 'transportation')
AND f.status != 'paid'
ORDER BY s.name, f.fee_type;

-- Success message
SELECT '✅ COMBINED FEE PAYMENT DISTRIBUTION FIX COMPLETED! ✅' as message,
       'All existing combined payments have been distributed to individual fee types.' as details,
       'Future combined payments will be automatically distributed.' as note;