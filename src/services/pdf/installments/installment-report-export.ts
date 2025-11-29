/**
 * Installment Report PDF Export
 * 
 * Handles exporting student installment reports as PDFs using Electron's printToPDF functionality.
 */

import { StudentInstallmentsReportData } from '../types';
import { generateStudentInstallmentsReportHTML } from './installment-report-html';
import { generatePDF } from '../core/pdf-generation';

/**
 * Exports student installments report as PDF using Electron's printToPDF
 * 
 * @param data Student installments report data
 * @returns Promise resolving to an object with success status and file path
 */
export const exportStudentInstallmentsReportAsPDF = async (
  data: StudentInstallmentsReportData
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    // Add a timestamp to force browser to generate a fresh PDF
    const timestamp = new Date().getTime();
    
    // Generate a meaningful filename based on student info and date
    const fileName = `تقرير_أقساط_${data.studentId}_${data.studentName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
    
    // Add data attributes for CSS controls
    const htmlOptions = {
      'data-hide-watermark': 'true', 
      'data-show-footer': 'false',
      'data-fit-to-page': 'true',
      'data-timestamp': timestamp.toString()
    };
    
    // Generate HTML content for the report
    const htmlContent = generateStudentInstallmentsReportHTML({
      ...data,
      showLogoBackground: false,
      showWatermark: false, // Ensure no text watermark
      showFooter: false     // Hide footer
    });
    
    // Add data attributes to the body tag
    const enhancedHtml = htmlContent.replace('<body', 
      `<body ${Object.entries(htmlOptions).map(([key, value]) => `${key}="${value}"`).join(' ')}`);
    
    // Use portrait mode for correct print layout
    const result = await generatePDF(enhancedHtml, fileName, {
      format: 'A4',
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
    
    return result;
  } catch (error) {
    console.error('Error exporting student installments report as PDF:', error);
    return {
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Downloads a student installments report as PDF
 * Wrapper function that calls exportStudentInstallmentsReportAsPDF and handles any errors
 * 
 * @param data - Student installments report data
 * @returns Promise resolving to success status and file path or error message
 */
export const downloadInstallmentsReportAsPDF = async (
  data: StudentInstallmentsReportData
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    const result = await exportStudentInstallmentsReportAsPDF(data);
    return result;
  } catch (error: any) {
    console.error('Error downloading installments report as PDF:', error);
    return { 
      success: false, 
      error: `Failed to download installments report: ${error.message}` 
    };
  }
}; 