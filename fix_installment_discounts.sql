-- Fix installment discounts by distributing fee discounts proportionally across installments
-- This ensures that installment amounts + discounts = fee amount

-- Update installments to have proportional discounts from their parent fee
UPDATE installments i
SET discount = ROUND(
  (f.discount::numeric / 
    NULLIF((SELECT COUNT(*) FROM installments WHERE fee_id = f.id), 0)
  ), 2
)
FROM fees f
WHERE i.fee_id = f.id
  AND f.discount > 0
  AND i.discount = 0;

-- Verify the fix
SELECT 
  f.id as fee_id,
  f.amount as fee_amount,
  f.discount as fee_discount,
  f.amount - f.discount as fee_net_amount,
  COUNT(i.id) as installment_count,
  SUM(i.amount) as total_installment_amount,
  SUM(i.discount) as total_installment_discount,
  SUM(i.amount) - SUM(i.discount) as total_installment_net
FROM fees f
LEFT JOIN installments i ON f.id = i.fee_id
WHERE f.discount > 0
GROUP BY f.id, f.amount, f.discount
ORDER BY f.id;
