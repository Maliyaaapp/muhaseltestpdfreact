-- Fix Double Payment Issue
-- This script corrects fees where paid amounts were incorrectly doubled
-- due to installment synchronization issues

-- Step 1: Backup current state (optional - uncomment if needed)
-- CREATE TABLE fees_backup_before_fix AS SELECT * FROM fees;

-- Step 2: Identify and analyze problematic fees
WITH fee_analysis AS (
  SELECT 
    f.id,
    f.student_id,
    f.amount,
    COALESCE(f.discount, 0) as discount,
    f.paid as current_paid,
    f.balance as current_balance,
    f.status,
    (f.amount - COALESCE(f.discount, 0)) as net_amount,
    COALESCE(SUM(i.paid_amount), 0) as installment_total_paid,
    COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END) as paid_installment_count,
    COUNT(i.id) as total_installment_count
  FROM fees f
  LEFT JOIN installments i ON f.id = i.fee_id
  GROUP BY f.id, f.student_id, f.amount, f.discount, f.paid, f.balance, f.status
),
problematic_fees AS (
  SELECT *,
    CASE 
      -- Case 1: Paid amount exceeds net amount
      WHEN current_paid > net_amount AND net_amount > 0 THEN 'exceeds_net_amount'
      -- Case 2: Paid amount is exactly double the installment total
      WHEN current_paid = (installment_total_paid * 2) AND installment_total_paid > 0 THEN 'double_installment_total'
      -- Case 3: Balance is negative
      WHEN current_balance < 0 THEN 'negative_balance'
      -- Case 4: Paid amount is double the net amount
      WHEN current_paid = (net_amount * 2) AND net_amount > 0 THEN 'double_net_amount'
      ELSE 'no_issue'
    END as issue_type,
    CASE
      -- Determine correct paid amount
      WHEN paid_installment_count > 0 THEN installment_total_paid
      WHEN current_paid > net_amount THEN LEAST(current_paid / 2, net_amount)
      ELSE current_paid
    END as suggested_paid_amount
  FROM fee_analysis
)

-- Step 3: Show analysis before fixing
SELECT 
  'ANALYSIS - Issues Found' as report_section,
  issue_type,
  COUNT(*) as affected_fees,
  SUM(current_paid) as total_current_paid,
  SUM(suggested_paid_amount) as total_suggested_paid,
  SUM(current_paid - suggested_paid_amount) as total_overpayment
FROM problematic_fees 
WHERE issue_type != 'no_issue'
GROUP BY issue_type;

-- Step 4: Apply the fixes
UPDATE fees 
SET 
  paid = (
    CASE
      -- If there are paid installments, use their sum
      WHEN (
        SELECT COUNT(*) 
        FROM installments 
        WHERE fee_id = fees.id AND paid_date IS NOT NULL
      ) > 0 THEN (
        SELECT COALESCE(SUM(paid_amount), 0) 
        FROM installments 
        WHERE fee_id = fees.id AND paid_date IS NOT NULL
      )
      -- If paid amount exceeds net amount, check if it's likely doubled
      WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) THEN (
        CASE 
          -- If paid is exactly double the net amount, halve it
          WHEN fees.paid = (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
            (fees.amount - COALESCE(fees.discount, 0))
          -- If paid is more than double, set to net amount
          WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
            (fees.amount - COALESCE(fees.discount, 0))
          -- Otherwise, try halving if result is reasonable
          WHEN fees.paid / 2 <= (fees.amount - COALESCE(fees.discount, 0)) THEN
            fees.paid / 2
          ELSE
            (fees.amount - COALESCE(fees.discount, 0))
        END
      )
      -- Otherwise keep current paid amount
      ELSE fees.paid
    END
  ),
  balance = (
    GREATEST(0, 
      (fees.amount - COALESCE(fees.discount, 0)) - 
      CASE
        WHEN (
          SELECT COUNT(*) 
          FROM installments 
          WHERE fee_id = fees.id AND paid_date IS NOT NULL
        ) > 0 THEN (
          SELECT COALESCE(SUM(paid_amount), 0) 
          FROM installments 
          WHERE fee_id = fees.id AND paid_date IS NOT NULL
        )
        WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) THEN (
          CASE 
            WHEN fees.paid = (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
              (fees.amount - COALESCE(fees.discount, 0))
            WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
              (fees.amount - COALESCE(fees.discount, 0))
            WHEN fees.paid / 2 <= (fees.amount - COALESCE(fees.discount, 0)) THEN
              fees.paid / 2
            ELSE
              (fees.amount - COALESCE(fees.discount, 0))
          END
        )
        ELSE fees.paid
      END
    )
  ),
  status = (
    CASE
      WHEN (
        CASE
          WHEN (
            SELECT COUNT(*) 
            FROM installments 
            WHERE fee_id = fees.id AND paid_date IS NOT NULL
          ) > 0 THEN (
            SELECT COALESCE(SUM(paid_amount), 0) 
            FROM installments 
            WHERE fee_id = fees.id AND paid_date IS NOT NULL
          )
          WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) THEN (
            CASE 
              WHEN fees.paid = (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
                (fees.amount - COALESCE(fees.discount, 0))
              WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
                (fees.amount - COALESCE(fees.discount, 0))
              WHEN fees.paid / 2 <= (fees.amount - COALESCE(fees.discount, 0)) THEN
                fees.paid / 2
              ELSE
                (fees.amount - COALESCE(fees.discount, 0))
            END
          )
          ELSE fees.paid
        END
      ) >= (fees.amount - COALESCE(fees.discount, 0)) THEN 'paid'
      WHEN (
        CASE
          WHEN (
            SELECT COUNT(*) 
            FROM installments 
            WHERE fee_id = fees.id AND paid_date IS NOT NULL
          ) > 0 THEN (
            SELECT COALESCE(SUM(paid_amount), 0) 
            FROM installments 
            WHERE fee_id = fees.id AND paid_date IS NOT NULL
          )
          WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) THEN (
            CASE 
              WHEN fees.paid = (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
                (fees.amount - COALESCE(fees.discount, 0))
              WHEN fees.paid > (fees.amount - COALESCE(fees.discount, 0)) * 2 THEN
                (fees.amount - COALESCE(fees.discount, 0))
              WHEN fees.paid / 2 <= (fees.amount - COALESCE(fees.discount, 0)) THEN
                fees.paid / 2
              ELSE
                (fees.amount - COALESCE(fees.discount, 0))
            END
          )
          ELSE fees.paid
        END
      ) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  )
WHERE 
  -- Only update fees that have issues
  fees.paid > (fees.amount - COALESCE(fees.discount, 0)) OR
  fees.balance < 0 OR
  fees.id IN (
    SELECT f.id 
    FROM fees f
    LEFT JOIN installments i ON f.id = i.fee_id AND i.paid_date IS NOT NULL
    GROUP BY f.id, f.paid
    HAVING f.paid = COALESCE(SUM(i.paid_amount), 0) * 2 AND COALESCE(SUM(i.paid_amount), 0) > 0
  );

-- Step 5: Verification - Show results after fixing
WITH verification_analysis AS (
  SELECT 
    f.id,
    f.amount,
    COALESCE(f.discount, 0) as discount,
    f.paid,
    f.balance,
    f.status,
    (f.amount - COALESCE(f.discount, 0)) as net_amount,
    COALESCE(SUM(i.paid_amount), 0) as installment_total_paid,
    COUNT(CASE WHEN i.paid_date IS NOT NULL THEN 1 END) as paid_installments,
    CASE 
      WHEN f.paid > (f.amount - COALESCE(f.discount, 0)) THEN 'STILL_INVALID'
      WHEN f.balance < 0 THEN 'NEGATIVE_BALANCE'
      WHEN f.paid + f.balance != (f.amount - COALESCE(f.discount, 0)) THEN 'MATH_ERROR'
      ELSE 'VALID'
    END as validation_status
  FROM fees f
  LEFT JOIN installments i ON f.id = i.fee_id
  GROUP BY f.id, f.amount, f.discount, f.paid, f.balance, f.status
)
SELECT 
  'VERIFICATION - After Fix' as report_section,
  validation_status,
  COUNT(*) as fee_count,
  SUM(paid) as total_paid,
  SUM(balance) as total_balance,
  SUM(net_amount) as total_net_amount,
  ROUND(AVG(paid), 2) as avg_paid
FROM verification_analysis
GROUP BY validation_status
ORDER BY validation_status;

-- Step 6: Show any remaining problematic fees
SELECT 
  'REMAINING ISSUES' as report_section,
  id as fee_id,
  amount,
  discount,
  paid,
  balance,
  status,
  (amount - COALESCE(discount, 0)) as net_amount,
  'Paid exceeds net amount' as issue
FROM fees
WHERE paid > (amount - COALESCE(discount, 0))
LIMIT 10;