/**
 * PDF Printer Service
 * 
 * This file re-exports all functionality from the modular PDF service structure
 * to maintain backward compatibility with existing code.
 */

// Import all the functions we need for the default export
import {
  getCurrencySymbol,
  translateFeeType,
  formatDate,
  formatHeaderDate,
  formatPhoneNumber
} from './pdf/utils/formatting';

import {
  getSubscriptionStatusText,
  getStatusClass,
  getPaymentStatusText,
  getStatusBadgeClass,
  getStatusText,
  translateFeeTypeToArabic,
  getStatusIcon
} from './pdf/utils/status-helpers';

import {
  getRandomBackground,
  generatePrintDownloadButtons,
  getEnhancedPrintStyles
} from './pdf/utils/print-styles';

import {
  downloadAsPDF
} from './pdf/utils/electron-integration';

import {
  generatePDF
} from './pdf/core/pdf-generation';

import {
  openPrintWindow
} from './pdf/core/print-utils';

import {
  generateReceiptHTML
} from './pdf/receipts/receipt-html';

import {
  printReceipt
} from './pdf/receipts/receipt-print';

import {
  downloadReceiptAsPDF,
  exportReceiptAsPDF,
  downloadInstallmentReceiptAsPDF,
  exportInstallmentReceiptAsPDF
} from './pdf/receipts/receipt-export';

import {
  generateStudentReportHTML
} from './pdf/student-reports/student-report-html';

import {
  printStudentReport
} from './pdf/student-reports/student-report-print';

import {
  exportStudentReportToPDF,
  downloadStudentReportAsPDF
} from './pdf/student-reports/student-report-export';

import {
  generateStudentInstallmentsReportHTML
} from './pdf/installments/installment-report-html';

import {
  printInstallmentsReport
} from './pdf/installments/installment-report-print';

import {
  exportStudentInstallmentsReportAsPDF,
  downloadInstallmentsReportAsPDF
} from './pdf/installments/installment-report-export';

// Import fees collection report functions
import {
  generateFeesCollectionReportHTML
} from './pdf/fees-collection/fees-collection-html';

import {
  printFeesCollectionReport
} from './pdf/fees-collection/fees-collection-print';

import {
  downloadFeesCollectionReportAsPDF,
  exportFeesCollectionReportAsPDF
} from './pdf/fees-collection/fees-collection-export';

// Import subscription invoice functions
import {
  generateSubscriptionInvoiceHTML
} from './pdf/subscription/subscription-invoice-html';

import {
  printSubscriptionInvoice
} from './pdf/subscription/subscription-invoice-print';

import {
  downloadSubscriptionInvoiceAsPDF,
  exportSubscriptionInvoiceAsPDF
} from './pdf/subscription/subscription-invoice-export';

// Re-export all types and interfaces
export type {
  ReceiptData,
  StudentReportData,
  StudentInstallmentsReportData,
  FeesCollectionReportData,
  SubscriptionInvoiceData,
  StampSettings,
  PDFGenerationSettings
} from './pdf/types';

// Re-export utility functions
export {
  getCurrencySymbol,
  translateFeeType,
  formatDate,
  formatHeaderDate,
  formatPhoneNumber
} from './pdf/utils/formatting';

export {
  getSubscriptionStatusText,
  getStatusClass,
  getPaymentStatusText,
  getStatusBadgeClass,
  getStatusText,
  translateFeeTypeToArabic,
  getStatusIcon
} from './pdf/utils/status-helpers';

export {
  getRandomBackground,
  generatePrintDownloadButtons,
  getEnhancedPrintStyles
} from './pdf/utils/print-styles';

export {
  downloadAsPDF
} from './pdf/utils/electron-integration';

// Re-export core functionality
export {
  generatePDF
} from './pdf/core/pdf-generation';

export {
  openPrintWindow
} from './pdf/core/print-utils';

// Re-export receipt functionality
export {
  generateReceiptHTML
} from './pdf/receipts/receipt-html';

export {
  printReceipt
} from './pdf/receipts/receipt-print';

export {
  downloadReceiptAsPDF,
  exportReceiptAsPDF,
  downloadInstallmentReceiptAsPDF,
  exportInstallmentReceiptAsPDF
} from './pdf/receipts/receipt-export';

// Re-export student report functionality
export {
  generateStudentReportHTML
} from './pdf/student-reports/student-report-html';

export {
  printStudentReport
} from './pdf/student-reports/student-report-print';

export {
  exportStudentReportToPDF,
  downloadStudentReportAsPDF
} from './pdf/student-reports/student-report-export';

// Re-export installment report functionality
export {
  generateStudentInstallmentsReportHTML
} from './pdf/installments/installment-report-html';

export {
  printInstallmentsReport
} from './pdf/installments/installment-report-print';

export {
  exportStudentInstallmentsReportAsPDF,
  downloadInstallmentsReportAsPDF
} from './pdf/installments/installment-report-export';

// Fees collection report functionality
export {
  generateFeesCollectionReportHTML
} from './pdf/fees-collection/fees-collection-html';

export {
  printFeesCollectionReport
} from './pdf/fees-collection/fees-collection-print';

export {
  downloadFeesCollectionReportAsPDF,
  exportFeesCollectionReportAsPDF
} from './pdf/fees-collection/fees-collection-export';

// Subscription invoice functionality
export {
  generateSubscriptionInvoiceHTML
} from './pdf/subscription/subscription-invoice-html';

export {
  printSubscriptionInvoice
} from './pdf/subscription/subscription-invoice-print';

export {
  downloadSubscriptionInvoiceAsPDF,
  exportSubscriptionInvoiceAsPDF
} from './pdf/subscription/subscription-invoice-export';

// Backward compatibility aliases
export const printStudentInstallmentsReport = printInstallmentsReport;

// Create a default export object with all the named exports for backward compatibility
const pdfPrinter = {
  // Types are not included in the default export as they're only used for TypeScript

  // Utility functions
  getCurrencySymbol,
  translateFeeType,
  formatDate,
  formatHeaderDate,
  formatPhoneNumber,
  
  getSubscriptionStatusText,
  getStatusClass,
  getPaymentStatusText,
  getStatusBadgeClass,
  getStatusText,
  translateFeeTypeToArabic,
  getStatusIcon,
  
  getRandomBackground,
  generatePrintDownloadButtons,
  getEnhancedPrintStyles,
  
  downloadAsPDF,
  
  // Core functionality
  generatePDF,
  openPrintWindow,
  
  // Receipt functionality
  generateReceiptHTML,
  printReceipt,
  downloadReceiptAsPDF,
  exportReceiptAsPDF,
  downloadInstallmentReceiptAsPDF,
  exportInstallmentReceiptAsPDF,
  
  // Student report functionality
  generateStudentReportHTML,
  printStudentReport,
  exportStudentReportToPDF,
  downloadStudentReportAsPDF,
  
  // Installment report functionality
  generateStudentInstallmentsReportHTML,
  printInstallmentsReport,
  printStudentInstallmentsReport,
  exportStudentInstallmentsReportAsPDF,
  downloadInstallmentsReportAsPDF,
  
  // Fees collection report functionality
  generateFeesCollectionReportHTML,
  printFeesCollectionReport,
  downloadFeesCollectionReportAsPDF,
  exportFeesCollectionReportAsPDF,
  
  // Subscription invoice functionality
  generateSubscriptionInvoiceHTML,
  printSubscriptionInvoice,
  downloadSubscriptionInvoiceAsPDF,
  exportSubscriptionInvoiceAsPDF
};

export default pdfPrinter;