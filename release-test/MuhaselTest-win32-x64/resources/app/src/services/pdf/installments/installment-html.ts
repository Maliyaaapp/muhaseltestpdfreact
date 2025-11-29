/**
 * Installment Report HTML generation
 */

import { InstallmentReportData } from '../types';
import { getRandomBackground } from '../utils/print-styles';
import { formatDate } from '../utils/formatting';
import { CURRENCY } from '../../../utils/constants';

/**
 * Generate HTML for an installment report
 * Supports only Arabic (RTL) language, English reports are handled elsewhere
 */
export const generateInstallmentReportHTML = (data: InstallmentReportData): string => {
  // If language is English, return empty string as it's handled elsewhere
  if (data.language === 'english') {
    return '';
  }
  
  const backgroundPattern = getRandomBackground();
  
  // Always use Arabic/RTL since this function now only handles Arabic reports
  const isArabic = true;
  const documentDirection = 'rtl';
  const documentLang = 'ar';
  
  // Use document-specific setting or fall back to general setting
  const showLogoBackground = data.showLogoBackground !== undefined ? data.showLogoBackground : false;
  
  // Use Arabic school name
  const displaySchoolName = data.schoolName;
  
  // FORCE currency to be correct for Arabic
  const currencySymbol = CURRENCY;
  
  // Generate the HTML for the installment table rows
  const installmentTableRows = data.installments.map(installment => {
    return `
      <tr>
        <td>${installment.installmentNumber}</td>
        <td>${installment.month}</td>
        <td class="amount"><span dir="ltr">${installment.amount.toFixed(2)} ${currencySymbol}</span></td>
        <td class="amount"><span dir="ltr">${installment.paidAmount.toFixed(2)} ${currencySymbol}</span></td>
        <td class="amount"><span dir="ltr">${installment.remainingAmount.toFixed(2)} ${currencySymbol}</span></td>
        <td>${formatDate(installment.dueDate)}</td>
        <td class="status ${installment.status === 'paid' ? 'paid' : installment.status === 'partial' ? 'partial' : 'unpaid'}">
          ${isArabic 
            ? (installment.status === 'paid' ? 'مدفوع' : installment.status === 'partial' ? 'مدفوع جزئياً' : 'غير مدفوع')
            : (installment.status === 'paid' ? 'Paid' : installment.status === 'partial' ? 'Partial' : 'Unpaid')
          }
        </td>
      </tr>
    `;
  }).join('');
  
  // Calculate totals
  const totalAmount = data.installments.reduce((sum, installment) => sum + installment.amount, 0);
  const totalPaid = data.installments.reduce((sum, installment) => sum + installment.paidAmount, 0);
  const totalRemaining = data.installments.reduce((sum, installment) => sum + installment.remainingAmount, 0);
  
  return `
    <!DOCTYPE html>
    <html lang="${documentLang}" dir="${documentDirection}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="format-detection" content="telephone=no">
      <meta name="print-color-adjust" content="exact">
      <title>${isArabic ? 'تقرير الأقساط' : 'Installment Report'} - ${data.studentName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Inter:wght@400;500;700&display=swap');
        
        /* CSS Reset */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        /* Base document styles - exact A4 sizing with safe print margins */
        @page {
          size: 210mm 297mm;
          margin: 0;
        }
        
        html, body {
          width: 210mm;
          height: 297mm;
          font-family: ${isArabic ? "'Tajawal'" : "'Inter'"}, sans-serif;
          background-color: white;
          color: #333;
          direction: ${documentDirection};
          margin: 0;
          padding: 0;
          overflow: hidden;
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
        
        /* Enhanced number formatting for Arabic display */
        .currency-label {
          unicode-bidi: isolate;
        }
        
        /* Fix for Arabic text with number combinations */
        [dir="rtl"] .ltr-text {
          display: inline-block;
          unicode-bidi: isolate;
          direction: ltr;
          text-align: left;
        }
        
        /* Fix for Arabic number display */
        .installment-table td.amount {
          direction: ltr;
          text-align: ${isArabic ? 'right' : 'left'};
          unicode-bidi: isolate;
        }
        
        /* Fix for numbers in Arabic context */
        [dir="rtl"] span[dir="ltr"] {
          unicode-bidi: isolate;
          display: inline-block;
          margin: 0 2px;
        }
        
        /* Screen display styles */
        @media screen {
          body {
            background-color: #f8f9fa;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          
          .report-container {
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
            width: 210mm;
            max-width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background-color: white;
            position: relative;
            overflow: hidden;
          }
        }
        
        /* Print-specific styles with enhanced compatibility */
        @media print {
          @page {
            size: 210mm 297mm;
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
          
          /* Ensure watermark prints correctly */
          .watermark {
            display: ${data.showWatermark ? 'block' : 'none'} !important;
            visibility: visible !important;
            opacity: 0.12 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            z-index: 1000 !important;
          }
          
          /* Ensure logo background prints correctly */
          .logo-background {
            display: ${showLogoBackground ? 'block' : 'none'} !important;
            visibility: visible !important;
            opacity: 0.12 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            z-index: 1000 !important;
          }
          
          /* Ensure all gradient headers print correctly */
          .report-header, .report-footer, .installment-table th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        /* Report header styles */
        .report-header {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: ${backgroundPattern};
          color: white;
          margin: 0;
          position: relative;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
        }
        
        .school-info {
          text-align: ${isArabic ? 'right' : 'left'};
        }
        
        .school-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 12px;
          margin-top: 5px;
        }
        
        .logo-container {
          width: 80px;
          height: 80px;
          overflow: hidden;
          ${isArabic ? 'margin-left' : 'margin-right'}: 20px;
        }
        
        .logo-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        /* Report title styles */
        .report-title {
          text-align: center;
          padding: 15px 0;
          font-size: 20px;
          font-weight: bold;
          background-color: #EBF8FF;
          border-bottom: 1px solid #BEE3F8;
        }
        
        /* Report content styles */
        .report-content {
          padding: 20px;
        }
        
        /* Student info styles */
        .student-info {
          margin-bottom: 20px;
          padding: 15px;
          background-color: transparent;
          border-radius: 5px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 5px;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 120px;
          color: #2C5282;
        }
        
        /* Installment table styles */
        .installment-table-container {
          overflow-x: auto;
        }
        
        .installment-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .installment-table th {
          background: ${backgroundPattern};
          color: white !important;
          padding: 10px;
          text-align: ${isArabic ? 'right' : 'left'};
          position: sticky;
          top: 0;
        }
        
        .installment-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #BEE3F8;
        }
        
        .installment-table tr:nth-child(even) {
          background-color: #EBF8FF;
        }
        
        .installment-table .status {
          font-weight: bold;
        }
        
        .installment-table .status.paid {
          color: #38A169;
        }
        
        .installment-table .status.partial {
          color: #DD6B20;
        }
        
        .installment-table .status.unpaid {
          color: #E53E3E;
        }
        
        /* Summary styles */
        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: transparent;
          border-radius: 5px;
        }
        
        .summary-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2C5282;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          padding: 5px 0;
          border-bottom: 1px solid #BEE3F8;
        }
        
        .summary-label {
          font-weight: bold;
        }
        
        .summary-value {
          direction: ltr;
        }
        
        /* Report footer styles */
        .report-footer {
          display: none; /* Hide footer as requested */
        }
        
        .report-date {
          position: absolute;
          top: 20px;
          ${isArabic ? 'left' : 'right'}: 20px;
          font-size: 14px;
          color: white;
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
        
        /* Watermark styles */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          opacity: 0.15;
          color: #1A365D;
          z-index: 10;
          pointer-events: none;
          display: ${data.showWatermark ? 'block' : 'none'};
        }
        
        /* Logo background styles */
        .logo-background {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70%;
          height: 70%;
          max-width: 500px;
          max-height: 500px;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          z-index: 10;
          pointer-events: none;
          display: ${showLogoBackground ? 'block' : 'none'};
          background-image: ${data.schoolLogo ? `url('${data.schoolLogo}')` : 'none'};
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
        ${isArabic ? 'طباعة' : 'Print'}
      </button>
      
      <div class="report-container">
        ${data.showWatermark ? `<div class="watermark">${isArabic ? 'نسخة' : 'COPY'}</div>` : ''}
        ${showLogoBackground && data.schoolLogo ? `<div class="logo-background"></div>` : ''}
        
        <header class="report-header">
          <div class="logo-container">
            ${data.schoolLogo ? `<img src="${data.schoolLogo}" alt="${displaySchoolName}" onerror="this.style.display='none'" />` : ''}
          </div>
          <div class="school-info">
            <div class="school-name">${displaySchoolName}</div>
            <div class="school-contact">
              ${data.schoolPhone ? `${isArabic ? 'هاتف' : 'Phone'}: ${data.schoolPhone}` : ''}
              ${data.schoolPhoneWhatsapp ? ` | ${isArabic ? 'واتساب' : 'WhatsApp'}: ${data.schoolPhoneWhatsapp}` : ''}
              ${data.schoolPhoneCall ? ` | ${isArabic ? 'اتصال' : 'Call'}: ${data.schoolPhoneCall}` : ''}
              ${data.schoolEmail ? ` | ${isArabic ? 'البريد الإلكتروني' : 'Email'}: ${data.schoolEmail}` : ''}
              ${data.schoolAddress ? ` | ${isArabic ? 'العنوان' : 'Address'}: ${data.schoolAddress}` : ''}
            </div>
          </div>
          <div>
            <div class="report-date">${isArabic ? 'تاريخ التقرير' : 'Report Date'}: ${formatDate(data.reportDate)}</div>
          </div>
        </header>
        
        <div class="report-title">
          ${isArabic ? 'تقرير الأقساط' : 'Installment Report'}
        </div>
        
        <div class="report-content">
          <div class="student-info">
            <div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'اسم الطالب' : 'Student Name'}:</div>
                <div>${isArabic ? data.studentName : (data.studentNameEn || data.studentName)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'الصف' : 'Grade'}:</div>
                <div>${data.grade}</div>
              </div>
            </div>
            <div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'رقم الطالب' : 'Student ID'}:</div>
                <div>${data.studentId}</div>
              </div>
              <div class="info-row">
                <div class="info-label">${isArabic ? 'العام الدراسي' : 'Academic Year'}:</div>
                <div>${data.academicYear}</div>
              </div>
            </div>
          </div>
          
          <div class="installment-table-container">
            <table class="installment-table">
              <thead>
                <tr>
                  <th>${isArabic ? 'رقم القسط' : 'Installment No'}</th>
                  <th>${isArabic ? 'الشهر' : 'Month'}</th>
                  <th>${isArabic ? 'المبلغ' : 'Amount'}</th>
                  <th>${isArabic ? 'المدفوع' : 'Paid'}</th>
                  <th>${isArabic ? 'المتبقي' : 'Remaining'}</th>
                  <th>${isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th>${isArabic ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                ${installmentTableRows}
              </tbody>
            </table>
          </div>
          
          <div class="summary">
            <div class="summary-title">${isArabic ? 'ملخص الأقساط' : 'Installment Summary'}</div>
            <div class="summary-row">
              <div class="summary-label">${isArabic ? 'إجمالي عدد الأقساط' : 'Total Installments'}:</div>
              <div class="summary-value">${data.installments.length}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">${isArabic ? 'إجمالي المبلغ' : 'Total Amount'}:</div>
              <div class="summary-value">${totalAmount.toFixed(2)} ${currencySymbol}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">${isArabic ? 'إجمالي المدفوع' : 'Total Paid'}:</div>
              <div class="summary-value">${totalPaid.toFixed(2)} ${currencySymbol}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">${isArabic ? 'إجمالي المتبقي' : 'Total Remaining'}:</div>
              <div class="summary-value">${totalRemaining.toFixed(2)} ${currencySymbol}</div>
            </div>
            <div class="summary-row">
              <div class="summary-label">${isArabic ? 'نسبة السداد' : 'Payment Rate'}:</div>
              <div class="summary-value">${totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(2) : 0}%</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};