/**
 * Core PDF generation functions
 */

import { exportToPdf } from '../../../utils/electronPdfExport';

/**
 * Generate PDF from HTML content with specified options
 */
export const generatePDF = async (
  htmlContent: string, 
  fileName: string, 
  options: {
    format?: string;
    landscape?: boolean;
    printBackground?: boolean;
    margin?: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    };
    displayHeaderFooter?: boolean;
    preferCSSPageSize?: boolean;
    width?: number;
    height?: number;
  }
): Promise<{success: boolean; filePath?: string; error?: string; canceled?: boolean}> => {
  try {
    // Check if we're in Electron environment and have the API available
    if (window?.electronAPI) {
      // Use the exportToPdf function from electronPdfExport
      // It expects (htmlContent, fileName, isLandscape) parameters
      const result = await exportToPdf(htmlContent, fileName, options.landscape || false);
      
      // Pass through cancellation status
      if (result.canceled) {
        return {
          success: false,
          canceled: true
        };
      }
      
      return {
        success: result.success,
        filePath: result.filePath,
        error: result.error
      };
    } else {
      console.warn('PDF generation skipped: not in Electron');
      return {
        success: false,
        error: 'Electron API not available'
      };
    }
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error.message || 'Unknown error generating PDF'
    };
  }
}; 