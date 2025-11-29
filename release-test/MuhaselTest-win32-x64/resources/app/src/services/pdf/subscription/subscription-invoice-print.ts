import { SubscriptionInvoiceData } from '../types';
import { generateSubscriptionInvoiceHTML } from './subscription-invoice-html';
import { openPrintWindow } from '../core/print-utils';

/**
 * Print subscription invoice using browser's print functionality
 * @param data - The subscription invoice data
 */
export const printSubscriptionInvoice = (data: SubscriptionInvoiceData): void => {
  try {
    // Generate HTML content
    const htmlContent = generateSubscriptionInvoiceHTML(data);
    
    // Use the openPrintWindow utility to handle printing
    openPrintWindow(htmlContent, 500);
  } catch (error) {
    console.error('Error printing subscription invoice:', error);
    alert('حدث خطأ أثناء طباعة فاتورة الاشتراك. يرجى المحاولة مرة أخرى.');
  }
}; 