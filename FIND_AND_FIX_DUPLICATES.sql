-- =====================================================
-- FIND AND FIX DUPLICATE RECORDS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Find duplicate fees (same student_id, fee_type, amount)
SELECT 
  student_id, 
  fee_type, 
  amount,
  COUNT(*) as duplicate_count,
  array_agg(id) as duplicate_ids
FROM fees
GROUP BY student_id, fee_type, amount
HAVING COUNT(*) > 1;

-- Step 2: Find duplicate installments (same student_id, fee_type, due_date, amount)
SELECT 
  student_id, 
  fee_type, 
  due_date,
  amount,
  COUNT(*) as duplicate_count,
  array_agg(id) as duplicate_ids
FROM installments
GROUP BY student_id, fee_type, due_date, amount
HAVING COUNT(*) > 1;

-- =====================================================
-- TO DELETE DUPLICATES (KEEP THE OLDEST ONE):
-- Uncomment and run these CAREFULLY after reviewing above
-- =====================================================

-- Delete duplicate fees (keeps the oldest by created_at)
/*
DELETE FROM fees
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, fee_type, amount
        ORDER BY created_at ASC
      ) as row_num
    FROM fees
  ) t
  WHERE t.row_num > 1
);
*/

-- Delete duplicate installments (keeps the oldest by created_at)
/*
DELETE FROM installments
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, fee_type, due_date, amount
        ORDER BY created_at ASC
      ) as row_num
    FROM installments
  ) t
  WHERE t.row_num > 1
);
*/

-- =====================================================
-- ALTERNATIVE: Delete duplicates keeping the one with most data
-- =====================================================

-- Delete duplicate fees (keeps the one with highest paid amount)
/*
DELETE FROM fees
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, fee_type, amount
        ORDER BY COALESCE(paid, 0) DESC, created_at ASC
      ) as row_num
    FROM fees
  ) t
  WHERE t.row_num > 1
);
*/

-- Delete duplicate installments (keeps the one with highest paid_amount)
/*
DELETE FROM installments
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, fee_type, due_date, amount
        ORDER BY COALESCE(paid_amount, 0) DESC, created_at ASC
      ) as row_num
    FROM installments
  ) t
  WHERE t.row_num > 1
);
*/

-- =====================================================
-- After cleanup, verify no duplicates remain
-- =====================================================

-- Check fees
SELECT 'fees' as table_name, COUNT(*) as total_records,
  (SELECT COUNT(*) FROM (
    SELECT student_id, fee_type, amount
    FROM fees
    GROUP BY student_id, fee_type, amount
    HAVING COUNT(*) > 1
  ) t) as duplicate_groups
FROM fees;

-- Check installments
SELECT 'installments' as table_name, COUNT(*) as total_records,
  (SELECT COUNT(*) FROM (
    SELECT student_id, fee_type, due_date, amount
    FROM installments
    GROUP BY student_id, fee_type, due_date, amount
    HAVING COUNT(*) > 1
  ) t) as duplicate_groups
FROM installments;
