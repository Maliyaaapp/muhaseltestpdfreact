-- COMPREHENSIVE FEE AND INSTALLMENT SYNCHRONIZATION FIX
-- This script addresses all synchronization issues between fees and installments
-- Run this in your Supabase SQL Editor to fix existing data

-- Step 1: Identify and log all synchronization issues
CREATE TEMP TABLE sync_issues AS
SELECT 
  f.id as fee_id,
  f.student_id,
  f.fee_type,
  f.amount as fee_amount,
  COALESCE(f.discount, 0) as fee_discount,
  f.paid as current_fee_paid,
  f.balance as current_fee_balance,
  f.status as current_fee_status,
  -- Calculate correct amounts from installments
  COALESCE(SUM(i.paid_amount), 0) as installment_total_paid,
  COUNT(i.id) as total_installments,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
  -- Calculate what the fee amounts should be
  (f.amount - COALESCE(f.discount, 0)) as expected_total,
  COALESCE(SUM(i.paid_amount), 0) as expected_paid,
  GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) as expected_balance,
  -- Determine issue type
  CASE 
    WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 'paid_mismatch'
    WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 'balance_mismatch'
    WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 'overpaid'
    WHEN f.status = 'paid' AND COALESCE(SUM(i.paid_amount), 0) < (f.amount - COALESCE(f.discount, 0)) THEN 'status_mismatch'
    WHEN f.status != CASE 
      WHEN COALESCE(SUM(i.paid_amount), 0) = 0 THEN 'unpaid'
      WHEN COALESCE(SUM(i.paid_amount), 0) >= (f.amount - COALESCE(f.discount, 0)) THEN 'paid'
      ELSE 'partial'
    END THEN 'status_incorrect'
    ELSE 'no_issue'
  END as issue_type
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id
GROUP BY f.id, f.student_id, f.fee_type, f.amount, f.discount, f.paid, f.balance, f.status;

-- Step 2: Log the issues found
DO $$
BEGIN
  RAISE NOTICE 'Synchronization Issues Found:';
  RAISE NOTICE 'Paid Mismatch: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'paid_mismatch');
  RAISE NOTICE 'Balance Mismatch: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'balance_mismatch');
  RAISE NOTICE 'Overpaid Fees: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'overpaid');
  RAISE NOTICE 'Status Mismatch: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'status_mismatch');
  RAISE NOTICE 'Status Incorrect: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'status_incorrect');
  RAISE NOTICE 'No Issues: %', (SELECT COUNT(*) FROM sync_issues WHERE issue_type = 'no_issue');
END $$;

-- Step 3: Fix overpaid fees (likely double counting)
UPDATE fees 
SET 
  paid = (
    SELECT LEAST(
      sync_issues.expected_total,
      sync_issues.installment_total_paid
    )
    FROM sync_issues 
    WHERE sync_issues.fee_id = fees.id
  ),
  balance = (
    SELECT GREATEST(0, 
      sync_issues.expected_total - LEAST(
        sync_issues.expected_total,
        sync_issues.installment_total_paid
      )
    )
    FROM sync_issues 
    WHERE sync_issues.fee_id = fees.id
  ),
  status = (
    SELECT CASE 
      WHEN LEAST(sync_issues.expected_total, sync_issues.installment_total_paid) = 0 THEN 'unpaid'
      WHEN LEAST(sync_issues.expected_total, sync_issues.installment_total_paid) >= sync_issues.expected_total THEN 'paid'
      ELSE 'partial'
    END
    FROM sync_issues 
    WHERE sync_issues.fee_id = fees.id
  )
WHERE id IN (
  SELECT fee_id FROM sync_issues 
  WHERE issue_type IN ('overpaid', 'paid_mismatch', 'balance_mismatch', 'status_mismatch', 'status_incorrect')
);

-- Step 4: Fix installments that don't match their fee's payment status
-- For fees that are marked as paid, ensure all installments are marked as paid
UPDATE installments 
SET 
  status = 'paid',
  paid_amount = amount,
  paid_date = COALESCE(
    paid_date,
    (SELECT payment_date FROM fees WHERE fees.id = installments.fee_id),
    CURRENT_DATE
  ),
  payment_method = COALESCE(
    payment_method,
    (SELECT payment_method FROM fees WHERE fees.id = installments.fee_id),
    'cash'
  ),
  payment_note = COALESCE(
    payment_note,
    (SELECT payment_note FROM fees WHERE fees.id = installments.fee_id),
    'تحديث تلقائي للمزامنة'
  )
WHERE fee_id IN (
  SELECT id FROM fees WHERE status = 'paid'
) AND status != 'paid';

-- Step 5: For fees with installments, recalculate fee totals from installments
UPDATE fees 
SET 
  paid = (
    SELECT COALESCE(SUM(i.paid_amount), 0)
    FROM installments i 
    WHERE i.fee_id = fees.id
  ),
  balance = GREATEST(0, 
    (amount - COALESCE(discount, 0)) - (
      SELECT COALESCE(SUM(i.paid_amount), 0)
      FROM installments i 
      WHERE i.fee_id = fees.id
    )
  ),
  status = (
    SELECT CASE 
      WHEN COALESCE(SUM(i.paid_amount), 0) = 0 THEN 'unpaid'
      WHEN COALESCE(SUM(i.paid_amount), 0) >= (fees.amount - COALESCE(fees.discount, 0)) THEN 'paid'
      ELSE 'partial'
    END
    FROM installments i 
    WHERE i.fee_id = fees.id
  )
WHERE id IN (
  SELECT DISTINCT fee_id FROM installments
);

-- Step 6: Handle installments with incorrect paid_amount
-- Fix installments where paid_amount > amount
UPDATE installments 
SET 
  paid_amount = amount,
  status = 'paid'
WHERE paid_amount > amount;

-- Step 7: Fix installments where status doesn't match paid_amount
UPDATE installments 
SET 
  status = CASE 
    WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
    WHEN COALESCE(paid_amount, 0) >= amount THEN 'paid'
    ELSE 'partial'
  END
WHERE status != CASE 
  WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
  WHEN COALESCE(paid_amount, 0) >= amount THEN 'paid'
  ELSE 'partial'
END;

-- Step 8: Final verification and logging
DO $$
DECLARE
  remaining_issues INTEGER;
BEGIN
  -- Count remaining issues
  SELECT COUNT(*) INTO remaining_issues
  FROM (
    SELECT 
      f.id,
      CASE 
        WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 'paid_mismatch'
        WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 'balance_mismatch'
        WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 'overpaid'
        ELSE 'no_issue'
      END as issue_type
    FROM fees f
    LEFT JOIN installments i ON f.id = i.fee_id
    GROUP BY f.id, f.amount, f.discount, f.paid, f.balance
  ) issues
  WHERE issue_type != 'no_issue';
  
  RAISE NOTICE 'Synchronization fix completed.';
  RAISE NOTICE 'Remaining issues: %', remaining_issues;
  
  IF remaining_issues = 0 THEN
    RAISE NOTICE 'All synchronization issues have been resolved!';
  ELSE
    RAISE NOTICE 'Some issues may require manual review.';
  END IF;
END $$;

-- Step 9: Clean up temporary table
DROP TABLE sync_issues;

-- Step 10: Create a view to monitor future synchronization issues
CREATE OR REPLACE VIEW fee_installment_sync_monitor AS
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
  -- Check for issues
  CASE 
    WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 'PAID_MISMATCH'
    WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 'BALANCE_MISMATCH'
    WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 'OVERPAID'
    WHEN f.status = 'paid' AND COALESCE(SUM(i.paid_amount), 0) < (f.amount - COALESCE(f.discount, 0)) THEN 'STATUS_MISMATCH'
    ELSE 'OK'
  END as sync_status,
  NOW() as checked_at
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id
GROUP BY f.id, f.student_name, f.fee_type, f.amount, f.discount, f.paid, f.balance, f.status
ORDER BY 
  CASE 
    WHEN f.paid != COALESCE(SUM(i.paid_amount), 0) THEN 1
    WHEN f.balance != GREATEST(0, (f.amount - COALESCE(f.discount, 0)) - COALESCE(SUM(i.paid_amount), 0)) THEN 2
    WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 3
    WHEN f.status = 'paid' AND COALESCE(SUM(i.paid_amount), 0) < (f.amount - COALESCE(f.discount, 0)) THEN 4
    ELSE 5
  END,
  f.student_name;

COMMENT ON VIEW fee_installment_sync_monitor IS 'Monitor view to detect synchronization issues between fees and installments. Run SELECT * FROM fee_installment_sync_monitor WHERE sync_status != ''OK'' to find issues.';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '=== COMPREHENSIVE FEE-INSTALLMENT SYNC FIX COMPLETED ===';
  RAISE NOTICE 'Use the following query to monitor future issues:';
  RAISE NOTICE 'SELECT * FROM fee_installment_sync_monitor WHERE sync_status != ''OK'';';
END $$;