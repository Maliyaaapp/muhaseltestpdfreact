/**
 * Electron Student Reporter - Replaces jsPDF implementation with Electron's printToPDF
 * 
 * This utility provides HTML-based student report generators using Electron's printToPDF.
 */

import { CURRENCY } from '../utils/constants';
import { exportToPdf } from './electronPdfExport';

// Interface for student report data
export interface StudentReportData {
  studentName: string;
  studentId: string;
  grade: string;
  fees: Array<{
    type: string;
    amount: number;
    paid: number;
    balance: number;
    discount?: number;
  }>;
  schoolName: string;
  schoolLogo?: string;
  schoolStamp?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  showWatermark?: boolean;
  showLogoBackground?: boolean;
  showStamp?: boolean;
  date?: string;
  amount?: number;
  status?: string;
}

/**
 * Generate HTML for a student report
 */
export const generateStudentReportHTML = (data: StudentReportData): string => {
  // Calculate total amounts
  const totalAmount = data.fees.reduce((sum, fee) => sum + fee.amount, 0);
  const totalPaid = data.fees.reduce((sum, fee) => sum + fee.paid, 0);
  const totalBalance = data.fees.reduce((sum, fee) => sum + fee.balance, 0);
  const totalDiscount = data.fees.reduce((sum, fee) => sum + (fee.discount || 0), 0);
  
  const formattedDate = data.date ? data.date : new Date().toLocaleDateString('ar-OM');
  const watermarkDisplay = data.showWatermark ? 'block' : 'none';
  const logoBackgroundDisplay = data.showLogoBackground && data.schoolLogo ? 'block' : 'none';
  
  // Generate HTML content
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تقرير مالي للطالب - ${data.studentName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Tajawal', sans-serif;
        }
        
        @page {
          size: A4;
          margin: 0;
        }
        
        body {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          color: #333;
          position: relative;
          direction: rtl;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          opacity: 0.1;
          color: #800000;
          z-index: 1;
          display: ${watermarkDisplay};
          pointer-events: none;
        }
        
        .logo-background {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70%;
          height: 70%;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.06;
          background-image: url(${data.schoolLogo || ''});
          z-index: 0;
          display: ${logoBackgroundDisplay};
          pointer-events: none;
        }
        
        /* .stamp-image { // Stamp functionality removed
          position: fixed;
          bottom: 100px;
          right: 50px;
          width: 120px;
          height: 120px;
          object-fit: contain;
          opacity: 0.8;
          display: ${data.showStamp && data.schoolStamp ? 'block' : 'none'};
        } */
        
        .header {
          background-color: #800000;
          color: white;
          padding: 15px;
          text-align: center;
        }
        
        .header h1 {
          margin: 0;
          font-size: 18px;
        }
        
        .report-meta {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          background-color: #f8f8f8;
          border-bottom: 1px solid #ddd;
        }
        
        .school-info {
          text-align: center;
          padding: 20px 15px;
          position: relative;
          z-index: 5;
        }
        
        .school-logo {
          max-width: 100px;
          max-height: 100px;
          margin: 0 auto 10px;
          display: block;
        }
        
        .school-name {
          color: #800000;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .report-subtitle {
          color: #555;
          font-size: 14px;
        }
        
        .content {
          padding: 20px 15px;
          position: relative;
          z-index: 5;
        }
        
        .section {
          margin-bottom: 25px;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          background: rgba(249, 249, 249, 0.9);
        }
        
        .section-title {
          color: #800000;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .label {
          font-weight: bold;
          width: 120px;
        }
        
        .value {
          flex-grow: 1;
          text-align: right;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .table th, .table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        
        .table th {
          background-color: #800000;
          color: white;
        }
        
        .table tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        
        .balance-due {
          color: #d32f2f;
          font-weight: bold;
        }
        
        .paid-amount {
          color: #388e3c;
          font-weight: bold;
        }
        
        .total-row {
          font-weight: bold;
          background-color: #f0f0f0;
        }
        
        .footer {
          background-color: #800000;
          color: white;
          text-align: center;
          padding: 10px;
          position: fixed;
          bottom: 0;
          width: 100%;
          font-size: 12px;
        }
        
        .summary-box {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          padding: 15px;
          margin-top: 20px;
          border-radius: 5px;
          text-align: center;
        }
        
        .summary-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #800000;
        }
        
        .summary-amount {
          font-size: 18px;
          font-weight: bold;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .contact-info {
          margin-top: 10px;
          font-size: 10px;
          color: #eee;
        }
        
        .contact-item {
          margin: 0 5px;
        }
      </style>
    </head>
    <body>
      <div class="watermark">${data.schoolName}</div>
      <div class="logo-background"></div>
      
      ${data.showStamp && data.schoolStamp ? 
        '' // Stamp functionality removed
      
      <div class="header">
        <h1>تقرير مالي للطالب</h1>
      </div>
      
      <div class="report-meta">
        <div>تاريخ التقرير: ${formattedDate}</div>
        <div>رقم الطالب: ${data.studentId}</div>
      </div>
      
      <div class="school-info">
        ${data.schoolLogo ? `<img src="${data.schoolLogo}" alt="${data.schoolName}" class="school-logo" onerror="this.style.display='none'"/>` : ''}
        <div class="school-name">${data.schoolName}</div>
        <div class="report-subtitle">تقرير الرسوم المالية</div>
      </div>
      
      <div class="content">
        <div class="section">
          <div class="section-title">معلومات الطالب</div>
          <div class="row">
            <div class="label">الاسم:</div>
            <div class="value">${data.studentName}</div>
          </div>
          <div class="row">
            <div class="label">رقم الطالب:</div>
            <div class="value">${data.studentId}</div>
          </div>
          <div class="row">
            <div class="label">الصف:</div>
            <div class="value">${data.grade}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">تفاصيل الرسوم</div>
          
          <table class="table">
            <thead>
              <tr>
                <th>نوع الرسوم</th>
                <th>المبلغ</th>
                <th>الخصم</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${data.fees.map(fee => `
                <tr>
                  <td>${fee.type}</td>
                  <td>${fee.amount.toLocaleString()} ${CURRENCY}</td>
                  <td>${fee.discount ? fee.discount.toLocaleString() + ' ' + CURRENCY : '-'}</td>
                  <td class="paid-amount">${fee.paid.toLocaleString()} ${CURRENCY}</td>
                  <td class="balance-due">${fee.balance.toLocaleString()} ${CURRENCY}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>المجموع</td>
                <td>${totalAmount.toLocaleString()} ${CURRENCY}</td>
                <td>${totalDiscount > 0 ? totalDiscount.toLocaleString() + ' ' + CURRENCY : '-'}</td>
                <td class="paid-amount">${totalPaid.toLocaleString()} ${CURRENCY}</td>
                <td class="balance-due">${totalBalance.toLocaleString()} ${CURRENCY}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="summary-grid">
          <div class="summary-box">
            <div class="summary-title">إجمالي المدفوع</div>
            <div class="summary-amount paid-amount">${totalPaid.toLocaleString()} ${CURRENCY}</div>
          </div>
          
          <div class="summary-box">
            <div class="summary-title">إجمالي المتبقي</div>
            <div class="summary-amount balance-due">${totalBalance.toLocaleString()} ${CURRENCY}</div>
          </div>
        </div>
        
        <div class="signature-section" style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="width: 150px; text-align: center;">
            <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
            <div>توقيع المحاسب</div>
          </div>
          
          <div style="width: 150px; text-align: center;">
            <div style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
            <div>الختم</div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <div>${data.schoolName} © ${new Date().getFullYear()}</div>
        <div class="contact-info">
          ${data.schoolPhone ? `<span class="contact-item">هاتف: ${data.schoolPhone}</span>` : ''}
          ${data.schoolEmail ? `<span class="contact-item">البريد الإلكتروني: ${data.schoolEmail}</span>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a student report PDF using Electron's printToPDF
 */
export const generateStudentReportPDF = async (data: StudentReportData): Promise<string> => {
  try {
    // Generate HTML content
    const htmlContent = generateStudentReportHTML(data);
    
    // Create filename
    const fileName = `student_report_${data.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    // Generate PDF using Electron's printToPDF
    const result = await exportToPdf(htmlContent, fileName);
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error) {
    console.error('Error generating student report PDF:', error);
    throw error;
  }
};