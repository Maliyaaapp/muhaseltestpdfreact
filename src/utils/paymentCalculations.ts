// FIX #3 & #4: Shared payment calculation logic
// This ensures consistent calculations across Fees and Installments pages

export interface PaymentInstallment {
  id: string;
  amount: number;
  paidAmount?: number;
  status?: string;
}

export interface PaymentResult {
  totalPaid: number;
  balance: number;
  status: 'paid' | 'partial' | 'unpaid';
  updatedInstallments: Array<{
    id: string;
    paidAmount: number;
    balance: number;
    status: 'paid' | 'partial' | 'unpaid';
  }>;
}

/**
 * Calculate fee totals from installments
 * FIX #4: Properly accounts for partial payments
 */
export function calculateFeeFromInstallments(
  feeAmount: number,
  feeDiscount: number,
  installments: PaymentInstallment[]
): { totalPaid: number; balance: number; status: 'paid' | 'partial' | 'unpaid' } {
  const netAmount = feeAmount - feeDiscount;
  const totalPaid = installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
  const balance = Math.max(0, netAmount - totalPaid);
  
  let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (totalPaid === 0) {
    status = 'unpaid';
  } else if (balance === 0) {
    status = 'paid';
  } else {
    status = 'partial';
  }
  
  return { totalPaid, balance, status };
}

/**
 * Distribute a payment across multiple installments
 * FIX #3: Consistent distribution logic
 * CRITICAL: This adds NEW payment to EXISTING paidAmount
 */
export function distributePayment(
  paymentAmount: number,
  installments: PaymentInstallment[]
): PaymentResult {
  const sortedInstallments = [...installments].sort((a, b) => {
    // Sort by due date if available, otherwise by order
    return 0;
  });
  
  let remainingAmount = paymentAmount;
  const updatedInstallments: PaymentResult['updatedInstallments'] = [];
  
  for (const inst of sortedInstallments) {
    const currentPaid = inst.paidAmount || 0;
    const unpaidAmount = inst.amount - currentPaid;
    
    if (remainingAmount <= 0 || unpaidAmount <= 0) {
      // No more payment to distribute OR already fully paid
      updatedInstallments.push({
        id: inst.id,
        paidAmount: currentPaid,
        balance: Math.max(0, inst.amount - currentPaid),
        status: currentPaid === 0 ? 'unpaid' : 
                currentPaid >= inst.amount ? 'paid' : 'partial'
      });
      continue;
    }
    
    // Apply payment to this installment
    const paymentForThis = Math.min(remainingAmount, unpaidAmount);
    const newPaidAmount = currentPaid + paymentForThis;
    const newBalance = Math.max(0, inst.amount - newPaidAmount);
    
    updatedInstallments.push({
      id: inst.id,
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newBalance === 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid'
    });
    
    remainingAmount -= paymentForThis;
  }
  
  // Calculate totals from ALL installments (including those we didn't update)
  const totalPaid = updatedInstallments.reduce((sum, inst) => sum + inst.paidAmount, 0);
  const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const balance = Math.max(0, totalAmount - totalPaid);
  
  return {
    totalPaid,
    balance,
    status: totalPaid === 0 ? 'unpaid' : balance === 0 ? 'paid' : 'partial',
    updatedInstallments
  };
}

/**
 * Calculate payment for a single installment (full or partial)
 */
export function calculateInstallmentPayment(
  installmentAmount: number,
  previouslyPaid: number,
  paymentAmount: number
): { newPaidAmount: number; balance: number; status: 'paid' | 'partial' | 'unpaid' } {
  const unpaidAmount = installmentAmount - previouslyPaid;
  const paymentToApply = Math.min(paymentAmount, unpaidAmount);
  const newPaidAmount = previouslyPaid + paymentToApply;
  const balance = Math.max(0, installmentAmount - newPaidAmount);
  
  let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (newPaidAmount === 0) {
    status = 'unpaid';
  } else if (balance === 0) {
    status = 'paid';
  } else {
    status = 'partial';
  }
  
  return { newPaidAmount, balance, status };
}
