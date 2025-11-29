import { ReceiptData } from '../services/pdf/types';
import { generateReceiptHTML } from '../services/pdf/receipts/receipt-html';
import { generatePDF } from './electronPdfExport';

/**
 * Exports receipt as PDF using Electron's native printToPDF
 * This function sends the HTML content to the main process which uses Electron's printToPDF to generate the PDF
 * 
 * @param data - Receipt data
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportReceiptToPDF = async (
  data: ReceiptData
): Promise<string> => {
  try {
    // Check if we're in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.generatePDF) {
      console.error('Electron API not available for PDF generation');
      throw new Error('This function must be called from an Electron renderer process');
    }
    
    console.log('PDF Export: Generating receipt HTML content...');
    // Generate HTML content for the receipt
    const htmlContent = generateReceiptHTML(data);
    console.log('PDF Export: HTML content generated, length:', htmlContent.length);
    
    // Add data attribute for footer visibility
    const footerVisibility = data.showFooter !== false; // Use showFooter setting to control footer visibility
    const htmlWithFooterSetting = htmlContent.replace('<body', `<body data-show-footer="${footerVisibility}" class="arabic-text"`);
    
    // Create Arabic-friendly filename with receipt number if available
    const fileName = `إيصال_${data.receiptNumber || ''}_${data.studentName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    console.log('PDF Export: Sending to main process, file name:', fileName);
    
    // Use our Electron printToPDF utility
    const result = await generatePDF(htmlWithFooterSetting, fileName, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',  // Adjusted for Arabic right-to-left layout
        right: '15mm'
      },
      displayHeaderFooter: false, // We handle our own footer in the content
      preferCSSPageSize: true     // Use CSS page size definition for exact sizing
    });
    
    if (result.canceled) {
      console.log('User canceled the save dialog for receipt PDF');
      return Promise.reject({ canceled: true });
    }
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error: unknown) {
    console.error('Error exporting receipt PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Receipt PDF generation failed: ${errorMessage}`);
  }
};

/**
 * Generate HTML for receipt export
 * This is a helper function used during the export process
 * 
 * @deprecated Use generateReceiptHTML from pdfPrinter.ts directly
 */
export const generateReceiptExportHTML = (data: ReceiptData): string => {
  // This function is now deprecated
  // Use the generateReceiptHTML from pdfPrinter.ts directly
  console.warn('generateReceiptExportHTML is deprecated, use generateReceiptHTML from pdfPrinter.ts directly');
  return generateReceiptHTML(data);
}; 