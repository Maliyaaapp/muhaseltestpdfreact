/**
 * PDF Service - Main Export File
 * 
 * This file exports all components of the PDF service for easy access.
 */

// Export all types
export * from './types';

// Export utility functions
export * from './utils/formatting';
export * from './utils/status-helpers';
export * from './utils/print-styles';
export * from './utils/electron-integration';

// Export core functionality
export * from './core/pdf-generation';
export * from './core/print-utils';

// Export receipt functionality
export * from './receipts/receipt-html';
export * from './receipts/receipt-print';
export * from './receipts/receipt-export';

// Export student report functionality
export * from './student-reports/student-report-html';
export * from './student-reports/student-report-print';
export * from './student-reports/student-report-export';

// Export installment report functionality
export * from './installments/installment-report-html';
export * from './installments/installment-report-print';
export * from './installments/installment-report-export';

// Export react-pdf installment receipt
export { default as InstallmentReceiptPDF } from './installments/InstallmentReceiptPDF';
export { generateInstallmentReceiptPDF, downloadInstallmentReceiptPDF } from './installments/InstallmentReceiptPDF';
export type { InstallmentReceiptData, SchoolSettings as InstallmentReceiptSchoolSettings, InstallmentReceiptPDFProps } from './installments/InstallmentReceiptPDF';

// Export fees collection report functionality
export * from './fees-collection/fees-collection-html';
export * from './fees-collection/fees-collection-print';
export * from './fees-collection/fees-collection-export';

// Export subscription invoice functionality
export * from './subscription/subscription-invoice-html';
export * from './subscription/subscription-invoice-print';
export * from './subscription/subscription-invoice-export';

// The remaining modules will be created and exported as they are implemented:
// - Receipt functionality
// - Student report functionality
// - Installment report functionality
// - Fees collection report functionality
// - Subscription invoice functionality 