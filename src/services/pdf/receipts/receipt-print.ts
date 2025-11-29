/**
 * Receipt printing functionality
 */

import { ReceiptData } from '../types';
import { generateReceiptHTML } from './receipt-html';
import { openPrintWindow } from '../core/print-utils';

/**
 * Print receipt using browser's print functionality with proper type handling
 * Ensures all settings are properly initialized with defaults
 * Only handles Arabic receipts, English receipts are handled by EnglishReceiptButton.tsx
 */
export const printReceipt = async (data: ReceiptData): Promise<void> => {
  // If language is English, do nothing as it's handled by EnglishReceiptButton.tsx
  if (data.language === 'english') {
    return;
  }
  
  // DEBUG: Log the school information being passed to print
  console.log('RECEIPT PRINT - School Data Debug:', {
    schoolName: data.schoolName,
    schoolLogo: data.schoolLogo,
    schoolPhone: data.schoolPhone,
    schoolEmail: data.schoolEmail,
    hasSchoolLogo: !!data.schoolLogo,
    schoolLogoLength: data.schoolLogo ? data.schoolLogo.length : 0
  });
  
  // Apply default settings if not specified
  const receiptData = {
    ...data,
    showWatermark: true,
    showFooter: data.showFooter !== undefined ? data.showFooter : true,
    showSignature: data.showSignature !== undefined ? data.showSignature : true,
    showStamp: false,
    language: 'arabic' as 'arabic',
    receiptNumber: data.receiptNumber,
    studentName: data.studentName
  };
  
  // Generate HTML with enhanced print styles
  const html = await generateReceiptHTML(receiptData);
  
  // Open print window
  await openPrintWindow(html);
};
