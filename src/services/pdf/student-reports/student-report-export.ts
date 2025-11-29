/**
 * Student Report PDF Export
 * 
 * Handles exporting student reports as PDFs using Electron's printToPDF functionality.
 */

import { StudentReportData } from '../types';
import { generateStudentReportHTML } from './student-report-html';
import { generatePDF } from '../core/pdf-generation';

/**
 * Exports student financial report as PDF using Electron's native printToPDF
 * 
 * Features:
 * - Generates professional PDF reports from HTML content
 * - Handles proper page formatting and margins
 * - Ensures all styling is preserved in the PDF output
 * - Supports Arabic RTL layout
 * 
 * @param data - Student report data object
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportStudentReportToPDF = async (
  data: StudentReportData
): Promise<string> => {
  try {
    // Check if we're in Electron environment
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.generatePDF) {
      console.error('Electron API not available for PDF generation');
      throw new Error('This function must be called from an Electron renderer process');
    }
    
    console.log('PDF Export: Generating student report HTML content...');
    // Generate HTML content for the report
    const htmlContent = generateStudentReportHTML({
      ...data,
      showWatermark: data.showWatermark // Keep the exact setting
    });
    console.log('PDF Export: HTML content generated, length:', htmlContent.length);
    
    // Add data attribute for footer visibility
    const footerVisibility = data.showFooter !== false; // Use showFooter setting to control footer visibility
    let htmlWithSettings = htmlContent.replace('<body', `<body data-show-footer="${footerVisibility}" class="arabic-text"`);
    
    // Create filename based on student information and date
    const sanitizedName = data.studentName.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `student_report_${sanitizedName}_${dateStr}.pdf`;
    
    console.log('PDF Export: Generating PDF with filename:', fileName);
    
    // Use our Electron printToPDF utility
    const result = await generatePDF(htmlWithSettings, fileName, {
      format: 'A4',
      landscape: false, // Force portrait orientation
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
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error: any) {
    console.error('Error exporting student report PDF:', error);
    throw new Error(`Student report PDF generation failed: ${error.message}`);
  }
};

/**
 * Downloads a student report as PDF
 * Wrapper function that calls exportStudentReportToPDF and handles any errors
 * 
 * @param data - Student report data
 * @returns Promise resolving to success status and file path or error message
 */
export const downloadStudentReportAsPDF = async (
  data: StudentReportData
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    const filePath = await exportStudentReportToPDF(data);
    return { success: true, filePath };
  } catch (error: any) {
    console.error('Error downloading student report as PDF:', error);
    return { 
      success: false, 
      error: `Failed to download student report: ${error.message}` 
    };
  }
}; 