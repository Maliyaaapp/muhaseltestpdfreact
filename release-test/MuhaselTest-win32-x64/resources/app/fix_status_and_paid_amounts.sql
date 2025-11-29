-- Emergency Fix for Status Display and Paid Amounts Issues
-- This script addresses the critical issues reported after the comprehensive sync script

-- 1. Fix installment statuses that should show proper Arabic labels
-- Update installments that have no paid amount and no paid date to 'unpaid' status
UPDATE installments 
SET status = 'unpaid'
WHERE (paid_amount IS NULL OR paid_amount = 0) 
  AND paid_date IS NULL 
  AND status != 'unpaid';

-- 2. Ensure installments with paid amounts have correct status
UPDATE installments 
SET status = CASE 
  WHEN paid_amount >= amount THEN 'paid'
  WHEN paid_amount > 0 AND paid_amount < amount THEN 'partial'
  ELSE status
END
WHERE paid_amount > 0;

-- 3. Fix installments that have paid_date but no paid_amount
UPDATE installments 
SET paid_amount = amount,
    status = 'paid'
WHERE paid_date IS NOT NULL 
  AND (paid_amount IS NULL OR paid_amount = 0)
  AND amount > 0;

-- 4. Restore CSV-imported paid amounts that were incorrectly set to 0
-- This identifies installments that should have paid amounts based on their status
UPDATE installments 
SET paid_amount = amount
WHERE status = 'paid' 
  AND (paid_amount IS NULL OR paid_amount = 0)
  AND paid_date IS NOT NULL;

-- 5. Recalculate fee totals from installments to ensure synchronization
UPDATE fees 
SET paid = COALESCE((
  SELECT SUM(COALESCE(i.paid_amount, 0))
  FROM installments i 
  WHERE i.fee_id = fees.id
), 0),
balance = (amount - COALESCE(discount, 0)) - COALESCE((
  SELECT SUM(COALESCE(i.paid_amount, 0))
  FROM installments i 
  WHERE i.fee_id = fees.id
), 0),
status = CASE 
  WHEN COALESCE((
    SELECT SUM(COALESCE(i.paid_amount, 0))
    FROM installments i 
    WHERE i.fee_id = fees.id
  ), 0) >= (amount - COALESCE(discount, 0)) THEN 'paid'
  WHEN COALESCE((
    SELECT SUM(COALESCE(i.paid_amount, 0))
    FROM installments i 
    WHERE i.fee_id = fees.id
  ), 0) > 0 THEN 'partial'
  ELSE 'unpaid'
END;

-- 6. Verification queries to check the fixes
SELECT 'Installment Status Distribution' as check_type,
       status,
       COUNT(*) as count
FROM installments 
GROUP BY status
ORDER BY status;

SELECT 'Fee Status Distribution' as check_type,
       status,
       COUNT(*) as count
FROM fees 
GROUP BY status
ORDER BY status;

SELECT 'Installments with Paid Amount Issues' as check_type,
       COUNT(*) as count
FROM installments 
WHERE (status = 'paid' AND (paid_amount IS NULL OR paid_amount = 0))
   OR (status = 'unpaid' AND paid_amount > 0);

SELECT 'Fees with Synchronization Issues' as check_type,
       COUNT(*) as count
FROM fees f
WHERE f.paid != COALESCE((
  SELECT SUM(COALESCE(i.paid_amount, 0))
  FROM installments i 
  WHERE i.fee_id = f.id
), 0);

-- 7. Show sample of fixed data
SELECT 'Sample Fixed Installments' as check_type,
       student_name,
       fee_type,
       amount,
       paid_amount,
       status,
       paid_date
FROM installments 
WHERE status IN ('paid', 'partial', 'unpaid')
ORDER BY student_name, fee_type
LIMIT 10;

COMMIT;