import { SubscriptionInvoiceData } from '../types';
import { generateSubscriptionInvoiceHTML } from './subscription-invoice-html';
import { generatePDF } from '../core/pdf-generation';

/**
 * Download subscription invoice as PDF using Electron's printToPDF
 * @param data - The data to use for generating the PDF
 * @returns Promise resolving to void
 */
export const downloadSubscriptionInvoiceAsPDF = async (data: SubscriptionInvoiceData): Promise<void> => {
  try {
    // Stamp functionality removed
    const dataWithoutStamp = {
      ...data,
      showStamp: false,
      // stamp: data.stampSettings?.showStamp === true ? (data.stampSettings?.stampImage || data.stamp) : undefined // Stamp functionality removed
    };
    
    // Get HTML content from the same generator used for printing
    const htmlContent = generateSubscriptionInvoiceHTML(dataWithoutStamp);
    const fileName = `فاتورة_اشتراك_${data.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Use our generatePDF utility with portrait orientation
    const result = await generatePDF(htmlContent, fileName, {
      landscape: false,
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    
    // Don't show error if user canceled the save dialog
    if (!result.success && !result.canceled) {
      console.error('Error generating subscription invoice PDF:', result.error);
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + result.error);
    }
  } catch (error) {
    console.error('Error generating PDF invoice:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
  }
};

/**
 * Export subscription invoice as PDF using Electron's printToPDF
 * @param data - The data to use for generating the PDF
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportSubscriptionInvoiceAsPDF = async (data: SubscriptionInvoiceData): Promise<string> => {
  try {
    // Stamp functionality removed
    const dataWithoutStamp = {
      ...data,
      showStamp: false,
      // stamp: data.stampSettings?.showStamp === true ? (data.stampSettings?.stampImage || data.stamp) : undefined // Stamp functionality removed
    };
    
    // Get HTML content from the same generator used for printing
    const htmlContent = generateSubscriptionInvoiceHTML(dataWithoutStamp);
    const fileName = `فاتورة_اشتراك_${data.schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Use our generatePDF utility with portrait orientation
    const result = await generatePDF(htmlContent, fileName, {
      landscape: false,
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error) {
    console.error('Error exporting subscription invoice as PDF:', error);
    throw error;
  }
};