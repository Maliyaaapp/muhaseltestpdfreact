-- FIX INSTALLMENT SYNCHRONIZATION FOR EXISTING PAID FEES
-- This script updates installments to match the payment status of their parent fees
-- Run this in your Supabase SQL Editor to fix existing data

-- Update installments for fees that are marked as 'paid' but have unpaid installments
UPDATE installments 
SET 
  status = 'paid',
  paid_amount = amount,
  paid_date = COALESCE(
    (SELECT payment_date FROM fees WHERE fees.id = installments.fee_id),
    CURRENT_DATE
  ),
  payment_method = COALESCE(
    (SELECT payment_method FROM fees WHERE fees.id = installments.fee_id),
    'cash'
  ),
  payment_note = COALESCE(
    (SELECT payment_note FROM fees WHERE fees.id = installments.fee_id),
    'تحديث تلقائي للمزامنة'
  ),
  check_number = (SELECT check_number FROM fees WHERE fees.id = installments.fee_id),
  check_date = (SELECT check_date FROM fees WHERE fees.id = installments.fee_id),
  bank_name_arabic = (SELECT bank_name_arabic FROM fees WHERE fees.id = installments.fee_id),
  bank_name_english = (SELECT bank_name_english FROM fees WHERE fees.id = installments.fee_id),
  updated_at = NOW()
WHERE fee_id IN (
  SELECT id FROM fees WHERE status = 'paid'
)
AND status != 'paid';

-- Update installments for fees that are marked as 'partial' 
-- Set installment paid amounts proportionally based on fee paid amount
WITH partial_fee_data AS (
  SELECT 
    f.id as fee_id,
    f.paid as fee_paid_amount,
    f.amount as fee_total_amount,
    f.payment_date,
    f.payment_method,
    f.payment_note,
    f.check_number,
    f.check_date,
    f.bank_name_arabic,
    f.bank_name_english,
    COUNT(i.id) as installment_count,
    SUM(i.amount) as total_installment_amount
  FROM fees f
  JOIN installments i ON f.id = i.fee_id
  WHERE f.status = 'partial' AND f.paid > 0
  GROUP BY f.id, f.paid, f.amount, f.payment_date, f.payment_method, f.payment_note, f.check_number, f.check_date, f.bank_name_arabic, f.bank_name_english
),
installment_updates AS (
  SELECT 
    i.id as installment_id,
    pfd.fee_id,
    i.amount as installment_amount,
    -- Calculate proportional payment for this installment
    ROUND((i.amount * pfd.fee_paid_amount / pfd.total_installment_amount), 2) as calculated_paid_amount,
    pfd.payment_date,
    pfd.payment_method,
    pfd.payment_note,
    pfd.check_number,
    pfd.check_date,
    pfd.bank_name_arabic,
    pfd.bank_name_english,
    ROW_NUMBER() OVER (PARTITION BY pfd.fee_id ORDER BY i.due_date, i.installment_number) as rn
  FROM partial_fee_data pfd
  JOIN installments i ON pfd.fee_id = i.fee_id
)
UPDATE installments
SET 
  paid_amount = CASE 
    WHEN iu.calculated_paid_amount >= iu.installment_amount THEN iu.installment_amount
    ELSE iu.calculated_paid_amount
  END,
  status = CASE 
    WHEN iu.calculated_paid_amount >= iu.installment_amount THEN 'paid'
    WHEN iu.calculated_paid_amount > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  paid_date = CASE 
    WHEN iu.calculated_paid_amount >= iu.installment_amount THEN iu.payment_date
    ELSE NULL
  END,
  payment_method = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN iu.payment_method
    ELSE installments.payment_method
  END,
  payment_note = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN COALESCE(iu.payment_note, 'تحديث تلقائي للمزامنة')
    ELSE installments.payment_note
  END,
  check_number = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN iu.check_number
    ELSE installments.check_number
  END,
  check_date = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN iu.check_date
    ELSE installments.check_date
  END,
  bank_name_arabic = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN iu.bank_name_arabic
    ELSE installments.bank_name_arabic
  END,
  bank_name_english = CASE 
    WHEN iu.calculated_paid_amount > 0 THEN iu.bank_name_english
    ELSE installments.bank_name_english
  END,
  updated_at = NOW()
FROM installment_updates iu
WHERE installments.id = iu.installment_id;

-- Update fees to ensure their status matches their installments
-- This handles cases where installment payments might have been made but fee status wasn't updated
WITH fee_installment_summary AS (
  SELECT 
    f.id as fee_id,
    f.amount as fee_amount,
    f.discount as fee_discount,
    COALESCE(SUM(i.paid_amount), 0) as total_paid_from_installments,
    COUNT(i.id) as total_installments,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments
  FROM fees f
  LEFT JOIN installments i ON f.id = i.fee_id
  GROUP BY f.id, f.amount, f.discount
)
UPDATE fees
SET 
  paid = fis.total_paid_from_installments,
  balance = GREATEST(0, fis.fee_amount - COALESCE(fis.fee_discount, 0) - fis.total_paid_from_installments),
  status = CASE 
    WHEN fis.total_paid_from_installments >= (fis.fee_amount - COALESCE(fis.fee_discount, 0)) THEN 'paid'
    WHEN fis.total_paid_from_installments > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  updated_at = NOW()
FROM fee_installment_summary fis
WHERE fees.id = fis.fee_id
AND (
  fees.paid != fis.total_paid_from_installments OR
  fees.balance != GREATEST(0, fis.fee_amount - COALESCE(fis.fee_discount, 0) - fis.total_paid_from_installments) OR
  fees.status != CASE 
    WHEN fis.total_paid_from_installments >= (fis.fee_amount - COALESCE(fis.fee_discount, 0)) THEN 'paid'
    WHEN fis.total_paid_from_installments > 0 THEN 'partial'
    ELSE 'unpaid'
  END
);

-- Show summary of changes made
SELECT 
  'Synchronization Complete' as status,
  COUNT(CASE WHEN f.status = 'paid' THEN 1 END) as paid_fees,
  COUNT(CASE WHEN f.status = 'partial' THEN 1 END) as partial_fees,
  COUNT(CASE WHEN f.status = 'unpaid' THEN 1 END) as unpaid_fees,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
  COUNT(CASE WHEN i.status = 'partial' THEN 1 END) as partial_installments,
  COUNT(CASE WHEN i.status = 'unpaid' THEN 1 END) as unpaid_installments
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id;

-- Success message
SELECT 'Fee and installment synchronization completed! Your existing data has been fixed.' as message;