/**
 * Student Report Print Functionality
 * 
 * Handles printing student reports directly to the printer.
 */

import { StudentReportData } from '../types';
import { generateStudentReportHTML } from './student-report-html';
import { openPrintWindow } from '../core/print-utils';

/**
 * Print a student financial report directly to the printer
 * 
 * Features:
 * - Opens a print dialog with the report content
 * - Ensures proper styling for print output
 * - Handles print errors gracefully
 * 
 * @param data - Student report data object
 * @param printDelay - Optional delay before triggering print dialog (default: 500ms)
 * @returns Promise resolving to success status and any error message
 */
export const printStudentReport = async (
  data: StudentReportData,
  printDelay: number = 500
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Print: Generating student report HTML content...');
    
    // Generate the HTML content for the report
    const htmlContent = generateStudentReportHTML({
      ...data,
      // For printing, we typically don't want watermarks
      showWatermark: data.showWatermark !== undefined ? data.showWatermark : false
    });
    
    console.log('Print: Opening print window...');
    
    // Open a print window with the generated HTML content
    const printResult = await openPrintWindow(htmlContent, printDelay);
    return printResult;
  } catch (error: any) {
    console.error('Error printing student report:', error);
    return {
      success: false,
      error: `Failed to print student report: ${error.message}`
    };
  }
}; 