/**
 * Common printing utility functions
 */

/**
 * Opens a print window with the provided HTML content
 * 
 * @param htmlContent - The HTML content to print
 * @param printDelay - Delay in ms before triggering print (default: 500)
 * @returns Promise resolving to success status and any error message
 */
export const openPrintWindow = async (
  htmlContent: string, 
  printDelay: number = 500
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    try {
      // Open a new window and write the HTML content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        const errorMessage = 'Failed to open print window. Please check if pop-ups are blocked.';
        console.error(errorMessage);
        alert('فشل في فتح نافذة الطباعة. يرجى التحقق من عدم حظر النوافذ المنبثقة.');
        resolve({ success: false, error: errorMessage });
        return;
      }
      
      // Add responsive styles to make content fit the screen for viewing
      const enhancedHtmlContent = htmlContent.replace('</head>',
        `<style>
          /* Responsive view styles - only applied for screen, not print */
          @media screen {
            html, body {
              width: 100% !important;
              height: auto !important;
              min-height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: hidden !important;
              background-color: #f5f5f5 !important;
            }
            
            .report-container {
              width: 100% !important;
              max-width: 100% !important;
              min-height: 100vh !important;
              margin: 0 auto !important;
              overflow-x: hidden !important;
              box-shadow: 0 0 20px rgba(0,0,0,0.1) !important;
            }
            
            /* Make tables responsive */
            .installments-table {
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: auto !important;
              display: block !important;
            }
            
            /* Add print button */
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #800020;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 5px;
              cursor: pointer;
              font-family: 'Tajawal', Arial, sans-serif;
              font-weight: bold;
              z-index: 9999;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .print-button:hover {
              background: #A52A2A;
            }
          }
        </style>
        </head>`
      );
      
      // Add print button to the HTML content
      const contentWithPrintButton = enhancedHtmlContent.replace('<body>', 
        `<body>
        <button class="print-button" onclick="window.print()">طباعة التقرير</button>`
      );
      
      // Use a proper type cast to access document property safely
      (printWindow as any).document.write(contentWithPrintButton);
      (printWindow as any).document.close();
      
      // Return success immediately without triggering print
      setTimeout(() => {
        resolve({ success: true });
      }, printDelay);
      
    } catch (error: any) {
      const errorMessage = `Error opening print window: ${error.message || 'Unknown error'}`;
      console.error(errorMessage, error);
      alert('حدث خطأ أثناء فتح نافذة الطباعة. يرجى المحاولة مرة أخرى.');
      resolve({ success: false, error: errorMessage });
    }
  });
}; 