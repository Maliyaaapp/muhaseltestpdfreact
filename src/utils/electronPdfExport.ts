/**
 * Electron PDF Export Utility
 * 
 * This utility provides functions for exporting PDFs using Electron's native printToPDF method.
 * It serves as a drop-in replacement for previous Puppeteer-based PDF generation.
 */

/**
 * PDF generation options interface matching Electron's printToPDF options
 */
export interface ElectronPdfOptions {
  // Page size and orientation
  format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid';
  landscape?: boolean;
  
  // Margins
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  
  // Content rendering
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  preferCSSPageSize?: boolean;
  
  // Quality and scale
  scale?: number;
  
  // Header and footer templates
  headerTemplate?: string;
  footerTemplate?: string;
}

/**
 * Generate PDF from HTML content using Electron's printToPDF
 * 
 * @param html - The HTML content to convert to PDF
 * @param fileName - The name of the output PDF file
 * @param options - PDF generation options
 * @returns Promise resolving to the result with success status and file path
 */
export const generatePDF = async (
  html: string,
  fileName: string,
  options?: ElectronPdfOptions
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> => {
  try {
    console.log('PDF Export: Starting PDF generation process');
    
    // Check if we're in Electron environment with proper API
    if (window?.electronAPI?.generatePDF) {
      console.log('PDF Export: Using electronAPI.generatePDF');
      
      // Log the options being sent
      const sanitizedOptions = {
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        printBackground: options?.printBackground !== false,
        margin: options?.margin || {
          top: '0mm',
          bottom: '0mm',
          left: '0mm',
          right: '0mm'
        },
        displayHeaderFooter: options?.displayHeaderFooter || false,
        preferCSSPageSize: options?.preferCSSPageSize || false,
        scale: options?.scale || 1.0
      };
      
      // Use the proper Electron API
      return await window.electronAPI.generatePDF(html, fileName, sanitizedOptions);
    } else {
      console.error('PDF Export: Electron environment not detected');
      alert("Electron environment not detected. PDF export disabled.");
      return {
        success: false,
        error: 'Electron API not available'
      };
    }
  } catch (error: unknown) {
    console.error('Error exporting PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Try to get renderer console errors
    console.log('Collecting additional error information...');
    try {
      const errorInfo = {
        electronAvailable: typeof window !== 'undefined' && !!window.electron, 
        ipcRendererAvailable: typeof window !== 'undefined' && !!window.electron?.ipcRenderer,
        electronAPIAvailable: typeof window !== 'undefined' && !!window.electronAPI,
        documentReady: typeof document !== 'undefined',
        navigatorInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
      };
      console.error('Error context:', errorInfo);
    } catch (debugError) {
      console.error('Failed to collect error context:', debugError);
    }
    
    return {
      success: false,
      error: `PDF generation failed: ${errorMessage}`
    };
  }
};

/**
 * Export HTML content as PDF and show the file in the file explorer
 * 
 * @param htmlContent - The HTML content to convert to PDF
 * @param fileName - The name of the output PDF file
 * @param isLandscape - Whether to use landscape orientation
 * @returns Promise resolving to the result with success status and file path
 */
export const exportToPdf = async (
  htmlContent: string,
  fileName: string,
  isLandscape = false
): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> => {
  try {
    // Ensure htmlContent is a string
    if (typeof htmlContent !== 'string') {
      throw new Error('HTML content must be a string');
    }
    
    // Ensure the HTML has proper page break handling
    let enhancedHtml = htmlContent;
    
    // Add essential page break styles if not present
    if (!enhancedHtml.includes('@page') && !enhancedHtml.includes('page-break-after')) {
      enhancedHtml = enhancedHtml.replace('</head>', `
        <style>
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 0 !important; /* No margins to allow content to extend to edges */
          }
          .page-break { page-break-after: always; break-after: page; }
          .report-container { page-break-after: always; break-after: page; }
          
          /* Table layout improvements for content fitting */
          table { 
            page-break-inside: avoid; 
            width: 100vw !important; 
            max-width: 100vw !important; 
            table-layout: auto !important; /* Change from fixed to auto for dynamic column sizing */
          }
          
          /* Allow cell content to determine width */
          th, td {
            white-space: normal !important; /* Allow text to wrap */
            overflow: visible !important; /* Show all content */
            text-overflow: clip !important; /* Don't truncate content */
            word-wrap: break-word !important; /* Break long words */
            min-width: fit-content !important; /* Ensure minimum width fits content */
          }
          
          tr { 
            page-break-inside: avoid; 
            height: auto !important; /* Auto adjust row height */
          }
          
          /* Force full-width tables */
          .installments-table, 
          .report-header, 
          .report-footer {
            width: 100vw !important;
            max-width: 100vw !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          /* Ensure headers extend fully */
          .report-header {
            width: 100vw !important;
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          
          /* Standardized colors for headers and footers */
          .report-header, th, .footer, .page-footer, .report-footer {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Info cards styling - consistent background */
          .report-info, .filters, .summary, .contact-card, .info-card {
            background-color: #EBF8FF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Status badge colors */
          .status-paid {
            background-color: #C6F6D5 !important;
            color: #276749 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .status-upcoming {
            background-color: #BEE3F8 !important;
            color: #2A4365 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .status-partial {
            background-color: #FEEBC8 !important;
            color: #975A16 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .status-overdue {
            background-color: #FED7D7 !important;
            color: #9B2C2C !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure footer extends to edges */
          .page-footer, .report-footer {
            width: 100vw !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            position: fixed !important;
            margin: 0 !important;
            padding-top: 15px !important;
            padding-bottom: 15px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: white !important;
            border-top: 1px solid #E2E8F0 !important;
            z-index: 1000 !important;
          }
          
          /* Contact cards styling */
          .contact-card {
            background: #EBF8FF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Add space at the bottom of the last page for the footer */
          .page:last-child {
            padding-bottom: 120px !important;
          }
          
          /* Ensure the body has minimum height */
          body {
            min-height: ${isLandscape ? '210mm' : '297mm'} !important;
            position: relative !important;
          }
          
          /* Table row styling */
          tr:nth-child(even) {
            background-color: #EBF8FF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Summary section styling */
          .summary {
            background-color: #EBF8FF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Filter label styling */
          .filter-label {
            color: #1A365D !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Summary values styling */
          .summary-value {
            color: #1A365D !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Replace all maroon colors with blue */
          [style*="background-color: #800000"] {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          [style*="color: #800000"] {
            color: #1A365D !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
        </head>
      `);
    }
    
    // Use optimized options for better page break handling
    const options: ElectronPdfOptions = {
      format: 'A4',
      landscape: isLandscape,
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      },
      preferCSSPageSize: true
    };
    
    const result = await generatePDF(enhancedHtml, fileName, options);
    
    // Pass through any cancellation status
    if (result.canceled) {
      return {
        success: false,
        canceled: true
      };
    }
    
    return result;
  } catch (error: unknown) {
    console.error('Error in exportToPdf:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `PDF export failed: ${errorMessage}`
    };
  }
};