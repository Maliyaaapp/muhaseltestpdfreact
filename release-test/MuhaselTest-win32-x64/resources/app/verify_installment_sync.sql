-- VERIFICATION SCRIPT FOR INSTALLMENT SYNCHRONIZATION
-- Run this after the fix_installment_sync.sql to verify everything is working correctly

-- Check for any fees that are paid but have unpaid installments
SELECT 
  'Fees marked as paid but with unpaid installments' as issue_type,
  COUNT(*) as count
FROM fees f
JOIN installments i ON f.id = i.fee_id
WHERE f.status = 'paid' AND i.status != 'paid';

-- Check for any installments that are paid but their parent fee is not marked as paid
SELECT 
  'Installments paid but parent fee not marked as paid' as issue_type,
  COUNT(DISTINCT f.id) as count
FROM fees f
JOIN installments i ON f.id = i.fee_id
WHERE i.status = 'paid' AND f.status != 'paid'
AND NOT EXISTS (
  SELECT 1 FROM installments i2 
  WHERE i2.fee_id = f.id AND i2.status != 'paid'
);

-- Check for fees where paid amount doesn't match sum of installment paid amounts
SELECT 
  'Fees with mismatched paid amounts' as issue_type,
  COUNT(*) as count
FROM (
  SELECT 
    f.id,
    f.paid as fee_paid,
    COALESCE(SUM(i.paid_amount), 0) as installment_total_paid
  FROM fees f
  LEFT JOIN installments i ON f.id = i.fee_id
  GROUP BY f.id, f.paid
  HAVING ABS(f.paid - COALESCE(SUM(i.paid_amount), 0)) > 0.01
) mismatched;

-- Show overall summary
SELECT 
  'SUMMARY' as section,
  COUNT(CASE WHEN f.status = 'paid' THEN 1 END) as total_paid_fees,
  COUNT(CASE WHEN f.status = 'partial' THEN 1 END) as total_partial_fees,
  COUNT(CASE WHEN f.status = 'unpaid' THEN 1 END) as total_unpaid_fees,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as total_paid_installments,
  COUNT(CASE WHEN i.status = 'partial' THEN 1 END) as total_partial_installments,
  COUNT(CASE WHEN i.status = 'unpaid' THEN 1 END) as total_unpaid_installments
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id;

-- Show sample of synchronized data
SELECT 
  'SAMPLE DATA' as section,
  f.student_name,
  f.fee_type,
  f.amount as fee_amount,
  f.paid as fee_paid,
  f.status as fee_status,
  i.installment_number,
  i.amount as installment_amount,
  i.paid_amount as installment_paid,
  i.status as installment_status
FROM fees f
JOIN installments i ON f.id = i.fee_id
WHERE f.status IN ('paid', 'partial')
ORDER BY f.student_name, f.fee_type, i.installment_number
LIMIT 10;

SELECT 'Verification complete. If all counts above are 0, synchronization is working correctly!' as result;