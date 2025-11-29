/**
 * Installment Report Print Functionality
 * 
 * Handles printing student installment reports directly to the printer.
 */

import { StudentInstallmentsReportData } from '../types';
import { generateStudentInstallmentsReportHTML } from './installment-report-html';
import { openPrintWindow } from '../core/print-utils';

/**
 * Print a student installments report directly to the printer
 * 
 * Features:
 * - Opens a print dialog with the report content
 * - Ensures proper styling for print output
 * - Handles print errors gracefully
 * 
 * @param data - Student installments report data object
 * @param printDelay - Optional delay before triggering print dialog (default: 500ms)
 * @returns Promise resolving to success status and any error message
 */
export const printInstallmentsReport = async (
  data: StudentInstallmentsReportData,
  printDelay: number = 500
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Print: Generating installments report HTML content...');
    
    // Generate the HTML content for the report
    const htmlContent = generateStudentInstallmentsReportHTML({
      ...data,
      // For printing, we typically don't want watermarks
      showWatermark: data.showWatermark !== undefined ? data.showWatermark : false
    });
    
    console.log('Print: Opening print window...');
    
    // Open a print window with the generated HTML content
    const printResult = await openPrintWindow(htmlContent, printDelay);
    return printResult;
  } catch (error: any) {
    console.error('Error printing installments report:', error);
    return {
      success: false,
      error: `Failed to print installments report: ${error.message}`
    };
  }
}; 