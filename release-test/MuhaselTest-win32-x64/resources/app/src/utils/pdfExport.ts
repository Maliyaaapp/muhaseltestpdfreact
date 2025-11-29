import { StudentInstallmentsReportData } from '../services/pdfExporter';
import { generateStudentInstallmentsReportHTML } from '../services/pdfPrinter';
import { generatePDF } from './electronPdfExport';

/**
 * Exports student installments report as PDF using Electron's native printToPDF
 * This function sends the HTML content to the main process which uses Electron's printToPDF to generate the PDF
 * 
 * @param data - Student installments report data object
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportStudentInstallmentsReportAsPDF = async (
  data: StudentInstallmentsReportData
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    // Check if we're in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.generatePDF) {
      console.error('Electron API not available for PDF generation');
      throw new Error('This function must be called from an Electron renderer process');
    }
    
    console.log('PDF Export: Generating HTML content...');
    // Generate HTML content for the report
    const htmlContent = generateStudentInstallmentsReportHTML(data);
    console.log('PDF Export: HTML content generated, length:', htmlContent.length);
    
    // Add data attribute for footer visibility
    const footerVisibility = false; // Always hide footer
    const htmlWithFooterSetting = htmlContent.replace('<body', `<body data-show-footer="false" data-hide-watermark="true"`);
    
    // Send to main process for PDF generation
    const fileName = `StudentInstallmentsReport-${data.studentId}_${data.studentName.replace(/\s+/g, '_')}-${new Date().getTime()}.pdf`;
    console.log('PDF Export: Sending to main process, file name:', fileName);
    
    // Use our new Electron printToPDF utility with standardized margins
    const result = await generatePDF(htmlWithFooterSetting, fileName, {
      format: 'A4',
      landscape: true, // Use landscape for better table display
      printBackground: true,
      margin: {
        top: '5mm',    // Reduce top margin
        bottom: '0',   // Zero bottom margin
        left: '0',     // Zero left margin
        right: '0'     // Zero right margin
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true  // Use CSS page size
    });
    
    return result;
  } catch (error: unknown) {
    console.error('Error exporting PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `PDF generation failed: ${errorMessage}`
    };
  }
}; 