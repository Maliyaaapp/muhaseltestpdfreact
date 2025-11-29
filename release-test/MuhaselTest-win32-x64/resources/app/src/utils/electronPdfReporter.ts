/**
 * Electron PDF Reporter - Replaces jsPDF implementation with Electron's printToPDF
 * 
 * This utility provides HTML-based report generators for student installments, receipts,
 * and other reports using Electron's printToPDF instead of jsPDF.
 */

import { CURRENCY } from '../utils/constants';
import { exportToPdf } from './electronPdfExport';
import { StudentInstallmentData, SummaryData } from './pdfGenerator';

/**
 * Generate HTML content for student installment report
 * This function is used by both PDF generation and direct printing
 */
export const generateStudentInstallmentHTML = (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  showStatus: boolean = true,
  showFooter: boolean = false, // Default to not show footer
  showSchoolLogo: boolean = true,
  schoolLogo: string | null = null
): string => {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-OM', { 
      style: 'currency', 
      currency: 'OMR',
      maximumFractionDigits: 3 
    }).format(amount);
  };
  
  // Calculate totals
  const totalDue = students.reduce((sum, student) => sum + student.total, 0);
  const totalPaid = students.reduce((sum, student) => sum + student.paid, 0);
  const totalRemaining = students.reduce((sum, student) => sum + student.remaining, 0);
  
  // Generate HTML content
  return `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
      
      body {
        font-family: 'Tajawal', sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f5f5f5;
        direction: rtl;
      }
      
      .container {
        max-width: 1000px;
        margin: 0 auto;
        background-color: white;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        border-radius: 5px;
        overflow: hidden;
      }
      
      .report-header {
        background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
        color: white;
        padding: 20px;
        text-align: center;
        position: relative;
      }
      
      .report-title {
        font-size: 24px;
        font-weight: bold;
        margin: 0;
        color: white;
      }
      
      .school-contact {
        margin-top: 10px;
        font-size: 14px;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
        color: white;
      }
      
      .report-info {
        display: flex;
        justify-content: space-between;
        padding: 15px 20px;
        background-color: #EBF8FF;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .summary {
        display: flex;
        justify-content: space-between;
        padding: 15px 20px;
        background-color: #EBF8FF;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .summary-item {
        text-align: center;
      }
      
      .summary-value {
        font-size: 18px;
        font-weight: bold;
        color: #1A365D;
      }
      
      .summary-label {
        font-size: 14px;
        color: #666;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
      }
      
      th {
        background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
        color: white;
        padding: 12px 15px;
        text-align: right;
        font-weight: bold;
      }
      
      td {
        padding: 10px 15px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .status {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
      }
      
      .status-paid {
        background-color: #C6F6D5;
        color: #276749;
      }
      
      .status-upcoming {
        background-color: #BEE3F8;
        color: #2A4365;
      }
      
      .status-overdue {
        background-color: #FED7D7;
        color: #9B2C2C;
      }
      
      .status-partial {
        background-color: #FEEBC8;
        color: #975A16;
      }
      
      /* Logo watermark only */
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
        opacity: 0.15;
        z-index: 999;
        pointer-events: none;
        background-image: ${schoolLogo ? `url('${schoolLogo}')` : 'none'};
      }
      
      @media print {
        @page {
          size: A4;
          margin: 0;
        }
        
        body {
          padding: 0;
          background-color: white;
        }
        
        .container {
          box-shadow: none;
          max-width: none;
        }
        
        .report-header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .report-info {
          background-color: #EBF8FF !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .summary {
          background-color: #EBF8FF !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .summary-value {
          color: #1A365D !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        th {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
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
        
        .status-overdue {
          background-color: #FED7D7 !important;
          color: #9B2C2C !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .status-partial {
          background-color: #FEEBC8 !important;
          color: #975A16 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .logo-background {
          display: block !important;
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 80% !important;
          height: 80% !important;
          opacity: 0.15 !important;
          z-index: 9999 !important;
          background-size: contain !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Only logo watermark, no text watermark -->
      ${schoolLogo ? `<div class="logo-background"></div>` : ''}
      
      <div class="report-container">
        <div class="report-header">
          <div class="report-title">${title}</div>
          <div class="report-date">تاريخ إنشاء التقرير: ${new Date().toLocaleDateString('ar-OM')}</div>
          <div class="school-contact">
            <div class="contact-card">
              <span>هاتف: +968 1234 5678</span>
            </div>
            <div class="contact-card">
              <span>البريد الإلكتروني: info@school.edu.om</span>
            </div>
          </div>
        </div>
        
        ${summary ? `
        <table class="summary-table">
          <thead>
            <tr>
              <th>إجمالي المستحق</th>
              <th>إجمالي المحصل</th>
              <th>إجمالي المتبقي</th>
              <th>نسبة التحصيل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${formatCurrency(summary.totalDue)}</td>
              <td>${formatCurrency(summary.totalCollected)}</td>
              <td>${formatCurrency(summary.totalRemaining)}</td>
              <td>${summary.collectionRate}%</td>
            </tr>
          </tbody>
        </table>
        ` : ''}
        
        <table class="main-table">
          <thead>
            <tr>
              <th>#</th>
              <th>اسم الطالب</th>
              <th>الصف</th>
              <th>إجمالي الرسوم</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>تاريخ القسط القادم</th>
              ${showStatus ? '<th>الحالة</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${students.map(student => `
            <tr>
              <td>${student.id}</td>
              <td>${student.name}</td>
              <td>${student.grade}</td>
              <td>${formatCurrency(student.total)}</td>
              <td>${formatCurrency(student.paid)}</td>
              <td style="${student.remaining > 0 ? 'color: #9B2C2C;' : ''}">${formatCurrency(student.remaining)}</td>
              <td>${student.nextDate}</td>
              ${showStatus ? `<td class="status-${student.status.toLowerCase()}">${student.status}</td>` : ''}
            </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">الإجمالي</td>
              <td></td>
              <td>${formatCurrency(totalDue)}</td>
              <td>${formatCurrency(totalPaid)}</td>
              <td>${formatCurrency(totalRemaining)}</td>
              <td></td>
              ${showStatus ? '<td></td>' : ''}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </body>
  </html>`;
};

/**
 * Generate and export a PDF for student installments using Electron's printToPDF
 */
export const generateStudentInstallmentPDF = async (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  showStatus: boolean = true,
  showSchoolLogo: boolean = true,
  schoolLogo: string | null = null
): Promise<void> => {
  try {
    // Generate HTML content
    const html = generateStudentInstallmentHTML(students, summary, title, showStatus, false, showSchoolLogo, schoolLogo);
    
    // Create filename
    const fileName = `student-installments-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    
    // Generate PDF using Electron's printToPDF
    const result = await exportToPdf(html, fileName, false);
    
    if (result.success) {
      console.log('Student installment report generated successfully:', result.filePath);
    } else {
      console.error('Error generating student installment report:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error in generateStudentInstallmentPDF:', error);
    throw error;
  }
};

/**
 * Generate and save a PDF for student installments
 */
export const savePDF = async (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  fileName: string = "student-installments-report.pdf",
  showSchoolLogo: boolean = true,
  schoolLogo: string | null = null
): Promise<void> => {
  try {
    // Generate HTML content
    const html = generateStudentInstallmentHTML(students, summary, title, true, false, showSchoolLogo, schoolLogo);
    
    // Generate PDF using Electron's printToPDF
    const result = await exportToPdf(html, fileName, false);
    
    if (result.success) {
      console.log('Student installment report saved successfully:', result.filePath);
    } else {
      console.error('Error saving student installment report:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error in savePDF:', error);
    throw error;
  }
};

/**
 * Print a PDF for student installments
 */
export const printPDF = async (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  showSchoolLogo: boolean = true,
  schoolLogo: string | null = null
): Promise<void> => {
  try {
    // Generate HTML content
    const html = generateStudentInstallmentHTML(students, summary, title, true, false, showSchoolLogo, schoolLogo);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window. Please check if pop-ups are blocked.');
      alert('فشل في فتح نافذة الطباعة. يرجى التحقق من عدم حظر النوافذ المنبثقة.');
      return;
    }
    
    // Use any type to bypass TypeScript error with document property
    const windowAny = printWindow as any;
    
    // Write HTML content to the new window
    windowAny.document.open();
    windowAny.document.write(html);
    windowAny.document.close();
    
    // Add view button to trigger print when needed
    const viewButton = windowAny.document.createElement('button');
    viewButton.textContent = 'طباعة';
    viewButton.style.position = 'fixed';
    viewButton.style.top = '10px';
    viewButton.style.right = '10px';
    viewButton.style.zIndex = '9999';
    viewButton.style.padding = '10px 15px';
    viewButton.style.backgroundColor = '#1A365D';
    viewButton.style.color = 'white';
    viewButton.style.border = 'none';
    viewButton.style.borderRadius = '5px';
    viewButton.style.cursor = 'pointer';
    viewButton.style.fontFamily = 'Tajawal, sans-serif';
    viewButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    viewButton.className = 'no-print';
    viewButton.onclick = () => {
      printWindow.print();
    };
    
    // Add print-specific styles
    const style = windowAny.document.createElement('style');
    style.textContent = `
      @media print {
        .no-print {
          display: none !important;
        }
      }
    `;
    windowAny.document.head.appendChild(style);
    windowAny.document.body.appendChild(viewButton);
    
  } catch (error) {
    console.error('Error in printPDF:', error);
    throw error;
  }
}; 