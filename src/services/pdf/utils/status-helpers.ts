/**
 * Status helper functions for PDF generation
 */

import { formatDate } from './formatting';
import { FEE_TYPES } from '../../../utils/constants';

/**
 * Helper function to get subscription status text
 */
export const getSubscriptionStatusText = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'نشط';
    case 'expired':
      return 'منتهي';
    case 'pending':
      return 'قيد الانتظار';
    default:
      return 'نشط';
  }
};

/**
 * Helper function to get status class for styling
 */
export const getStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return '';
    case 'expired':
      return 'expired';
    case 'pending':
      return 'pending';
    default:
      return '';
  }
};

/**
 * Helper function to get payment status text
 */
export const getPaymentStatusText = (paid: boolean, paymentDate?: string): string => {
  if (paid) {
    return paymentDate ? `تم الدفع بتاريخ ${formatDate(paymentDate)}` : 'تم الدفع';
  }
  return 'في انتظار الدفع';
};

/**
 * Get status badge class for fees collection report
 */
export const getStatusBadgeClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'status-paid';
    case 'partial':
      return 'status-partial';
    case 'unpaid':
      return 'status-unpaid';
    default:
      return '';
  }
};

/**
 * Get status text for fees collection report
 */
export const getStatusText = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'مدفوع';
    case 'partial':
      return 'مدفوع جزئيا';
    case 'unpaid':
      return 'غير مدفوع';
    case 'upcoming':
      return 'قادم';
    case 'overdue':
      return 'متأخر';
    default:
      return status;
  }
};

/**
 * Translate fee type to Arabic
 */
export const translateFeeTypeToArabic = (feeType: string): string => {
  const feeTypeObj = FEE_TYPES.find(type => type.id.toLowerCase() === feeType.toLowerCase());
  return feeTypeObj ? feeTypeObj.name : feeType;
};

/**
 * Get status icon for fees collection report
 */
export const getStatusIcon = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="status-icon paid"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    case 'partial':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="status-icon partial"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
    case 'unpaid':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="status-icon unpaid"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    default:
      return '';
  }
}; 