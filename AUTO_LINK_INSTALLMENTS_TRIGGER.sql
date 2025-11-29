-- AUTO-LINK TRIGGER: Automatically link installments to fees when created
-- This runs ONCE and works forever - no manual SQL needed after this

-- Function to auto-link installments to fees
CREATE OR REPLACE FUNCTION auto_link_installment_to_fee()
RETURNS TRIGGER AS $$
DECLARE
    matching_fee_id UUID;
BEGIN
    -- Only process if fee_id is NULL
    IF NEW.fee_id IS NULL THEN
        -- Try to find matching fee by student_id and fee_type
        SELECT id INTO matching_fee_id
        FROM fees
        WHERE student_id = NEW.student_id
          AND fee_type = NEW.fee_type
        LIMIT 1;
        
        -- If found, link it
        IF matching_fee_id IS NOT NULL THEN
            NEW.fee_id := matching_fee_id;
            RAISE NOTICE 'Auto-linked installment % to fee %', NEW.id, matching_fee_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_link_installment ON installments;

-- Create trigger that runs BEFORE INSERT
CREATE TRIGGER trigger_auto_link_installment
    BEFORE INSERT ON installments
    FOR EACH ROW
    EXECUTE FUNCTION auto_link_installment_to_fee();

-- Also fix existing orphaned installments (one-time cleanup)
UPDATE installments i
SET fee_id = f.id
FROM fees f
WHERE i.fee_id IS NULL
  AND i.student_id = f.student_id
  AND i.fee_type = f.fee_type;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Show results
SELECT 
    'Auto-link trigger created' as status,
    COUNT(*) as orphaned_installments_fixed
FROM installments
WHERE fee_id IS NOT NULL;
