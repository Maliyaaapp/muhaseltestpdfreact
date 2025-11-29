/**
 * Student Report HTML Generator
 * 
 * Generates HTML for student financial reports with professional styling and print compatibility.
 */

import { StudentReportData } from '../types';
import { getRandomBackground, getEnhancedPrintStyles } from '../utils/print-styles';
import { formatDate } from '../utils/formatting';
import { CURRENCY } from '../../../utils/constants';

/**
 * Generate HTML for a student financial report
 * 
 * Features:
 * - Professional styling with blue gradient header
 * - Optional watermark and school logo
 * - Responsive layout for different screen sizes
 * - Print-optimized styling
 * - Support for school stamp and signature
 * - Detailed fee breakdown with totals
 * 
 * @param data - Student report data object
 * @returns HTML string for the student report
 */
export const generateStudentReportHTML = (data: StudentReportData): string => {
  const backgroundPattern = getRandomBackground();
  
  // Calculate totals
  let totalAmount = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  let totalDiscount = 0;
  
  data.fees.forEach(fee => {
    totalAmount += fee.amount;
    totalPaid += fee.paid;
    
    // Only count the discount if the fee isn't fully paid (balance > 0)
    const effectiveDiscount = fee.balance === 0 ? 0 : (fee.discount || 0);
    totalDiscount += effectiveDiscount;
    
    // For any fully paid fee, balance should be 0 regardless of discount
    totalBalance += fee.balance;
  });
  
  // Explicitly check if watermark should be shown
  const showWatermark = data.showWatermark === true;
  const showStamp = data.showStamp === true;
  const showSignature = data.showSignature === true;
  const showLogoBackground = data.showLogoBackground === true;
  
  // Determine payment status and color
  let paymentStatus = 'غير مدفوع';
  let statusColor = '#dc3545';
  
  if (totalBalance === 0) {
    paymentStatus = 'مدفوع بالكامل';
    statusColor = '#28a745';
  } else if (totalPaid > 0) {
    paymentStatus = 'مدفوع جزئياً';
    statusColor = '#fd7e14';
  }
  
  // Always include the discount column even if there are no discounts
  const showDiscountColumn = true;
  
  // Generate a unique report ID for reference
  const reportId = `SR-${Math.floor(Math.random() * 9000000) + 1000000}`;
  
  // Format the current date in a standardized format
  const reportDate = formatDate(new Date().toISOString());
  
  // Academic year calculation (assuming Sep-Aug academic year)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const academicYearStart = currentDate.getMonth() >= 8 ? currentYear : currentYear - 1;
  const academicYearEnd = academicYearStart + 1;
  const academicYear = `${academicYearStart}/${academicYearEnd}`;
  
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>التقرير المالي للطالب - ${data.studentName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html, body {
          height: 100%;
          font-family: 'Tajawal', Arial, sans-serif !important;
          line-height: 1.6;
          color: #333;
          background-color: #ffffff;
          overflow-x: hidden;
          width: 100%;
        }
        
        .arabic-text {
          font-family: 'Tajawal', Arial, sans-serif !important;
        }
        
        .report-container {
          width: 100%;
          min-height: 100vh;
          position: relative;
          background-color: white;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding-bottom: 60px; /* Space for footer */
        }
        
        /* Watermark styling */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          color: rgba(200, 200, 200, 0.1);
          z-index: 99;
          pointer-events: none;
          font-weight: 700;
          white-space: nowrap;
          opacity: 0.5;
          display: ${showWatermark ? 'block' : 'none'} !important;
        }
        
        .school-logo-background {
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
          z-index: 99;
          pointer-events: none;
        }
        
        /* Header styles - Modern blue gradient */
        .report-header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%); /* Professional blue gradient */
          color: white;
          padding: 18px 0;
          text-align: center;
          position: relative;
          z-index: 10;
          margin: 0;
          width: 100%;
          border-bottom: 3px solid #E2E8F0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .report-header h1 {
          font-size: 28px;
          margin: 0;
          color: white;
          font-weight: 700;
          font-family: 'Tajawal', sans-serif !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        /* Enhanced report metadata styling */
        .report-metadata {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px 20px;
          margin: 20px 0;
          padding: 20px;
          background-color: #F7FAFC;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }
        
        .metadata-item {
          display: flex;
          flex-direction: column;
        }
        
        .metadata-label {
          font-weight: 600;
          color: #4A5568;
          margin-bottom: 5px;
          font-size: 14px;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .metadata-value {
          font-weight: 500;
          color: #2D3748;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        /* Content wrapper with proper margins */
        .content-wrapper {
          padding: 18px 22px;
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background-color: white;
        }
        
        /* School info styles - improved layout with card style */
        .school-info {
          display: flex;
          align-items: center;
          margin-bottom: 25px;
          position: relative;
          z-index: 10;
          padding: 15px;
          border-radius: 8px;
          background-color: #F8FAFC;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          border: 1px solid #E2E8F0;
        }
        
        .school-logo-container {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 20px;
          border: 1px solid #E2E8F0;
          padding: 5px;
          background-color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border-radius: 50%; /* Circular logo container */
          overflow: hidden;
        }
        
        .school-logo {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .school-details {
          flex: 1;
        }
        
        .school-name {
          font-size: 24px;
          font-weight: 700;
          color: #1A365D; /* Dark blue for school name */
          margin-bottom: 8px;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .school-contact {
          font-size: 12px;
          color: #4A5568; /* Darker gray for better readability */
          font-family: 'Tajawal', sans-serif !important;
          font-weight: 500;
        }
        
        .school-contact div {
          margin-bottom: 3px;
        }
        
        /* Document title */
        .document-title {
          text-align: center;
          margin: 15px 0 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid #E2E8F0;
          position: relative;
        }
        
        .document-title h2 {
          font-size: 22px;
          color: #1A365D; /* Dark blue for consistency */
          font-weight: 700;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .document-title:after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 3px;
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%); /* Match header gradient */
          border-radius: 3px;
        }
        
        /* Student details styles - enhanced card layout */
        .student-details {
          margin: 0 0 25px;
          padding: 20px 25px;
          background-color: white;
          border-radius: 10px;
          border: 1px solid #E2E8F0;
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .student-details div {
          margin-bottom: 8px;
        }
        
        .detail-label {
          font-weight: 600;
          color: #2D3748;
          margin-left: 8px;
          display: inline-block;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .detail-value {
          font-family: 'Tajawal', sans-serif !important;
          font-size: 15px;
          font-weight: 500;
          color: #1A365D; /* Dark blue for values */
        }
        
        /* Enhanced payment status with better styling */
        .payment-status {
          grid-column: 1 / -1;
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          margin-top: 12px;
          background-color: ${statusColor};
          color: white;
          font-size: 18px;
          font-family: 'Tajawal', sans-serif !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* Fees table with enhanced styling */
        .fees-table-container {
          margin: 20px 0;
          position: relative;
          z-index: 10;
          overflow-x: auto;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #E2E8F0;
        }
        
        .fees-table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .fees-table th {
          background-color: #EBF8FF; /* Light blue header */
          color: #2C5282; /* Darker blue text */
          font-weight: 700;
          text-align: right;
          padding: 14px 16px;
          border-bottom: 2px solid #BEE3F8;
          font-size: 14px;
          white-space: nowrap;
        }
        
        .fees-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #E2E8F0;
          font-size: 14px;
          font-weight: 500;
        }
        
        .fees-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .fees-table tbody tr:nth-child(even) {
          background-color: #F7FAFC;
        }
        
        .fees-table tbody tr:hover {
          background-color: #EDF2F7;
        }
        
        /* Total row with enhanced styling */
        .total-row td {
          font-weight: 700;
          background-color: #EBF8FF !important; /* Light blue for total row */
          border-top: 2px solid #BEE3F8;
          color: #2C5282;
          font-size: 15px;
        }
        
        /* Signature and stamp section with improved layout */
        .signatures-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
        }
        
        .signature-container {
          text-align: center;
          width: 40%;
          display: ${showSignature ? 'block' : 'none'};
        }
        
        .signature-title {
          font-weight: 600;
          margin-bottom: 10px;
          color: #4A5568;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        .signature-line {
          margin: 10px auto;
          width: 80%;
          border-bottom: 1px solid #718096;
        }
        
        /* Stamp functionality removed */
        
        /* Footer with enhanced styling */
        .report-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 15px 0;
          text-align: center;
          font-size: 12px;
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%); /* Match header gradient */
          color: white;
          border-top: 1px solid #E2E8F0;
          font-family: 'Tajawal', sans-serif !important;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .report-metadata {
            grid-template-columns: 1fr;
          }
          
          .student-details {
            grid-template-columns: 1fr;
          }
          
          .signatures-section {
            flex-direction: column;
            align-items: center;
          }
          
          .signature-container, .stamp-container {
            width: 100%;
            margin-bottom: 20px;
          }
        }
        
        /* Print-specific styles */
        @media print {
          .report-container {
            padding-bottom: 0;
          }
          
          .report-header {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .report-footer {
            position: fixed;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .payment-status {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .fees-table th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .total-row td {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .watermark {
            display: ${showWatermark ? 'block' : 'none'} !important;
          }
        }
        
        ${backgroundPattern}
        ${getEnhancedPrintStyles()}
      </style>
    </head>
    <body style="margin: 0; padding: 0; width: 100vw; max-width: 100vw; overflow-x: hidden;">
      <div class="report-container">
        ${showLogoBackground && data.schoolLogo ? `<div class="school-logo-background" style="background-image: url(${data.schoolLogo})"></div>` : ''}
        ${showWatermark ? '<div class="watermark arabic-text">تقرير مالي</div>' : ''}
        
        <div class="report-header">
          <h1 class="arabic-text">التقرير المالي للطالب</h1>
        </div>
        
        <div class="report-metadata">
          <div class="metadata-item">
            <span class="metadata-label arabic-text">رقم التقرير:</span> 
            <span>${reportId}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label arabic-text">العام الدراسي:</span> 
            <span>${academicYear}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label arabic-text">تاريخ الإصدار:</span> 
            <span>${reportDate}</span>
          </div>
        </div>
        
        <div class="content-wrapper">
          <div class="school-info">
            <div class="school-logo-container">
              ${data.schoolLogo 
                ? `<img src="${data.schoolLogo}" alt="شعار المدرسة" class="school-logo">` 
                : `<div style="width: 80px; height: 80px; background-color: #f5f5f5; display: flex; justify-content: center; align-items: center; font-weight: bold; color: #800000; font-size: 30px;">${data.schoolName.substring(0, 2)}</div>`}
            </div>
            <div class="school-details">
              <div class="school-name arabic-text">${data.schoolName}</div>
              <div class="school-contact">
                ${data.schoolPhone ? `<div>هاتف: ${data.schoolPhone}</div>` : ''}
                ${data.schoolEmail ? `<div>البريد الإلكتروني: ${data.schoolEmail}</div>` : ''}
              </div>
            </div>
          </div>
          
          <div class="document-title">
            <h2 class="arabic-text">التقرير المالي للطالب</h2>
          </div>
          
          <div class="student-details">
            <div>
              <span class="detail-label arabic-text">اسم الطالب:</span>
              <span class="detail-value">${data.studentName}</span>
            </div>
            <div>
              <span class="detail-label arabic-text">رقم الطالب:</span>
              <span class="detail-value">${data.studentId}</span>
            </div>
            <div>
              <span class="detail-label arabic-text">الصف:</span>
              <span class="detail-value">${data.grade}</span>
            </div>
            <div>
              <span class="detail-label arabic-text">حالة الدفع:</span>
              <span class="detail-value">${paymentStatus}</span>
            </div>
            
            <div class="payment-status arabic-text">${paymentStatus}</div>
          </div>
          
          <div class="fees-table-container">
            <table class="fees-table">
              <thead>
                <tr>
                  <th class="arabic-text">نوع الرسوم</th>
                  <th class="arabic-text">المبلغ</th>
                  ${showDiscountColumn ? `<th class="arabic-text">الخصم</th>` : ''}
                  <th class="arabic-text">المدفوع</th>
                  <th class="arabic-text">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                ${data.fees.map(fee => `
                  <tr>
                    <td>${fee.type}</td>
                    <td>${fee.amount.toLocaleString('ar-SA')} ${CURRENCY}</td>
                    ${showDiscountColumn ? `<td>${(fee.discount || 0).toLocaleString('ar-SA')} ${CURRENCY}</td>` : ''}
                    <td>${fee.paid.toLocaleString('ar-SA')} ${CURRENCY}</td>
                    <td>${fee.balance.toLocaleString('ar-SA')} ${CURRENCY}</td>
                  </tr>
                `).join('')}
                
                <tr class="total-row">
                  <td class="arabic-text">الإجمالي</td>
                  <td>${totalAmount.toLocaleString('ar-SA')} ${CURRENCY}</td>
                  ${showDiscountColumn ? `<td>${totalDiscount.toLocaleString('ar-SA')} ${CURRENCY}</td>` : ''}
                  <td>${totalPaid.toLocaleString('ar-SA')} ${CURRENCY}</td>
                  <td>${totalBalance.toLocaleString('ar-SA')} ${CURRENCY}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="signatures-section">
            <div class="signature-container">
              <div class="signature-title arabic-text">توقيع المدير</div>
              <div class="signature-line"></div>
            </div>
            
            <!-- Stamp functionality removed -->
          </div>
        </div>
        
        <div class="report-footer">
          <div>تم إصدار هذا التقرير بواسطة نظام المحاسبة المدرسي</div>
          <div>© ${new Date().getFullYear()} جميع الحقوق محفوظة</div>
        </div>
      </div>
    </body>
    </html>
  `;
};