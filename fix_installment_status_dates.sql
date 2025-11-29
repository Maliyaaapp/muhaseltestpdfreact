-- FIX INSTALLMENT STATUS BASED ON DATES
-- This script restores the original date-based status logic for installments
-- Run this in your Supabase SQL Editor to fix existing installment statuses

-- Step 1: Log current status distribution
DO $$
BEGIN
  RAISE NOTICE 'Current Installment Status Distribution:';
  RAISE NOTICE 'Paid: %', (SELECT COUNT(*) FROM installments WHERE status = 'paid');
  RAISE NOTICE 'Partial: %', (SELECT COUNT(*) FROM installments WHERE status = 'partial');
  RAISE NOTICE 'Upcoming: %', (SELECT COUNT(*) FROM installments WHERE status = 'upcoming');
  RAISE NOTICE 'Overdue: %', (SELECT COUNT(*) FROM installments WHERE status = 'overdue');
  RAISE NOTICE 'Unpaid: %', (SELECT COUNT(*) FROM installments WHERE status = 'unpaid');
  RAISE NOTICE 'Other: %', (SELECT COUNT(*) FROM installments WHERE status NOT IN ('paid', 'partial', 'upcoming', 'overdue', 'unpaid'));
END $$;

-- Step 2: Update installment statuses based on date logic
UPDATE installments 
SET status = CASE 
  -- If there's a paid_date, it's paid (or partial if paid_amount < amount)
  WHEN paid_date IS NOT NULL THEN 
    CASE 
      WHEN paid_amount IS NOT NULL AND amount IS NOT NULL AND paid_amount < amount AND paid_amount > 0 THEN 'partial'
      ELSE 'paid'
    END
  -- If no paid_date, check due_date against current date
  WHEN due_date < CURRENT_DATE THEN 'overdue'
  ELSE 'upcoming'
END
WHERE 
  -- Only update installments that don't already have the correct status
  status != CASE 
    WHEN paid_date IS NOT NULL THEN 
      CASE 
        WHEN paid_amount IS NOT NULL AND amount IS NOT NULL AND paid_amount < amount AND paid_amount > 0 THEN 'partial'
        ELSE 'paid'
      END
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'upcoming'
  END;

-- Step 3: Handle special cases - installments with 'unpaid' status
-- Convert 'unpaid' status to proper date-based status
UPDATE installments 
SET status = CASE 
  WHEN due_date < CURRENT_DATE THEN 'overdue'
  ELSE 'upcoming'
END
WHERE status = 'unpaid' AND paid_date IS NULL;

-- Step 4: Fix installments that have paid_amount but no paid_date
-- These should be marked as paid and get a paid_date
UPDATE installments 
SET 
  paid_date = COALESCE(paid_date, CURRENT_DATE),
  status = CASE 
    WHEN paid_amount IS NOT NULL AND amount IS NOT NULL AND paid_amount < amount AND paid_amount > 0 THEN 'partial'
    ELSE 'paid'
  END
WHERE 
  paid_amount > 0 
  AND paid_date IS NULL 
  AND status NOT IN ('paid', 'partial');

-- Step 5: Fix installments that are marked as paid but have no paid_amount
-- Set paid_amount to the full amount
UPDATE installments 
SET paid_amount = amount
WHERE 
  status = 'paid' 
  AND (paid_amount IS NULL OR paid_amount = 0)
  AND amount > 0;

-- Step 6: Log results after fix
DO $$
BEGIN
  RAISE NOTICE '=== INSTALLMENT STATUS FIX COMPLETED ===';
  RAISE NOTICE 'Updated Status Distribution:';
  RAISE NOTICE 'Paid: %', (SELECT COUNT(*) FROM installments WHERE status = 'paid');
  RAISE NOTICE 'Partial: %', (SELECT COUNT(*) FROM installments WHERE status = 'partial');
  RAISE NOTICE 'Upcoming: %', (SELECT COUNT(*) FROM installments WHERE status = 'upcoming');
  RAISE NOTICE 'Overdue: %', (SELECT COUNT(*) FROM installments WHERE status = 'overdue');
  RAISE NOTICE 'Unpaid: %', (SELECT COUNT(*) FROM installments WHERE status = 'unpaid');
  RAISE NOTICE 'Other: %', (SELECT COUNT(*) FROM installments WHERE status NOT IN ('paid', 'partial', 'upcoming', 'overdue', 'unpaid'));
  
  RAISE NOTICE '';
  RAISE NOTICE 'Status Logic Restored:';
  RAISE NOTICE '- Paid: installments with paid_date';
  RAISE NOTICE '- Partial: installments with paid_date but paid_amount < amount';
  RAISE NOTICE '- Overdue: installments without paid_date and due_date < today';
  RAISE NOTICE '- Upcoming: installments without paid_date and due_date >= today';
END $$;

-- Step 7: Create a function to automatically update status based on dates
-- This can be used in triggers or called periodically
CREATE OR REPLACE FUNCTION update_installment_status_by_date()
RETURNS void AS $$
BEGIN
  UPDATE installments 
  SET status = CASE 
    WHEN paid_date IS NOT NULL THEN 
      CASE 
        WHEN paid_amount IS NOT NULL AND amount IS NOT NULL AND paid_amount < amount AND paid_amount > 0 THEN 'partial'
        ELSE 'paid'
      END
    WHEN due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'upcoming'
  END
  WHERE 
    status != CASE 
      WHEN paid_date IS NOT NULL THEN 
        CASE 
          WHEN paid_amount IS NOT NULL AND amount IS NOT NULL AND paid_amount < amount AND paid_amount > 0 THEN 'partial'
          ELSE 'paid'
        END
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'upcoming'
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_installment_status_by_date() IS 'Updates installment statuses based on due dates and payment status. Call this function to refresh statuses: SELECT update_installment_status_by_date();';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '=== DATE-BASED STATUS LOGIC RESTORED ===';
  RAISE NOTICE 'Your original date-based status logic has been restored!';
  RAISE NOTICE 'Use SELECT update_installment_status_by_date(); to refresh statuses anytime.';
END $$;