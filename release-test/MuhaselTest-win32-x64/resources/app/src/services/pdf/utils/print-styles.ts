/**
 * Print style utilities for PDF generation
 */

/**
 * Returns a random background pattern for reports
 * Used to add visual variety to reports
 */
export const getRandomBackground = (): string => {
  // Collection of background patterns with blue gradient
  const patterns = [
    `linear-gradient(135deg, #1A365D 0%, #2C5282 100%)`,
    `linear-gradient(to right, #1A365D 0%, #2C5282 100%)`,
    `linear-gradient(to bottom, #1A365D 0%, #2C5282 100%)`,
    `linear-gradient(45deg, #1A365D 0%, #2C5282 100%)`,
    `linear-gradient(to bottom right, #1A365D 0%, #2C5282 100%)`
  ];
  
  // Select a random pattern
  return patterns[Math.floor(Math.random() * patterns.length)];
};

/**
 * Common print styles for all reports
 * These are injected into the HTML of each report
 */
export const commonPrintStyles = `
  /* Print-specific styles */
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }
    
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    
    .report-container {
      box-shadow: none;
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      position: relative;
      overflow: hidden;
    }
    
    .no-print {
      display: none !important;
    }
    
    /* Ensure background colors and images print properly */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

/**
 * Common screen styles for all reports
 * These are injected into the HTML of each report
 */
export const commonScreenStyles = `
  /* Screen display styles */
  @media screen {
    body {
      background-color: #f8f9fa;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    
    .report-container {
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
      width: 210mm;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background-color: white;
      position: relative;
      overflow: hidden;
    }
    
    /* Print button styles */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #C53030;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
    }
    
    .print-button:hover {
      background-color: #9B2C2C;
    }
    
    .print-button svg {
      width: 16px;
      height: 16px;
    }
  }
`;

/**
 * Generate print and download buttons for reports
 */
export const generatePrintDownloadButtons = (reportType: string): string => {
  return `
    <div class="action-buttons no-print">
      <button class="print-button" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        عرض ${reportType}
      </button>
      <button class="download-button" onclick="window.downloadPDF()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        تحميل كملف PDF
      </button>
    </div>
  `;
};

/**
 * Get enhanced print styles for all PDF documents
 */
export const getEnhancedPrintStyles = () => {
  return `<style>
    /* Enhanced print styles for better PDF output */
    @media print {
      @page {
        size: A4;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 297mm !important;
        width: 210mm !important;
        max-width: 210mm !important;
        overflow-x: hidden !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      /* Force all containers to full width */
      .report-container, 
      .installments-section, 
      .report-header, 
      .report-footer {
        width: 100vw !important;
        max-width: 100vw !important;
        margin: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        overflow-x: hidden !important;
      }
      
      /* Ensure watermark is visible in print */
      .watermark {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) rotate(-45deg) !important;
        font-size: 100px !important;
        color: rgba(26, 54, 93, 0.08) !important; /* Blue instead of grey for better print */
        font-weight: bold !important;
        z-index: 100 !important;
        pointer-events: none !important;
        white-space: nowrap !important;
        opacity: 0.15 !important;
        display: block !important;
        visibility: visible !important;
      }
      
      /* Ensure logo background is visible in print */
      .logo-background {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 80% !important;
        height: 80% !important;
        max-width: 600px !important;
        max-height: 600px !important;
        background-size: contain !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        opacity: 0.15 !important;
        z-index: 9999 !important; /* Very high z-index to be in front of content */
        pointer-events: none !important;
        display: block !important;
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Stamp functionality removed */
/* .stamp-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      } */
      
      /* Ensure signature is visible in print */
      .signature-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Table improvements for print */
      table {
        page-break-inside: auto !important;
        width: 100vw !important;
        max-width: 100vw !important;
        margin: 0 !important;
        padding: 0 !important;
        border-collapse: collapse !important;
      }
      
      .installments-table {
        width: 100vw !important;
        max-width: 100vw !important;
        margin: 0 !important;
        table-layout: fixed !important;
        border: 2px solid #1A365D !important;
      }
      
      .installments-table th {
        background-color: #1A365D !important;
        padding: 18px 10px !important;
        font-size: 16px !important;
      }
      
      .installments-table td {
        padding: 15px 10px !important;
        font-size: 16px !important;
      }
      
      /* Column width adjustments for print */
      .installments-table th:nth-child(1), 
      .installments-table td:nth-child(1) {
        width: 3% !important;
      }
      
      .installments-table th:nth-child(2), 
      .installments-table td:nth-child(2) {
        width: 13% !important;
      }
      
      .installments-table th:nth-child(3), 
      .installments-table td:nth-child(3),
      .installments-table th:nth-child(4), 
      .installments-table td:nth-child(4),
      .installments-table th:nth-child(5), 
      .installments-table td:nth-child(5) {
        width: 19% !important;
      }
      
      .installments-table th:nth-child(6), 
      .installments-table td:nth-child(6) {
        width: 13% !important;
      }
      
      .installments-table th:nth-child(7), 
      .installments-table td:nth-child(7) {
        width: 10% !important;
      }
      
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      
      td, th {
        page-break-inside: avoid !important;
      }
      
      thead {
        display: table-header-group !important;
      }
      
      tfoot {
        display: table-footer-group !important;
      }
      
      /* Ensure colored elements print correctly */
      .status-badge, .status-icon, .header, .footer {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Full-width header and footer */
      .report-header, .report-footer {
        width: 100vw !important;
        max-width: 100vw !important;
        margin: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
        color: white !important;
      }
      
      /* Signature and stamps should be clearly visible with blue tints */
      .signature-box /* , .stamp-area */ {
        border: 1px dashed rgba(44, 82, 130, 0.5) !important;
        background-color: rgba(235, 248, 255, 0.3) !important;
      }
      
      /* Content positioning fixes for print */
      .receipt-content-wrapper {
        height: auto !important;
        min-height: 170mm !important;
      }
    }
  </style>`;
};

/**
 * Generate HTML for a large centered logo watermark
 * 
 * @param logoUrl - URL of the school logo
 * @returns HTML string with the logo watermark
 */
export const getBigCenteredLogoWatermark = (logoUrl?: string) => {
  if (!logoUrl) return '';
  
  return `
    <div class="logo-watermark" style="
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 85% !important;
      height: 85% !important;
      background-image: url('${logoUrl}') !important;
      background-size: contain !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      opacity: 0.15 !important;
      z-index: 9999999 !important;
      pointer-events: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: block !important;
      visibility: visible !important;
    "></div>
  `;
};

/**
 * Modern watermark styling
 */
export const modernWatermark = (receiptData: any) => {
  if (!receiptData || !receiptData.schoolLogo) return '';
  
  return `
    /* Modern watermark styling */
    .receipt::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url('${receiptData.schoolLogo}');
      background-repeat: no-repeat;
      background-position: center;
      background-size: 40%;
      opacity: 0.15;
      pointer-events: none;
      z-index: 0;
    }
    
    /* Remove watermark text styles */
    
    /* Modern receipt container with watermark */
    .receipt-container {
      position: relative;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      background: white;
      z-index: 10;
    }
  `;
};