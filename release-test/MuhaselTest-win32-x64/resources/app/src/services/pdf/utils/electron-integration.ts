/**
 * Electron integration utilities for PDF generation
 */

interface MarginOptions {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

interface PrintOptions {
  landscape?: boolean;
  printBackground?: boolean;
  format?: string;
  margin?: MarginOptions;
  preferCSSPageSize?: boolean;
}

/**
 * Utility function to download HTML content as PDF using Electron's native printToPDF
 */
export const downloadAsPDF = (
  htmlContent: string, 
  fileName: string, 
  options?: PrintOptions | boolean
): void => {
  try {
    // Check for Electron environment
    if (!window.electronAPI || !window.electronAPI.generatePDF) {
      console.error('Electron IPC renderer not available - Electron printToPDF is required');
      alert('لا يمكن إنشاء ملف PDF. يجب أن يكون تطبيق Electron متاحًا.');
      return;
    }
    
    console.log('Using Electron API for PDF generation with native printToPDF');
    
    // Handle legacy boolean parameter for isLandscape
    const isLandscape = typeof options === 'boolean' ? options : (options?.landscape || false);
    
    // Add special attributes and style fixes for Arabic rendering
    const htmlWithAttributes = htmlContent
      .replace('<body', '<body class="arabic-text" dir="rtl"')
      .replace('</head>', `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
          
          @page {
            size: ${isLandscape ? '297mm 210mm' : '210mm 297mm'};
            margin: 0;
          }
          
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          /* Improved Arabic text rendering */
          .arabic-text {
            font-family: 'Tajawal', Arial, sans-serif !important;
            text-align: right;
            direction: rtl;
          }
          
          /* Watermark visibility */
          .watermark {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) rotate(-45deg) !important;
            font-size: 120px !important;
            opacity: 0.12 !important;
            color: #800000 !important;
            z-index: 9999 !important;
            display: block !important;
            visibility: visible !important;
            pointer-events: none !important;
          }
          
          /* Logo background visibility */
          .logo-background {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 70% !important;
            height: 70% !important;
            max-width: 500px !important;
            max-height: 500px !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            opacity: 0.12 !important;
            z-index: 1 !important;
            pointer-events: none !important;
            display: block !important;
            visibility: visible !important;
          }
          
          /* Stamp functionality removed */
/* .stamp-container {
            position: fixed !important;
            bottom: 100px !important;
            right: 50px !important;
            z-index: 100 !important;
            width: 120px !important;
            height: 120px !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          } */
          
          /* .stamp-image { // Stamp functionality removed
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          } */
          
          /* Signature visibility */
          .signature-container {
            position: fixed !important;
            bottom: 100px !important;
            left: 50px !important;
            z-index: 100 !important;
            width: 120px !important;
            height: 80px !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .signature-image {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          /* Receipt header and footer styles */
          .receipt-header, .receipt-footer, .fee-table th {
            background: linear-gradient(135deg, #800000 0%, #A52A2A 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            color: white !important;
          }
          
          /* Receipt footer positioning */
          .receipt-footer {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            padding: 15px !important;
            z-index: 999 !important;
          }
          
          /* Contact info in footer */
          .contact-info, .contact-info span, .contact-icon {
            color: white !important;
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          @media print {
            /* Ensure all elements are visible in print */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* Hide UI control elements */
            .no-print {
              display: none !important;
            }
            
            /* Improve table display */
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            
            td, th {
              page-break-inside: avoid;
            }
            
            thead {
              display: table-header-group;
            }
            
            tfoot {
              display: table-footer-group;
            }
            
            /* Student info cards */
            .student-info {
              background-color: #FFF5F5 !important;
              border-radius: 5px !important;
            }
            
            /* Info labels */
            .info-label {
              color: #822727 !important;
              font-weight: bold !important;
            }
            
            /* Payment method section */
            .payment-method {
              background-color: #FFF5F5 !important;
              border-radius: 5px !important;
            }
            
            /* Receipt title */
            .receipt-title {
              background-color: #FEEBC8 !important;
              border-bottom: 1px solid #ED8936 !important;
              color: #7B341E !important;
            }
          }
        </style>
      </head>`);
    
    // Prepare print options
    const printOptions = {
      landscape: isLandscape,
      printBackground: true,
      format: 'A4',
      margin: typeof options === 'object' && options?.margin ? options.margin : {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      preferCSSPageSize: typeof options === 'object' ? (options?.preferCSSPageSize || true) : true
    };
    
    // Generate a temporary file name if not provided
    const finalFileName = fileName || `document-${Date.now()}.pdf`;
    
    // Call Electron's API to print to PDF
    console.log('About to use electronAPI.generatePDF with options:', {
      fileName: finalFileName,
      optionsType: typeof options,
      printOptionsLandscape: printOptions.landscape
    });
    
    window.electronAPI.generatePDF(htmlWithAttributes, finalFileName, printOptions)
      .then((result: any) => {
        if (result.success) {
          console.log(`PDF saved successfully at: ${result.filePath}`);
        } else if (result.canceled) {
          // User canceled the save dialog, do nothing and return silently
          console.log('PDF save dialog was canceled by the user');
        } else {
          console.error('Failed to save PDF:', result.error);
          alert(`فشل في حفظ ملف PDF: ${result.error}`);
        }
      }).catch((error: any) => {
        // Only show an alert if the error is not a user cancel
        if (error && error.message && error.message.toLowerCase().includes('canceled')) {
          console.log('PDF save dialog was canceled by the user (caught in catch)');
        } else {
          console.error('Error during PDF generation:', error);
          alert(`خطأ أثناء إنشاء ملف PDF: ${error.message || error}`);
        }
      });
  } catch (error: any) {
    console.error('Error in downloadAsPDF:', error);
    alert(`خطأ غير متوقع أثناء إنشاء ملف PDF: ${error.message || error}`);
  }
};