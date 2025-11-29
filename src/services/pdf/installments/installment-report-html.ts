/**
 * Installment Report HTML Generator
 * 
 * Generates HTML for student installment reports with professional styling and print compatibility.
 */

import { StudentInstallmentsReportData } from '../types';
import { getRandomBackground, getEnhancedPrintStyles, getBigCenteredLogoWatermark } from '../utils/print-styles';
import { formatDate } from '../utils/formatting';
import { CURRENCY } from '../../../utils/constants';

/**
 * Generate HTML for student installments report
 * 
 * Features:
 * - Professional styling with blue gradient header
 * - Detailed installment breakdown with status indicators
 * - Summary section with payment statistics
 * - Print-optimized styling
 * - Support for school stamp and signature
 * 
 * @param data - Student installments report data
 * @returns HTML string for the installments report
 */
export const generateStudentInstallmentsReportHTML = (data: StudentInstallmentsReportData): string => {
  // Group installments by status for summary
  const statusCounts = {
    paid: data.installments.filter(inst => inst.status === 'paid').length,
    upcoming: data.installments.filter(inst => inst.status === 'upcoming').length,
    overdue: data.installments.filter(inst => inst.status === 'overdue').length,
    partial: data.installments.filter(inst => inst.status === 'partial').length
  };

  // Calculate totals with null/undefined safety
  const totalAmount = data.installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
  const totalPaid = data.installments.reduce((sum, inst) => {
    if (inst.status === 'paid') {
      return sum + (inst.amount || 0);
    } else if (inst.status === 'partial' && inst.paidAmount !== undefined) {
      return sum + (inst.paidAmount || 0);
    }
    return sum;
  }, 0);
  const totalDue = totalAmount - totalPaid;
  
  const backgroundPattern = getRandomBackground();
  const showStamp = data.showStamp !== undefined ? data.showStamp : false;
  const showSignature = data.showSignature !== undefined ? data.showSignature : false;
  // Always set showFooter to false to remove the footer
  const showFooter = false;
  
  // Never show watermark or logo background
  const showLogoBackground = false;
  const showWatermark = false;
  
  const currentDate = formatDate(new Date().toISOString());
  
  // Prepare currency symbols
  const CURRENCY_EN = CURRENCY;
  const CURRENCY_AR = CURRENCY;
  
  // Setup language and direction
  const isArabic = true; // Always use Arabic for these reports
  const documentLang = 'ar';
  const documentDirection = 'rtl';
  
  return `
    <!DOCTYPE html>
    <html lang="${documentLang}" dir="${documentDirection}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="format-detection" content="telephone=no">
      <meta name="print-color-adjust" content="exact">
      <title>${isArabic ? 'تقرير أقساط الطالب' : 'Student Installments Report'} - ${data.studentName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        html, body {
          width: 100%;
          min-height: 297mm;
          font-family: 'Tajawal', sans-serif;
          background: #f4f6fa;
          color: #222;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .report-container {
          width: 100%;
          min-height: 100vh;
          background: #fff;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .report-header {
          width: 100%;
          background: ${backgroundPattern};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: auto;
          min-height: unset;
          box-sizing: border-box;
          border-radius: 0;
        }
        
        .logo-container {
          width: 60px; height: 60px; margin: 0 16px 0 0; display: flex; align-items: center;
        }
        
        .logo-container img { width: 100%; height: 100%; object-fit: contain; }
        
        .school-info { flex: 1; }
        
        .school-name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        
        .school-contact { font-size: 14px; opacity: 0.95; }
        
        .report-date { font-size: 15px; }
        
        .report-title {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          color: #800020;
          margin: 24px 0 16px 0;
          letter-spacing: 1px;
        }
        
        .student-info {
          display: flex;
          gap: 24px;
          margin: 0 32px 24px 32px;
        }
        
        .info-item {
          flex: 1 1 0;
          border-left: none !important;
          border-radius: 12px;
          box-shadow: 0 2px 12px #0002;
          padding: 20px 18px 16px 18px;
          background: #fff !important;
          border: 1px solid #E2E8F0 !important;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        
        .info-label {
          font-size: 16px;
          color: #800020;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        
        .info-item span:not(.info-label) {
          font-size: 22px;
          font-weight: 700;
          color: #222;
          margin-bottom: 2px;
        }
        
        .summary {
          display: flex;
          justify-content: space-around;
          margin: 0 32px 24px 32px;
          background: #f7fafc;
          border-radius: 10px;
          box-shadow: 0 1px 6px #0001;
          padding: 18px 0;
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
        }
        
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #800020;
          margin-bottom: 4px;
        }
        
        .summary-label {
          font-size: 14px;
          color: #4A5568;
          font-weight: 600;
        }
        
        .installments-section {
          margin: 0 32px 0 32px;
          padding: 0;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #2D3748;
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #E2E8F0;
          text-align: center;
        }
        
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          border: 2px solid #800020;
          table-layout: auto;
          font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .fee-table th {
          background: linear-gradient(135deg, #800020 0%, #A52A2A 100%);
          color: white !important;
          font-weight: bold;
          padding: 10px 15px;
          border: none;
          text-align: right;
          font-size: 15px;
        }
        .fee-table td {
          padding: 10px 15px;
          border-top: 1px solid #DDD;
          font-size: 14px;
          text-align: right;
        }
        .fee-table tr:last-child {
          background-color: #F0F4F8;
          font-weight: bold;
        }
        .fee-table .fee-amount {
          text-align: right;
          direction: ltr;
        }
        .fee-table .total-amount {
          text-align: right;
          direction: ltr;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 700;
          min-width: 60px;
          max-width: 100%;
        }
        
        .status-badge.status-paid {
          background-color: rgba(56, 161, 105, 0.15);
          color: #276749;
          border: 1px solid rgba(56, 161, 105, 0.3);
        }
        
        .status-badge.status-partial {
          background-color: rgba(236, 201, 75, 0.15);
          color: #975A16;
          border: 1px solid rgba(236, 201, 75, 0.3);
        }
        
        .status-badge.status-unpaid, .status-badge.status-overdue {
          background-color: rgba(229, 62, 62, 0.15);
          color: #9B2C2C;
          border: 1px solid rgba(229, 62, 62, 0.3);
        }
        
        .status-badge.status-upcoming {
          background-color: rgba(66, 153, 225, 0.15);
          color: #2A4365;
          border: 1px solid rgba(66, 153, 225, 0.3);
        }
        
        .badge-icon { font-size: 18px; font-weight: 700; }
        
        @media print {
          .no-print, button, .download-btn, .print-btn { display: none !important; }
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 100% !important;
            min-height: 297mm;
            font-family: 'Tajawal', sans-serif;
            background: #f4f6fa;
            color: #222;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box;
          }
          .report-container {
            padding-bottom: 0 !important;
            height: 100% !important;
            page-break-after: avoid;
            page-break-inside: avoid;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box;
            border-radius: 0 !important;
          }
          .logo-background { display: none !important; }
          .footer { display: none !important; }
          .info-item span:not(.info-label) { font-size: 18px !important; }
          .summary-value { font-size: 13px !important; }
          .fee-table th, .fee-table td { font-size: 16px !important; padding: 10px 6px !important; }
          .fee-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            page-break-inside: avoid !important;
            box-sizing: border-box;
          }
          .status { padding: 2px 2px !important; font-size: 11px !important; }
          .text-watermark { display: none !important; }
        }
        
        /* Use Tajawal font everywhere */
        html, body, .fee-table, .report-header, .header-contact-info, .report-title, .section-title, .student-info, .summary, .summary-item, .summary-value, .summary-label {
          font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        /* Maroon color for all headers, accents, and table borders */
        .report-header, .fee-table th, .section-title, .summary-label, .summary-value, .report-title {
          background: linear-gradient(135deg, #800020 0%, #A52A2A 100%) !important;
          color: white !important;
        }
        .fee-table th, .fee-table td {
          border: 1.5px solid #800020 !important;
        }
        .fee-table {
          border: 2px solid #800020 !important;
        }
        .fee-table tr:last-child {
          background-color: #F0F4F8 !important;
          font-weight: bold;
        }
        .fee-table .fee-amount, .fee-table .total-amount {
          text-align: right;
          direction: ltr;
        }
        /* Ensure header content fits and does not overflow */
        .report-header {
          box-sizing: border-box;
          overflow: hidden;
          max-width: 100vw;
          padding: 10px 25px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .logo img {
          max-height: 60px;
          max-width: 160px;
          width: auto;
          height: auto;
          display: block;
          margin: 0 auto 8px auto;
        }
        .header-contact-info {
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          padding: 5px 0;
          align-items: center;
          direction: rtl;
          margin-top: 5px;
          max-width: 100vw;
          overflow: hidden;
        }
        .header-contact-info span {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          background-color: rgba(128,0,32,0.15);
          border-radius: 20px;
          border: 1px solid rgba(128,0,32,0.3);
          margin: 0 5px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          text-align: right;
        }
        .header-contact-info span strong {
          color: white;
          font-weight: 600;
          margin-left: 5px;
        }
        .report-title, .section-title {
          background: none !important;
          color: #800020 !important;
          font-size: 22px;
          font-weight: 700;
          margin: 24px 0 16px 0;
          letter-spacing: 1px;
          text-align: center;
        }
        .summary-label, .summary-value {
          color: #800020 !important;
          background: none !important;
        }
        .summary {
          background: #f7fafc !important;
        }
        .student-info .info-label {
          color: #800020 !important;
        }
        /* Table font sizes and weights */
        .fee-table th {
          font-size: 15px !important;
          font-weight: bold !important;
        }
        .fee-table td {
          font-size: 14px !important;
          font-weight: 500 !important;
        }
        /* Remove maroon background from info cards and info labels */
        .student-info, .info-item, .summary, .summary-item {
          background: #fff !important;
          color: #222 !important;
        }
        .info-label {
          color: #800020 !important;
          background: none !important;
        }
        /* Header: auto height, content fits naturally, no overflow */
        .report-header {
          box-sizing: border-box;
          overflow: visible;
          max-width: 100vw;
          padding: 10px 25px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: auto !important;
          min-height: unset !important;
        }
        .logo img {
          max-height: 60px;
          max-width: 160px;
          width: auto;
          height: auto;
          display: block;
          margin: 0 auto 8px auto;
        }
        .header-contact-info {
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          padding: 5px 0;
          align-items: center;
          direction: rtl;
          margin-top: 5px;
          max-width: 100vw;
          overflow: visible;
        }
        .header-contact-info span {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          background-color: rgba(128,0,32,0.15);
          border-radius: 20px;
          border: 1px solid rgba(128,0,32,0.3);
          margin: 0 5px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          text-align: right;
        }
        .header-contact-info span strong {
          color: white;
          font-weight: 600;
          margin-left: 5px;
        }
        /* Font everywhere is Tajawal */
        html, body, .fee-table, .report-header, .header-contact-info, .report-title, .section-title, .student-info, .summary, .summary-item, .summary-value, .summary-label, .info-label, .info-item {
          font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        /* Headers auto height */
        .report-header, .receipt-header {
          height: auto !important;
          min-height: unset !important;
        }
        /* Tables auto layout */
        .fee-table, table {
          table-layout: auto !important;
          width: 100% !important;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <header class="report-header" style="flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 10px 25px;">
          ${data.schoolLogo ? `
            <div class="logo" style="margin-bottom: 8px; text-align: center;">
              <img src="${data.schoolLogo}" alt="${data.schoolName}" style="max-height: 60px; max-width: 160px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); padding: 3px; background-color: white; border-radius: 50%; border: 2px solid rgba(255,255,255,0.7);" />
            </div>
          ` : ''}
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 2px; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">تقرير أقساط الطالب</h1>
          <p style="font-size: 16px; font-weight: 600; opacity: 0.95; margin-bottom: 0;">${data.schoolName}</p>
          <div class="header-contact-info" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; padding: 5px 0; align-items: center; direction: rtl; margin-top: 5px;">
            ${data.schoolPhone ? `<span style="display: inline-flex; align-items: center; padding: 3px 10px; background-color: rgba(255,255,255,0.15); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3); margin: 0 5px; color: white; font-size: 12px; font-weight: 500;"><strong style="color: white; font-weight: 600; margin-left: 5px;">هاتف:</strong> <span dir="ltr">${data.schoolPhone}</span></span>` : ''}
            ${data.schoolPhoneWhatsapp ? `<span style="display: inline-flex; align-items: center; padding: 3px 10px; background-color: rgba(255,255,255,0.15); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3); margin: 0 5px; color: white; font-size: 12px; font-weight: 500;"><strong style="color: white; font-weight: 600; margin-left: 5px;">واتساب:</strong> <span dir="ltr">${data.schoolPhoneWhatsapp}</span></span>` : ''}
            ${data.schoolPhoneCall ? `<span style="display: inline-flex; align-items: center; padding: 3px 10px; background-color: rgba(255,255,255,0.15); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3); margin: 0 5px; color: white; font-size: 12px; font-weight: 500;"><strong style="color: white; font-weight: 600; margin-left: 5px;">اتصال:</strong> <span dir="ltr">${data.schoolPhoneCall}</span></span>` : ''}
            ${data.schoolEmail ? `<span style="display: inline-flex; align-items: center; padding: 3px 10px; background-color: rgba(255,255,255,0.15); border-radius: 20px; border: 1px solid rgba(255,255,255,0.3); margin: 0 5px; color: white; font-size: 12px; font-weight: 500;"><strong style="color: white; font-weight: 600; margin-left: 5px;">البريد الإلكتروني:</strong> <span dir="ltr">${data.schoolEmail}</span></span>` : ''}
          </div>
          <div class="report-date" style="font-size: 15px; margin-top: 5px;">تاريخ التقرير: ${currentDate}</div>
        </header>
        <div class="report-title">تقرير أقساط الطالب</div>
        <div class="report-content">
          <div class="student-info">
            <div class="info-item">
              <span class="info-label">اسم الطالب:</span>
              <span>${data.studentName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">رقم الطالب:</span>
              <span>${data.studentId}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الصف:</span>
              <span>${data.grade}</span>
            </div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${totalAmount.toLocaleString('ar-SA')} ${CURRENCY_EN}</div>
              <div class="summary-label">إجمالي المبلغ</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalPaid.toLocaleString('ar-SA')} ${CURRENCY_EN}</div>
              <div class="summary-label">إجمالي المدفوع</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalDue.toLocaleString('ar-SA')} ${CURRENCY_EN}</div>
              <div class="summary-label">إجمالي المتبقي</div>
            </div>
          </div>
          <div class="installments-section">
            <div class="section-title">تفاصيل الأقساط</div>
            <table class="fee-table" dir="rtl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>المبلغ</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${data.installments.map((inst, idx) => {
                  const amount = inst.amount || 0;
                  const paidAmount = inst.paidAmount || 0;
                  const remainingAmount = amount - paidAmount;
                  return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${formatDate(inst.dueDate || '')}</td>
                    <td class="fee-amount">${amount.toLocaleString('en-US')} ${CURRENCY_EN}</td>
                    <td class="fee-amount">${paidAmount.toLocaleString('en-US')} ${CURRENCY_EN}</td>
                    <td class="fee-amount">${remainingAmount.toLocaleString('en-US')} ${CURRENCY_EN}</td>
                    <td>${inst.status === 'paid' ? 'مدفوع' : inst.status === 'partial' ? 'مدفوع جزئياً' : inst.status === 'overdue' ? 'متأخر' : 'قادم'}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};