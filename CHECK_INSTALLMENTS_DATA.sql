-- Check what installments exist and their linking status

-- 1. Show all installments with their linking status
SELECT 
    i.id,
    i.student_name,
    i.fee_type,
    i.amount,
    i.paid_amount,
    i.status,
    i.fee_id,
    i.student_id,
    CASE 
        WHEN i.fee_id IS NULL THEN 'ORPHANED - NO FEE LINK'
        WHEN i.student_id IS NULL THEN 'ORPHANED - NO STUDENT LINK'
        ELSE 'LINKED'
    END as link_status
FROM installments i
ORDER BY i.student_name, i.fee_type;

-- 2. Count installments by link status
SELECT 
    CASE 
        WHEN fee_id IS NULL THEN 'No fee_id'
        WHEN student_id IS NULL THEN 'No student_id'
        ELSE 'Fully linked'
    END as status,
    COUNT(*) as count
FROM installments
GROUP BY 
    CASE 
        WHEN fee_id IS NULL THEN 'No fee_id'
        WHEN student_id IS NULL THEN 'No student_id'
        ELSE 'Fully linked'
    END;

-- 3. Show fees and their installment counts
SELECT 
    f.id as fee_id,
    f.student_name,
    f.fee_type,
    f.amount as fee_amount,
    f.paid as fee_paid,
    f.balance as fee_balance,
    f.status as fee_status,
    COUNT(i.id) as installment_count,
    COALESCE(SUM(i.paid_amount), 0) as total_paid_from_installments
FROM fees f
LEFT JOIN installments i ON i.fee_id = f.id
GROUP BY f.id, f.student_name, f.fee_type, f.amount, f.paid, f.balance, f.status
ORDER BY f.student_name, f.fee_type;

-- 4. Find fees with no installments
SELECT 
    f.id,
    f.student_name,
    f.fee_type,
    f.amount,
    f.paid,
    f.balance,
    f.status
FROM fees f
WHERE NOT EXISTS (
    SELECT 1 FROM installments i WHERE i.fee_id = f.id
)
ORDER BY f.student_name;
