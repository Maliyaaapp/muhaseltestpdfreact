import { FeesCollectionReportData } from '../types';
import { formatDate, formatHeaderDate, getCurrencySymbol } from '../utils/formatting';
import { getStatusBadgeClass, getStatusText, translateFeeTypeToArabic, getStatusIcon } from '../utils/status-helpers';
import { getRandomBackground } from '../utils/print-styles';
import { CURRENCY } from '../../../utils/constants';

/**
 * Generate HTML for fees collection report
 * @param data - The fees collection report data
 * @returns HTML string for the report
 */
export const generateFeesCollectionReportHTML = (data: FeesCollectionReportData): string => {
  const backgroundPattern = getRandomBackground();
  
  // Determine language and direction (default to Arabic/RTL)
  const isArabic = data.language !== 'english';
  const documentDirection = isArabic ? 'rtl' : 'ltr';
  const documentLang = isArabic ? 'ar' : 'en';
  
  // Use document-specific setting or fall back to general setting
  const showLogoBackground = data.showLogoBackground !== undefined ? data.showLogoBackground : false;
  
  // Correctly display the school name based on language
  const displaySchoolName = isArabic 
    ? data.schoolName 
    : (data.englishSchoolName && data.englishSchoolName.trim() !== '' ? data.englishSchoolName : "School");
  
  // FORCE currency to be correct
  const currencySymbol = isArabic ? CURRENCY : 'OMR';
  
  // Format date range if available
  const dateRangeText = data.dateRange ? 
    `${formatDate(data.dateRange.startDate)} - ${formatDate(data.dateRange.endDate)}` : 
    formatHeaderDate();

  // Calculate totals for summary cards
  const totalFees = data.fees.reduce((sum, fee) => sum + (fee.totalFees || fee.amount || 0), 0);
  const totalPaid = data.fees.reduce((sum, fee) => sum + (fee.paidAmount || fee.paid || 0), 0);
  const totalRemaining = data.fees.reduce((sum, fee) => sum + (fee.remainingAmount || fee.balance || 0), 0);
  const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;
  
  // Count status types
  const paidCount = data.fees.filter(fee => fee.status === 'paid').length;
  const partialCount = data.fees.filter(fee => fee.status === 'partial').length;
  const unpaidCount = data.fees.filter(fee => fee.status === 'unpaid').length;

  // Group fees with consistent items per page
  const FEES_PER_PAGE = 7; // Exactly 7 rows per page as requested
  const feesPages = [];
  
  // Simple pagination
  for (let i = 0; i < data.fees.length; i += FEES_PER_PAGE) {
    feesPages.push(data.fees.slice(i, i + FEES_PER_PAGE));
  }

  return `
    <!DOCTYPE html>
    <html lang="${documentLang}" dir="${documentDirection}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="format-detection" content="telephone=no">
      <meta name="print-color-adjust" content="exact">
      <title>${isArabic ? 'تقرير تحصيل الرسوم' : 'Fees Collection Report'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700;900&family=Inter:wght@400;500;700&display=swap');
        
        /* CSS Reset */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        /* Base document styles - exact A4 sizing with safe print margins */
        @page {
          size: 297mm 210mm; /* A4 landscape */
          margin: 0;
        }
        
        html, body {
          width: 297mm;
          min-height: 210mm;
          font-family: ${isArabic ? "'Tajawal'" : "'Inter'"}, sans-serif;
          background-color: white;
          color: #333;
          direction: ${documentDirection};
          margin: 0;
          padding: 0;
        }
        
        /* Language specific adjustments */
        .rtl-text {
          direction: rtl;
          text-align: right;
        }
        
        .ltr-text {
          direction: ltr;
          text-align: left;
        }
        
        /* Screen display styles */
        @media screen {
          body {
            background-color: #f8f9fa;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .report-container {
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
            width: 297mm;
            max-width: 297mm;
            min-height: 210mm;
            margin: 0 auto 2rem auto;
            background-color: white;
            position: relative;
            overflow: hidden;
            page-break-after: always;
          }

          .report-container:last-child {
            page-break-after: auto;
          }
        }
        
        /* Print-specific styles with enhanced compatibility */
        @media print {
          @page {
            size: 297mm 210mm; /* A4 landscape */
            margin: 0;
          }
          
          html, body {
            width: 297mm;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .report-container {
            box-shadow: none;
            width: 297mm;
            min-height: 210mm;
            margin: 0;
            padding: 0;
            position: relative;
            /* Force each container to start on a new page */
            page-break-before: always;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          /* First container should not force a page break before */
          .report-container:first-of-type {
            page-break-before: avoid;
          }
          
          /* Last container should not force a page break after */
          .report-container:last-of-type {
            page-break-after: avoid;
          }

          /* Fix table layout in print mode */
          .fees-table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            page-break-inside: avoid !important;
          }

          /* Ensure headers only show once per page */
          .fees-table thead { 
            display: table-header-group !important;
          }

          /* Ensure table rows stay together */
          .fees-table tbody tr {
            page-break-inside: avoid !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Critical print styles for footer visibility */
          .report-footer {
            display: none !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 9999 !important;
          }
          
          /* Only show footer on the last page */
          .report-container:last-of-type .report-footer {
            display: flex !important;
          }
          
          /* Critical print styles for header visibility */
          .report-header {
            display: flex !important;
          }
          
          /* Connect table directly with payment cards - print specific */
          .summary-section + .fees-table-container {
            margin-top: 0 !important;
            padding-top: 0 !important;
            border-top: none !important;
          }
          
          /* Force zero spacing between payment cards and table */
          .fees-table-container {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
          
          /* Fix table headers appearing twice */
          .fees-table thead {
            display: table-header-group !important;
          }
          
          /* Prevent duplicate headers */
          .report-container:not(:first-of-type) .fees-table thead {
            display: table-header-group !important;
          }
          
          /* Fix table bottom border */
          .fees-table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
            border: 2px solid #2C5282 !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          
          .fees-table tr:last-child td {
            border-bottom: none !important;
          }
          
          /* Ensure page number is positioned correctly */
          .page-number {
            position: absolute !important;
            bottom: 2rem !important;
            left: 0 !important;
            right: 0 !important;
            text-align: center !important;
            margin-top: 20px !important;
            padding-top: 10px !important;
            border-top: none !important;
            background-color: transparent !important;
          }
          
          /* Ensure watermark prints correctly */
          .watermark {
            display: block !important;
            visibility: visible !important;
            opacity: 0.12 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure logo background prints correctly */
          .logo-background {
            display: block !important;
            visibility: visible !important;
            opacity: 0.12 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Ensure all gradient headers print correctly */
          .report-header, .report-footer, .fees-table th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
          }
          
          .header-title, .school-name, .report-date {
            color: white !important;
          }
          
          /* Fix colors for print */
          .status-badge.paid {
            background-color: rgba(56, 161, 105, 0.15) !important;
            color: #276749 !important;
            border: 1px solid rgba(56, 161, 105, 0.3) !important;
          }
          
          .status-badge.partial {
            background-color: rgba(236, 201, 75, 0.15) !important;
            color: #975A16 !important;
            border: 1px solid rgba(236, 201, 75, 0.3) !important;
          }
          
          .status-badge.unpaid {
            background-color: rgba(229, 62, 62, 0.15) !important;
            color: #9B2C2C !important;
            border: 1px solid rgba(229, 62, 62, 0.3) !important;
          }
          
          .summary-card::before {
            background: linear-gradient(to bottom, #1A365D, #2C5282) !important;
          }
          
          /* Ensure footer is visible in PDF */
          .report-footer {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            display: block !important;
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: white !important;
            margin: 0 !important;
            border: none !important;
            z-index: 999 !important;
          }
          
          .footer-copyright, .contact-label, .contact-value {
            color: white !important;
          }
          
          /* Ensure contact cards display properly */
          .contact-cards {
            display: flex !important;
            visibility: visible !important;
          }
          
          .contact-card {
            display: flex !important;
            visibility: visible !important;
          }
          
          /* Make sure icons appear in PDF */
          .contact-icon {
            display: flex !important;
            visibility: visible !important;
            color: white !important;
            background-color: rgba(255,255,255,0.18) !important;
          }
          
          .badge-icon {
            display: inline !important;
            visibility: visible !important;
          }
        }
        
        /* Report header styles */
        .report-header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          color: white !important;
          padding: 15px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 10;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        
        .header-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .header-text {
          display: flex;
          flex-direction: column;
        }
        
        .header-title {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
          color: white !important;
        }
        
        .school-name {
          font-size: 16px;
          font-weight: 600;
          opacity: 0.95;
          margin-bottom: 2px;
          color: white !important;
        }
        
        .logo-container {
          width: 60px;
          height: 60px;
          overflow: hidden;
          background-color: white;
          border-radius: 50%;
          padding: 4px;
          border: 2px solid rgba(255,255,255,0.7);
        }
        
        .logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .report-date-wrapper {
          background-color: rgba(255,255,255,0.15);
          padding: 8px 15px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .report-date {
          font-size: 14px;
          font-weight: 600;
          color: white !important;
        }
        
        /* Filter info styles */
        .filter-info {
          background: #F7FAFC;
          padding: 10px 25px;
          display: flex;
          justify-content: space-between;
          position: relative;
          z-index: 5;
          border-bottom: 1px solid #E2E8F0;
        }
        
        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #EDF2F7;
        }
        
        .filter-label {
          font-weight: 700;
          color: #2D3748;
          font-size: 13px;
        }
        
        .filter-value {
          color: #4A5568;
          font-weight: 600;
          font-size: 13px;
        }
        
        /* Summary cards */
        .summary-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          padding: 15px 25px 15px 25px; /* Added padding to bottom */
          background-color: #F7FAFC;
          margin-bottom: 0; /* No margin between cards and table */
        }
        
        .summary-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        
        .summary-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, #1A365D, #2C5282);
        }
        
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #1A365D;
          margin-bottom: 2px;
        }
        
        .summary-label {
          font-size: 14px;
          font-weight: 600;
          color: #4A5568;
        }
        
        /* Fees table container - immediately connect with cards above */
        .fees-table-container {
          padding: 0 25px 25px 25px; /* Reduced top padding to connect with cards */
          position: relative;
          z-index: 1;
          margin-top: 0; /* Removed margin to connect with cards */
        }
        
        /* First page specific styling - make table start immediately after cards */
        .report-container:first-of-type .fees-table-container {
          padding-top: 0 !important; /* No padding on first page to connect with cards */
        }
        
        /* Non-first page styling - add top margin */
        .report-container:not(:first-of-type) .fees-table-container {
          padding-top: 25px !important; /* Less padding on subsequent pages */
        }
        
        .fees-table {
          width: 95% !important;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0 auto 35px auto;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 3px 15px rgba(0,0,0,0.05);
          background-color: white;
          border: 2px solid #2C5282;
          page-break-inside: avoid;
        }
        
        /* Ensure table headers repeat on each page */
        .fees-table thead {
          display: table-header-group;
        }
        
        .fees-table th {
          background: linear-gradient(to right, #1A365D, #2C5282);
          color: white;
          padding: 12px 10px;
          font-weight: 700;
          font-size: 14px;
          text-align: center;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          letter-spacing: 0.5px;
        }
        
        .fees-table td {
          padding: 10px;
          text-align: center;
          border-bottom: 1px solid #EDF2F7;
          font-size: 13px;
          font-weight: 500;
          color: #2D3748;
          vertical-align: middle;
        }
        
        /* Add column spacing and borders */
        .fees-table th:not(:last-child),
        .fees-table td:not(:last-child) {
          border-right: 1px solid rgba(237, 242, 247, 0.8);
        }
        
        /* Add zebra striping for better readability */
        .fees-table tr:nth-child(even) {
          background-color: #F7FAFC;
        }
        
        /* Ensure consistent column widths */
        .fees-table th:nth-child(1), .fees-table td:nth-child(1) { width: 10%; } /* Student ID */
        .fees-table th:nth-child(2), .fees-table td:nth-child(2) { width: 18%; } /* Student Name */
        .fees-table th:nth-child(3), .fees-table td:nth-child(3) { width: 8%; } /* Grade */
        .fees-table th:nth-child(4), .fees-table td:nth-child(4) { width: 12%; } /* Fee Type */
        .fees-table th:nth-child(5), .fees-table td:nth-child(5) { width: 10%; } /* Total Fees */
        .fees-table th:nth-child(6), .fees-table td:nth-child(6) { width: 10%; } /* Discount */
        .fees-table th:nth-child(7), .fees-table td:nth-child(7) { width: 10%; } /* Paid Amount */
        .fees-table th:nth-child(8), .fees-table td:nth-child(8) { width: 10%; } /* Remaining */
        .fees-table th:nth-child(9), .fees-table td:nth-child(9) { width: 12%; } /* Status */
        
        /* Ensure rows don't break across pages */
        .fees-table tbody tr {
          page-break-inside: avoid;
        }
        
        /* Ensure table border is complete */
        .fees-table tbody {
          border-bottom: 2px solid #2C5282;
        }
        
        .fees-table tr:last-child td {
          border-bottom: none;
        }
        
        .fees-table tr:hover {
          background-color: #EBF8FF;
        }
        
        /* Clean page break for tables */
        @media print {
          /* Force proper page breaks between report containers */
          .report-container {
            display: block;
            page-break-before: always;
            page-break-after: always;
            page-break-inside: avoid;
          }
          
          /* First page exception */
          .report-container:first-of-type {
            page-break-before: avoid;
          }
          
          /* Last page exception */
          .report-container:last-of-type {
            page-break-after: auto;
          }
          
          /* Each table should be self-contained on its own page */
          .fees-table-container {
            page-break-before: auto;
            page-break-after: auto;
            page-break-inside: avoid;
            padding: 0 35px 60px 35px !important;
          }
          
          /* Complete table with border */
          .fees-table {
            border: 2px solid #2C5282 !important;
            page-break-before: auto;
            page-break-after: auto;
            page-break-inside: avoid;
            margin: 0 auto 35px auto !important;
          }
          
          /* Ensure page number is visible and properly positioned */
          .page-number {
            position: absolute !important;
            bottom: 20px !important;
            left: 0 !important;
            right: 0 !important;
            text-align: center !important;
            padding: 10px 0 !important;
            z-index: 100 !important;
          }
          
          /* Ensure table headers are visible and formatted correctly */
          .fees-table th {
            background: linear-gradient(to right, #1A365D, #2C5282) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Summary section spacing on first page */
          .summary-section + .fees-table-container {
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
          
          .summary-section {
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
          }
        }
        
        /* Status badge styles */
        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          min-width: 80px;
        }
        
        .status-badge.paid {
          background-color: rgba(56, 161, 105, 0.15);
          color: #276749;
          border: 1px solid rgba(56, 161, 105, 0.3);
        }
        
        .status-badge.partial {
          background-color: rgba(236, 201, 75, 0.15);
          color: #975A16;
          border: 1px solid rgba(236, 201, 75, 0.3);
        }
        
        .status-badge.unpaid {
          background-color: rgba(229, 62, 62, 0.15);
          color: #9B2C2C;
          border: 1px solid rgba(229, 62, 62, 0.3);
        }
        
        .badge-icon {
          font-size: 14px;
          font-weight: 700;
        }
        
        /* Student ID and amount styling */
        .student-id {
          direction: ltr;
          font-weight: 600;
        }
        
        .amount-column {
          text-align: left;
          direction: ltr;
          padding-left: 12px;
          font-weight: 600;
          font-feature-settings: "tnum";
          font-variant-numeric: tabular-nums;
        }
        
        /* Watermark styles */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          opacity: 0.12;
          color: #1A365D;
          z-index: 0;
          pointer-events: none;
          display: ${data.showWatermark ? 'block' : 'none'};
        }
        
        /* Logo background */
        .logo-background {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.05;
          z-index: 999;
          pointer-events: none;
          display: ${showLogoBackground ? 'block' : 'none'};
        }
        
        /* Report footer styles */
        .report-footer {
          display: none !important; /* Completely hide footer */
        }
        
        /* Print-specific footer hiding */
        @media print {
          .report-footer {
            display: none !important;
          }
          
          .report-container:last-of-type .report-footer {
            display: none !important;
          }
        }
        
        /* Only show header on the first page */
        .report-header {
          display: none;
        }
        
        .report-container:first-of-type .report-header {
          display: flex;
        }
        
        .footer-top {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0 25px;
        }
        
        .footer-copyright {
          font-size: 14px;
          font-weight: 600;
          opacity: 0.95;
          color: white;
          text-align: center;
        }
        
        .contact-cards {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          padding: 0 25px;
        }
        
        .contact-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          background: rgba(255,255,255,0.12);
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .contact-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.18);
          color: white !important;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
        }
        
        .contact-text {
          display: flex;
          flex-direction: column;
        }
        
        .contact-label {
          font-size: 10px;
          color: rgba(255,255,255,0.9);
          font-weight: 500;
        }
        
        .contact-value {
          font-size: 12px;
          color: white;
          font-weight: 600;
          direction: ltr;
        }
        
        /* Page number positioning */
        .page-number {
          position: absolute;
          bottom: 20px; /* Fixed distance from bottom */
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #4A5568;
          padding: 10px 0;
          z-index: 100;
        }

        /* Print button styles */
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #3182CE;
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
          background-color: #2C5282;
        }
        
        .print-button svg {
          width: 16px;
          height: 16px;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        ${isArabic ? 'عرض' : 'View'}
      </button>
      
      ${feesPages.map((pageFees, pageIndex) => `
      <div class="report-container">
        ${showLogoBackground && data.schoolLogo ? `<div class="logo-background" style="background-image: url(${data.schoolLogo})"></div>` : ''}
        
        <header class="report-header">
          <div class="header-content">
            <div class="logo-container">
              ${data.schoolLogo ? `<img src="${data.schoolLogo}" alt="${displaySchoolName}" onerror="this.style.display='none'" />` : ''}
            </div>
            <div class="header-text">
              <div class="header-title">${isArabic ? 'تقرير تحصيل الرسوم' : 'Fees Collection Report'}</div>
              <div class="school-name">${displaySchoolName}</div>
            </div>
          </div>
          <div class="report-date-wrapper">
            <div class="report-date">${isArabic ? 'تاريخ التقرير' : 'Report Date'}: ${data.reportDate ? formatDate(data.reportDate) : formatHeaderDate()}</div>
          </div>
        </header>
        
        ${pageIndex === 0 ? `
        <div class="filter-info">
          ${data.academicYear ? `
          <div class="filter-item">
            <span class="filter-label">${isArabic ? 'العام الدراسي' : 'Academic Year'}:</span>
            <span class="filter-value">${data.academicYear}</span>
          </div>
          ` : ''}
          ${data.grade ? `
          <div class="filter-item">
            <span class="filter-label">${isArabic ? 'الصف' : 'Grade'}:</span>
            <span class="filter-value">${data.grade}</span>
          </div>
          ` : ''}
          ${data.section ? `
          <div class="filter-item">
            <span class="filter-label">${isArabic ? 'الشعبة' : 'Section'}:</span>
            <span class="filter-value">${data.section}</span>
          </div>
          ` : ''}
          ${data.dateRange ? `
          <div class="filter-item">
            <span class="filter-label">${isArabic ? 'نطاق التاريخ' : 'Date Range'}:</span>
            <span class="filter-value">${dateRangeText}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-value">${data.fees.length}</div>
            <div class="summary-label">${isArabic ? 'إجمالي الطلاب' : 'Total Students'}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${(totalFees || 0).toFixed(2)} ${currencySymbol}</div>
            <div class="summary-label">${isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${(totalPaid || 0).toFixed(2)} ${currencySymbol}</div>
            <div class="summary-label">${isArabic ? 'إجمالي المدفوعات' : 'Total Paid'}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${collectionRate.toFixed(1)}%</div>
            <div class="summary-label">${isArabic ? 'نسبة التحصيل' : 'Collection Rate'}</div>
          </div>
        </div>
        ` : ''}
        
        <div class="fees-table-container" style="${pageIndex === 0 ? 'margin-top: 0; padding-top: 0;' : ''}">
          <table class="fees-table">
            <thead>
              <tr>
                <th>${isArabic ? 'رقم الطالب' : 'Student ID'}</th>
                <th>${isArabic ? 'اسم الطالب' : 'Student Name'}</th>
                <th>${isArabic ? 'الصف' : 'Grade'}</th>
                <th>${isArabic ? 'نوع الرسوم' : 'Fee Type'}</th>
                <th>${isArabic ? 'إجمالي الرسوم' : 'Total Fees'}</th>
                <th>${isArabic ? 'الخصم' : 'Discount'}</th>
                <th>${isArabic ? 'المبلغ المدفوع' : 'Paid Amount'}</th>
                <th>${isArabic ? 'المبلغ المتبقي' : 'Remaining Amount'}</th>
                <th>${isArabic ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${pageFees.map(fee => {
                const statusClass = fee.status === 'paid' ? 'paid' : fee.status === 'partial' ? 'partial' : 'unpaid';
                const statusText = isArabic 
                  ? (fee.status === 'paid' ? 'مدفوع' : fee.status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع')
                  : (fee.status === 'paid' ? 'Paid' : fee.status === 'partial' ? 'Partial' : 'Unpaid');
                const statusIcon = fee.status === 'paid' ? '✓' : fee.status === 'partial' ? '◔' : '✗';
                const feeType = isArabic 
                  ? translateFeeTypeToArabic(fee.feeType || 'other') 
                  : (fee.feeType || 'Other');
                
                return `
                  <tr>
                    <td class="student-id">${fee.studentId}</td>
                    <td>${isArabic ? fee.studentName : (fee.studentNameEn || fee.studentName)}</td>
                    <td>${fee.grade}</td>
                    <td>${feeType}</td>
                    <td class="amount-column">${(fee.totalFees || fee.amount || 0).toFixed(2)} ${currencySymbol}</td>
                    <td class="amount-column">${(fee.discount || 0).toFixed(2)} ${currencySymbol}</td>
                    <td class="amount-column">${(fee.paidAmount || fee.paid || 0).toFixed(2)} ${currencySymbol}</td>
                    <td class="amount-column">${(fee.remainingAmount || fee.balance || 0).toFixed(2)} ${currencySymbol}</td>
                    <td>
                      <div class="status-badge ${statusClass}">
                        <span class="badge-icon">${statusIcon}</span>
                        <span>${statusText}</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="page-number">${isArabic ? `صفحة ${pageIndex + 1} من ${feesPages.length}` : `Page ${pageIndex + 1} of ${feesPages.length}`}</div>
        </div>
      </div>
      `).join('')}
    </body>
    </html>
  `;
};