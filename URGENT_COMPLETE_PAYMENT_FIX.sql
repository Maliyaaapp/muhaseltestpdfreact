-- URGENT COMPLETE PAYMENT SYSTEM FIX
-- This script contains ALL missing SQL components to fix your payment system
-- Run this IMMEDIATELY in your Supabase SQL Editor to deploy your app

-- =====================================================
-- STEP 1: ADD ALL MISSING COLUMNS (CRITICAL FOR PGRST204 ERRORS)
-- =====================================================

-- Add missing columns to fees table
ALTER TABLE fees ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS transportation_type TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT;
ALTER TABLE fees ADD COLUMN IF NOT EXISTS bank_name_english TEXT;

-- Add missing columns to installments table
ALTER TABLE installments ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS installment_month TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_number TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS check_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_arabic TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS bank_name_english TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- =====================================================
-- STEP 2: COMPLETE PAYMENT TRIGGERS SYSTEM
-- =====================================================

-- Function to calculate installment balance and status
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
        -- Set paid_date if not already set
        IF NEW.paid_date IS NULL THEN
            NEW.paid_date := CURRENT_DATE;
        END IF;
    ELSE
        NEW.status := 'partial';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fee balance based on installments
CREATE OR REPLACE FUNCTION calculate_fee_balance()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    fee_discount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
    fee_id_to_update UUID;
BEGIN
    -- Get fee_id from the installment
    fee_id_to_update := COALESCE(NEW.fee_id, OLD.fee_id);
    
    -- Get the fee amount and discount
    SELECT amount, COALESCE(discount, 0) INTO fee_amount, fee_discount
    FROM fees 
    WHERE id = fee_id_to_update;
    
    -- Calculate total paid amount from all installments for this fee
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
    FROM installments 
    WHERE fee_id = fee_id_to_update;
    
    -- Calculate new balance
    new_balance := GREATEST(0, (fee_amount - fee_discount) - total_paid);
    
    -- Determine new status
    IF total_paid = 0 THEN
        new_status := 'unpaid';
    ELSIF total_paid >= (fee_amount - fee_discount) THEN
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
    WHERE id = fee_id_to_update;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function for fee balance calculation on fee updates
CREATE OR REPLACE FUNCTION calculate_fee_balance_on_fee_update()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(10, 2) := 0;
    fee_amount NUMERIC(10, 2) := 0;
    fee_discount NUMERIC(10, 2) := 0;
    new_balance NUMERIC(10, 2) := 0;
    new_status TEXT := 'unpaid';
BEGIN
    -- Get the fee amount and discount from the updated record
    fee_amount := NEW.amount;
    fee_discount := COALESCE(NEW.discount, 0);
    
    -- Calculate total paid amount from all installments for this fee
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_paid
    FROM installments 
    WHERE fee_id = NEW.id;
    
    -- Calculate new balance
    new_balance := GREATEST(0, (fee_amount - fee_discount) - total_paid);
    
    -- Determine new status
    IF total_paid = 0 THEN
        new_status := 'unpaid';
    ELSIF total_paid >= (fee_amount - fee_discount) THEN
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_installment_change ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_installment_balance ON installments;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_fee_change ON fees;
DROP TRIGGER IF EXISTS trigger_calculate_fee_balance_on_any_fee_update ON fees;

-- Create triggers for real-time balance calculation
CREATE TRIGGER trigger_calculate_installment_balance
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_installment_balance();

CREATE TRIGGER trigger_calculate_fee_balance_on_installment_change
    AFTER INSERT OR UPDATE OR DELETE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance();

CREATE TRIGGER trigger_calculate_fee_balance_on_fee_update
    BEFORE UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION calculate_fee_balance_on_fee_update();

-- =====================================================
-- STEP 3: PAYMENT VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate payment amounts
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent negative payments
    IF NEW.paid_amount < 0 THEN
        RAISE EXCEPTION 'Payment amount cannot be negative';
    END IF;
    
    -- Prevent overpayment (allow small tolerance for rounding)
    IF NEW.paid_amount > (NEW.amount + 0.01) THEN
        RAISE EXCEPTION 'Payment amount cannot exceed installment amount';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_payment_amount
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_amount();

-- =====================================================
-- STEP 4: AUTOMATED RECEIPT NUMBERING
-- =====================================================

-- Function to generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    school_settings RECORD;
    next_number INTEGER;
    receipt_num TEXT;
BEGIN
    -- Only generate receipt number for paid installments
    IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
        -- Get school settings for receipt numbering
        SELECT * INTO school_settings
        FROM settings
        WHERE school_id = (
            SELECT school_id FROM fees WHERE id = NEW.fee_id
        )
        LIMIT 1;
        
        IF school_settings IS NOT NULL THEN
            -- Get next receipt number
            next_number := COALESCE(school_settings.installment_receipt_number_current, 1);
            
            -- Format receipt number
            receipt_num := COALESCE(school_settings.installment_receipt_number_prefix, '') || 
                          next_number::TEXT || 
                          COALESCE(school_settings.installment_receipt_number_suffix, '');
            
            -- Update installment with receipt number
            NEW.receipt_number := receipt_num;
            
            -- Update settings with next number
            UPDATE settings 
            SET installment_receipt_number_current = next_number + 1
            WHERE school_id = school_settings.school_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_receipt_number
    BEFORE INSERT OR UPDATE ON installments
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_number();

-- =====================================================
-- STEP 5: FIX EXISTING DATA
-- =====================================================

-- Fix existing installment balances
UPDATE installments 
SET 
    balance = amount - COALESCE(paid_amount, 0),
    status = CASE 
        WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
        WHEN paid_amount >= amount THEN 'paid'
        ELSE 'partial'
    END
WHERE balance IS NULL OR balance != (amount - COALESCE(paid_amount, 0));

-- Fix existing fee balances
WITH fee_calculations AS (
    SELECT 
        f.id,
        f.amount,
        COALESCE(f.discount, 0) as discount,
        COALESCE(SUM(i.paid_amount), 0) as total_paid
    FROM fees f
    LEFT JOIN installments i ON f.id = i.fee_id
    GROUP BY f.id, f.amount, f.discount
)
UPDATE fees 
SET 
    paid = fc.total_paid,
    balance = GREATEST(0, (fc.amount - fc.discount) - fc.total_paid),
    status = CASE 
        WHEN fc.total_paid = 0 THEN 'unpaid'
        WHEN fc.total_paid >= (fc.amount - fc.discount) THEN 'paid'
        ELSE 'partial'
    END
FROM fee_calculations fc
WHERE fees.id = fc.id;

-- =====================================================
-- STEP 6: MONITORING VIEW
-- =====================================================

CREATE OR REPLACE VIEW payment_health_monitor AS
SELECT 
    f.id as fee_id,
    f.student_name,
    f.fee_type,
    f.amount as fee_amount,
    COALESCE(f.discount, 0) as fee_discount,
    f.paid as fee_paid,
    f.balance as fee_balance,
    f.status as fee_status,
    COALESCE(SUM(i.paid_amount), 0) as installment_total_paid,
    COUNT(i.id) as total_installments,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
    -- Health check
    CASE 
        WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 'PAID_MISMATCH'
        WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 'BALANCE_MISMATCH'
        WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 'OVERPAID'
        ELSE 'HEALTHY'
    END as health_status
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id
GROUP BY f.id, f.student_name, f.fee_type, f.amount, f.discount, f.paid, f.balance, f.status
ORDER BY 
    CASE 
        WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 1
        WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 2
        WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 3
        ELSE 4
    END,
    f.student_name;

-- =====================================================
-- STEP 7: REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'URGENT PAYMENT SYSTEM FIX COMPLETED!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'All missing columns added';
    RAISE NOTICE 'Payment triggers installed';
    RAISE NOTICE 'Existing data fixed';
    RAISE NOTICE 'Monitoring system active';
    RAISE NOTICE '';
    RAISE NOTICE 'YOUR APP IS NOW READY TO DEPLOY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Clear browser cache';
    RAISE NOTICE '2. Test payment functionality';
    RAISE NOTICE '3. Deploy your app';
    RAISE NOTICE '';
    RAISE NOTICE 'Monitor health: SELECT * FROM payment_health_monitor WHERE health_status != ''HEALTHY'';';
END $$;

SELECT 'URGENT FIX COMPLETED - YOUR APP IS READY!' as status;