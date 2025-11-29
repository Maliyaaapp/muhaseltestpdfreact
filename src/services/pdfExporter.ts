import { generateStudentInstallmentsReportHTML } from './pdfPrinter';
import { exportToPdf } from '../utils/electronPdfExport';

/**
 * Interface for student installments report data
 */
export interface StudentInstallmentsReportData {
  studentName: string;
  studentId: string;
  grade: string;
  schoolId?: string;
  installments: Array<{
    id: string;
    feeType: string;
    amount: number;
    paidAmount?: number;
    dueDate: string;
    paidDate: string | null;
    status: 'paid' | 'upcoming' | 'overdue' | 'partial';
    installmentCount: number;
    installmentMonth?: string;
    discount?: number;
  }>;
  schoolName: string;
  schoolLogo?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;


  showSignature?: boolean;
  showFooter?: boolean;
  receiptNumber?: string;
  date?: string;
}

/**
 * PDF generation options
 */
export interface PDFGenerationOptions {
  landscape?: boolean;
  marginsType?: number;
  printBackground?: boolean;
  printSelectionOnly?: boolean;
  pageSize?: string | { width: number; height: number };
}

/**
 * Exports student installments report as PDF using Electron's native printToPDF
 * 
 * @param data - Student installments report data
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportStudentInstallmentsReportToPDF = async (
  data: StudentInstallmentsReportData
): Promise<string> => {
  try {
    // Generate HTML content for the report
    const htmlContent = generateStudentInstallmentsReportHTML(data);
    
    // Add data attribute for footer visibility
    const footerVisibility = data.showFooter !== false; // Default to true if not specified
    const htmlWithFooterSetting = htmlContent.replace('<body', `<body data-show-footer="${footerVisibility}"`);
    
    // Generate filename
    const fileName = `StudentInstallmentsReport-${data.studentId}-${data.studentName.replace(/\s+/g, '_')}.pdf`;
    
    // Use Electron's printToPDF via our exportToPdf utility
    const result = await exportToPdf(htmlWithFooterSetting, fileName);
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error: unknown) {
    console.error('Error exporting PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF generation failed: ${errorMessage}`);
  }
};

/**
 * @deprecated This function is no longer needed as we now use Electron's native printToPDF 
 * functionality directly from the renderer process via the electronPdfExport utility.
 * 
 * This stub is kept for backwards compatibility but will be removed in a future version.
 */
export const registerPdfExportHandlers = (
  ipcMain: any, 
  _puppeteer: any, 
  _app: any
): void => {
  console.warn(
    'registerPdfExportHandlers is deprecated. ' +
    'PDF generation now uses Electron\'s native printToPDF. ' +
    'See electronPdfExport.ts for the new implementation.'
  );
  
  // Provide a no-op handler for backwards compatibility
  ipcMain.handle('generate-pdf', async (_event: any, { html, fileName }: { html: string; fileName: string }) => {
    console.warn('Using deprecated generate-pdf IPC handler. Please migrate to print-to-pdf.');
    // Forward to the new handler if it exists
    return ipcMain.emit('print-to-pdf', _event, { htmlContent: html, fileName });
  });
};

// Use this import statement instead (if needed)
// import { ElectronIPCRenderer } from '../electron'; // Adjust the path as needed