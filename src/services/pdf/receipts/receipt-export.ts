/**
 * Receipt PDF export functionality
 */

import { ReceiptData } from '../types';
import { generateReceiptHTML } from './receipt-html';
import { downloadAsPDF } from '../utils/electron-integration';
import { generatePDF } from '../core/pdf-generation';
import { generateReceiptNumber } from '../../../utils/helpers';

/**
 * Download receipt as PDF using Electron's printToPDF
 * Applies all necessary settings and ensures professional output
 * Only handles Arabic receipts, English receipts are handled by EnglishReceiptButton.tsx
 * @param data - The receipt data
 */
export const downloadReceiptAsPDF = async (data: ReceiptData): Promise<void> => {
  try {
    // If language is English, do nothing as it's handled by EnglishReceiptButton.tsx
    if (data.language === 'english') {
      return;
    }
    
    // Debug settings for troubleshooting
    console.log('downloadReceiptAsPDF - Settings:', {
      showSignature: data.showSignature
    });
    
    // Apply all settings for consistent output
    // Ensure we use the provided receipt number or generate one properly
    let finalReceiptNumber = data.receiptNumber;
    
    // Only generate a new receipt number if one doesn't exist
    if (!finalReceiptNumber) {
      const settingsForNumber = (data as any).schoolSettings;
      if (settingsForNumber) {
        finalReceiptNumber = generateReceiptNumber(settingsForNumber, data.studentId, undefined, 'fee');
      }
    }
    
    const receiptData = {
      ...data,
      showWatermark: true,
      showFooter: data.showFooter !== undefined ? data.showFooter : true,
      showSignature: data.showSignature !== undefined ? data.showSignature : true,
      showStamp: false,
      language: 'arabic' as 'arabic',
      receiptNumber: finalReceiptNumber,
      studentName: data.studentName,
      checkNumber: data.checkNumber,
      installmentNumber: data.installmentNumber,
      installmentMonth: data.installmentMonth,
      installmentDetails: data.installmentDetails,
    };
    
    // Generate HTML content
    const htmlContent = await generateReceiptHTML(receiptData);
    
    // Generate filename with null check for studentName
    const studentName = (receiptData.studentName || 'Student').replace(/\s+/g, '_');
    // Add timestamp as cache buster to force regeneration
    const timestamp = new Date().getTime();
    const fileName = `Receipt_${receiptData.receiptNumber}_${studentName}_${timestamp}.pdf`;
    
    // Download as PDF with zero margins for proper edge-to-edge printing
    await downloadAsPDF(htmlContent, fileName, {
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
  } catch (error: any) {
    console.error('Error downloading receipt as PDF:', error);
    alert(`حدث خطأ أثناء تحميل الإيصال كملف PDF: ${error.message || error}`);
  }
};

/**
 * Download installment receipt as PDF using Electron's printToPDF
 * This is a separate function specifically for installment receipts to avoid
 * conflicts with regular fee receipts. It uses the same template but with a different
 * prefix in the filename and receipt number to distinguish it.
 * @param data - The receipt data
 */
export const downloadInstallmentReceiptAsPDF = async (data: ReceiptData): Promise<void> => {
  try {
    // If language is English, do nothing as it's handled by EnglishReceiptButton.tsx
    if (data.language === 'english') {
      return;
    }
    
    // Debug settings for troubleshooting
    console.log('downloadInstallmentReceiptAsPDF - Settings:', {
      showSignature: data.showSignature
    });
    
    // Apply all settings for consistent output, but add installment-specific prefix
    // Ensure we use the provided receipt number or generate one properly
    let finalInstallmentReceiptNumber = data.receiptNumber;
    
    // Only generate a new receipt number if one doesn't exist
    if (!finalInstallmentReceiptNumber) {
      const settingsForInstallmentNumber = (data as any).schoolSettings;
      if (settingsForInstallmentNumber) {
        finalInstallmentReceiptNumber = generateReceiptNumber(settingsForInstallmentNumber, data.studentId, undefined, 'installment');
      }
    }
    
    const receiptData = {
      ...data,
      showWatermark: true,
      showFooter: data.showFooter !== undefined ? data.showFooter : true,
      showSignature: data.showSignature !== undefined ? data.showSignature : true,
      showStamp: false,
      language: 'arabic' as 'arabic',
      receiptNumber: finalInstallmentReceiptNumber,
      studentName: data.studentName,
      checkNumber: data.checkNumber,
      installmentNumber: data.installmentNumber,
      installmentMonth: data.installmentMonth,
      installmentDetails: data.installmentDetails,
      isInstallment: true,
    };
    
    // Generate HTML content
    const htmlContent = await generateReceiptHTML(receiptData);
    
    // Generate filename with installment prefix and null check for studentName
    const studentName = (receiptData.studentName || 'Student').replace(/\s+/g, '_');
    // Add timestamp as cache buster to force regeneration
    const timestamp = new Date().getTime();
    const fileName = `Installment_Receipt_${receiptData.receiptNumber}_${studentName}_${timestamp}.pdf`;
    
    // Download as PDF with zero margins for proper edge-to-edge printing
    await downloadAsPDF(htmlContent, fileName, {
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
  } catch (error: any) {
    console.error('Error downloading installment receipt as PDF:', error);
    alert(`حدث خطأ أثناء تحميل إيصال القسط كملف PDF: ${error.message || error}`);
  }
};

/**
 * Export receipt as PDF using Electron's printToPDF
 * Returns a promise with the file path
 * Only handles Arabic receipts, English receipts are handled by EnglishReceiptButton.tsx
 * @param data - The receipt data
 * @returns Promise with the file path
 */
export const exportReceiptAsPDF = async (data: ReceiptData): Promise<string> => {
  try {
    // If language is English, return rejected promise as it's handled by EnglishReceiptButton.tsx
    if (data.language === 'english') {
      return Promise.reject('English receipts are handled separately by EnglishReceiptButton.tsx');
    }
    
    // DEBUG: Log the school information being passed to export
    console.log('RECEIPT EXPORT - School Data Debug:', {
      schoolName: data.schoolName,
      schoolLogo: data.schoolLogo,
      schoolPhone: data.schoolPhone,
      schoolEmail: data.schoolEmail,
      hasSchoolLogo: !!data.schoolLogo,
      schoolLogoLength: data.schoolLogo ? data.schoolLogo.length : 0
    });
    
    // Apply all settings for consistent output
    // Ensure we use the provided receipt number or generate one properly
    let finalExportReceiptNumber = data.receiptNumber;
    
    // Only generate a new receipt number if one doesn't exist
    if (!finalExportReceiptNumber) {
      const exportSettingsForNumber = (data as any).schoolSettings;
      if (exportSettingsForNumber) {
        finalExportReceiptNumber = generateReceiptNumber(exportSettingsForNumber, data.studentId, undefined, 'fee');
      }
    }
    
    const receiptData = {
      ...data,
      showWatermark: true,
      showFooter: data.showFooter !== undefined ? data.showFooter : true,
      showSignature: data.showSignature !== undefined ? data.showSignature : true,
      showStamp: false,
      language: 'arabic' as 'arabic',
      receiptNumber: finalExportReceiptNumber,
      studentName: data.studentName
    };
    
    // Generate HTML content
    const htmlContent = await generateReceiptHTML(receiptData);
    
    // Generate filename with null check for studentName
    const studentName = (receiptData.studentName || 'Student').replace(/\s+/g, '_');
    // Add timestamp as cache buster to force regeneration
    const timestamp = new Date().getTime();
    const fileName = `Receipt_${receiptData.receiptNumber}_${studentName}_${timestamp}.pdf`;
    
    // Generate PDF with zero margins for proper edge-to-edge printing
    const result = await generatePDF(htmlContent, fileName, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      preferCSSPageSize: true
    });
    
    if (result.canceled) {
      console.log('User canceled the save dialog for receipt PDF');
      return Promise.reject({ canceled: true });
    }
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error: any) {
    console.error('Error exporting receipt as PDF:', error);
    throw new Error(`Failed to export receipt as PDF: ${error.message || error}`);
  }
};

/**
 * Export installment receipt as PDF using Electron's printToPDF
 * Returns a promise with the file path
 * This is a separate function specifically for installment receipts to avoid
 * conflicts with regular fee receipts.
 * @param data - The receipt data
 * @returns Promise with the file path
 */
export const exportInstallmentReceiptAsPDF = async (data: ReceiptData): Promise<string> => {
  try {
    // If language is English, return rejected promise as it's handled by EnglishReceiptButton.tsx
    if (data.language === 'english') {
      return Promise.reject('English receipts are handled separately by EnglishReceiptButton.tsx');
    }
    
    // Apply all settings for consistent output
    // Ensure we use the provided receipt number or generate one properly
    let finalExportInstallmentReceiptNumber = data.receiptNumber;
    
    // Only generate a new receipt number if one doesn't exist
    if (!finalExportInstallmentReceiptNumber) {
      const exportSettingsForInstallmentNumber = (data as any).schoolSettings;
      if (exportSettingsForInstallmentNumber) {
        finalExportInstallmentReceiptNumber = generateReceiptNumber(exportSettingsForInstallmentNumber, data.studentId, undefined, 'installment');
      }
    }
    
    const receiptData = {
      ...data,
      showWatermark: true,
      showFooter: data.showFooter !== undefined ? data.showFooter : true,
      showSignature: data.showSignature !== undefined ? data.showSignature : true,
      showStamp: false,
      language: 'arabic' as 'arabic',
      receiptNumber: finalExportInstallmentReceiptNumber,
      studentName: data.studentName,
      isInstallment: true
    };
    
    // Generate HTML content
    const htmlContent = await generateReceiptHTML(receiptData);
    
    // Generate filename with installment prefix and null check for studentName
    const studentName = (receiptData.studentName || 'Student').replace(/\s+/g, '_');
    // Add timestamp as cache buster to force regeneration
    const timestamp = new Date().getTime();
    const fileName = `Installment_Receipt_${receiptData.receiptNumber}_${studentName}_${timestamp}.pdf`;
    
    // Generate PDF with zero margins for proper edge-to-edge printing
    const result = await generatePDF(htmlContent, fileName, {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      preferCSSPageSize: true
    });
    
    if (result.canceled) {
      console.log('User canceled the save dialog for installment receipt PDF');
      return Promise.reject({ canceled: true });
    }
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error: any) {
    console.error('Error exporting installment receipt as PDF:', error);
    throw new Error(`Failed to export installment receipt as PDF: ${error.message || error}`);
  }
};
