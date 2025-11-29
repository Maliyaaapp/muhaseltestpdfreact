-- COMPREHENSIVE FIX: Link installments to fees and students
-- This script fixes all orphaned installments and data integrity issues

-- Step 1: Link installments to fees based on student_id (UUID) and fee_type
UPDATE installments i
SET fee_id = f.id
FROM fees f
WHERE i.student_id = f.student_id
  AND i.fee_type = f.fee_type
  AND i.fee_id IS NULL
  AND i.student_id IS NOT NULL;

-- Step 2: Link by student_name and fee_type (case-insensitive)
UPDATE installments i
SET fee_id = f.id,
    student_id = f.student_id
FROM fees f
WHERE LOWER(TRIM(i.student_name)) = LOWER(TRIM(f.student_name))
  AND i.fee_type = f.fee_type
  AND i.fee_id IS NULL;

-- Step 3: Link by student number (from students table) and fee_type
UPDATE installments i
SET fee_id = f.id,
    student_id = f.student_id
FROM fees f
JOIN students s ON f.student_id = s.id
WHERE LOWER(TRIM(i.student_name)) = LOWER(TRIM(s.student_id))
  AND i.fee_type = f.fee_type
  AND i.fee_id IS NULL;

-- Step 4: Link by grade and fee_type for remaining orphans (last resort)
UPDATE installments i
SET fee_id = f.id,
    student_id = f.student_id
FROM fees f
WHERE i.grade = f.grade
  AND i.fee_type = f.fee_type
  AND i.fee_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM installments i2 
    WHERE i2.fee_id = f.id AND i2.id != i.id
  );

-- Step 5: Update student_id for installments that have fee_id but no student_id
UPDATE installments i
SET student_id = f.student_id
FROM fees f
WHERE i.fee_id = f.id
  AND i.student_id IS NULL;

-- Step 6: Fix student_name consistency
UPDATE installments i
SET student_name = s.name
FROM students s
WHERE i.student_id = s.id
  AND (i.student_name IS NULL OR i.student_name = '');

-- Step 5: Recalculate installment balances
UPDATE installments
SET balance = GREATEST(0, amount - COALESCE(paid_amount, 0)),
    status = CASE
        WHEN COALESCE(paid_amount, 0) = 0 THEN 'unpaid'
        WHEN COALESCE(paid_amount, 0) >= amount THEN 'paid'
        ELSE 'partial'
    END;

-- Step 6: Recalculate fee totals from installments
UPDATE fees f
SET paid = COALESCE((
    SELECT SUM(paid_amount)
    FROM installments
    WHERE fee_id = f.id
), 0),
balance = GREATEST(0, (amount - COALESCE(discount, 0)) - COALESCE((
    SELECT SUM(paid_amount)
    FROM installments
    WHERE fee_id = f.id
), 0)),
status = CASE
    WHEN COALESCE((SELECT SUM(paid_amount) FROM installments WHERE fee_id = f.id), 0) = 0 THEN 'unpaid'
    WHEN COALESCE((SELECT SUM(paid_amount) FROM installments WHERE fee_id = f.id), 0) >= (amount - COALESCE(discount, 0)) THEN 'paid'
    ELSE 'partial'
END;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Show results
SELECT 
    'Installments linked' as action,
    COUNT(*) as count
FROM installments
WHERE fee_id IS NOT NULL

UNION ALL

SELECT 
    'Orphaned installments' as action,
    COUNT(*) as count
FROM installments
WHERE fee_id IS NULL;
