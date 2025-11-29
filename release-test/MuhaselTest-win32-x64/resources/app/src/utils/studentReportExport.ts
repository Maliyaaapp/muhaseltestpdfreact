import { generateStudentReportHTML, StudentReportData } from '../services/pdfPrinter';
import { generatePDF } from './electronPdfExport';

/**
 * Exports student financial report as PDF using Electron's native printToPDF
 * This function sends the HTML content to the main process which uses Electron's printToPDF to generate the PDF
 * 
 * @param data - Student report data
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
    
    // Force portrait orientation by adding overriding CSS
    const portraitCSS = `
      <style>
        @page {
          size: A4 portrait !important;
          margin: 20mm 15mm !important;
        }
        
        html, body {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
        }
        
        /* Hide all scrollbars */
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        
        /* Remove all overflow scrolling */
        * {
          -ms-overflow-style: none !important; /* IE and Edge */
          scrollbar-width: none !important; /* Firefox */
          overflow: visible !important;
        }
        
        /* Hide any copyright footer */
        .report-footer {
          display: none !important;
        }
        
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
          
          .report-footer {
            display: none !important;
          }
        }
      </style>
    `;
    
    // Insert portrait CSS into the HTML head
    htmlWithSettings = htmlWithSettings.replace('</head>', `${portraitCSS}</head>`);
    
    // Create Arabic-friendly filename
    const fileName = `تقرير_مالي_${data.studentId}-${data.studentName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    console.log('PDF Export: Sending to main process, file name:', fileName);
    
    // Use our new Electron printToPDF utility
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
  } catch (error: unknown) {
    console.error('Error exporting student report PDF:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Student report PDF generation failed: ${errorMessage}`);
  }
}; 