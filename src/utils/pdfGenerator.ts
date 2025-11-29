import { exportToPdf } from './electronPdfExport';

// Interface for student installment data
export interface StudentInstallmentData {
  id: number;
  name: string;
  grade: string;
  total: number;
  paid: number;
  remaining: number;
  nextDate: string;
  status: string;
}

// Interface for summary data
export interface SummaryData {
  totalDue: number;
  totalCollected: number;
  totalRemaining: number;
  collectionRate: number;
}

/**
 * Generate a professional PDF report for student installments using Electron's printToPDF
 * This function generates HTML content and then uses Electron to create a PDF file
 */
export const generateStudentInstallmentPDF = async (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  showStatus: boolean = true
): Promise<string> => {
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
  const htmlContent = `<!DOCTYPE html>
  <html dir="rtl">
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
      
      .header {
        background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
        color: white;
        padding: 20px;
        text-align: center;
        position: relative;
      }
      
      .title {
        font-size: 24px;
        font-weight: bold;
        margin: 0;
      }
      
      .subtitle {
        font-size: 16px;
        margin-top: 5px;
      }
      
      .summary {
        display: flex;
        justify-content: space-between;
        padding: 15px;
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
      
      .status-partial {
        background-color: #FEEBC8;
        color: #975A16;
      }
      
      .status-unpaid {
        background-color: #FED7D7;
        color: #9B2C2C;
      }
      
      .footer {
        background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
        color: white;
        text-align: center;
        padding: 15px;
        font-size: 14px;
      }
      
      .school-contact {
        margin-top: 5px;
        font-size: 14px;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      @media print {
        body {
          padding: 0;
          background-color: white;
        }
        
        .container {
          box-shadow: none;
          max-width: none;
        }
        
        .header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        th {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .footer {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
          color: white !important;
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
        
        .status-partial {
          background-color: #FEEBC8 !important;
          color: #975A16 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .status-unpaid {
          background-color: #FED7D7 !important;
          color: #9B2C2C !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="title">${title}</h1>
        <div class="subtitle">تاريخ إنشاء التقرير: ${new Date().toLocaleDateString('ar-OM')}</div>
      </div>
      
      <div class="summary">
        ${summary ? `
        <div class="summary-item">
          <div class="summary-value">${formatCurrency(summary.totalDue)}</div>
          <div class="summary-label">إجمالي المستحق</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${formatCurrency(summary.totalCollected)}</div>
          <div class="summary-label">إجمالي المحصل</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${formatCurrency(summary.totalRemaining)}</div>
          <div class="summary-label">إجمالي المتبقي</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${summary.collectionRate}%</div>
          <div class="summary-label">نسبة التحصيل</div>
        </div>
        ` : ''}
      </div>
      
      <table>
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
      
      <div class="footer">جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
    </div>
  </body>
  </html>`;

  // Use Electron's printToPDF to generate PDF
  const fileName = "student-installments-report.pdf";
  const result = await exportToPdf(htmlContent, fileName);
  
  if (!result.success || !result.filePath) {
    throw new Error(result.error || 'Failed to generate PDF');
  }
  
  return result.filePath;
};

/**
 * Print PDF to default printer
 */
export const printPDF = async (
  students: StudentInstallmentData[],
  summary?: SummaryData,
  title: string = "تقرير أقساط الطلاب",
  showStatus: boolean = true
): Promise<void> => {
  try {
    // Format currency for display
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
    
    // Generate HTML content - same as PDF but with print-specific styles
    const htmlContent = `<!DOCTYPE html>
    <html dir="rtl">
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
        
        .header {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          color: white;
          padding: 20px;
          text-align: center;
          position: relative;
        }
        
        .title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        
        .subtitle {
          font-size: 16px;
          margin-top: 5px;
        }
        
        .summary {
          display: flex;
          justify-content: space-between;
          padding: 15px;
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
        
        .status-partial {
          background-color: #FEEBC8;
          color: #975A16;
        }
        
        .status-unpaid {
          background-color: #FED7D7;
          color: #9B2C2C;
        }
        
        .footer {
          background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%);
          color: white;
          text-align: center;
          padding: 15px;
          font-size: 14px;
        }
        
        .school-contact {
          margin-top: 5px;
          font-size: 14px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        @media print {
          body {
            padding: 0;
            background-color: white;
          }
          
          .container {
            box-shadow: none;
            max-width: none;
          }
          
          .header {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          th {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .footer {
            background: linear-gradient(135deg, #1A365D 0%, #2C5282 100%) !important;
            color: white !important;
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
          
          .status-partial {
            background-color: #FEEBC8 !important;
            color: #975A16 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .status-unpaid {
            background-color: #FED7D7 !important;
            color: #9B2C2C !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">${title}</h1>
          <div class="subtitle">تاريخ إنشاء التقرير: ${new Date().toLocaleDateString('ar-OM')}</div>
        </div>
        
        <div class="summary">
          ${summary ? `
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(summary.totalDue)}</div>
            <div class="summary-label">إجمالي المستحق</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(summary.totalCollected)}</div>
            <div class="summary-label">إجمالي المحصل</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(summary.totalRemaining)}</div>
            <div class="summary-label">إجمالي المتبقي</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.collectionRate}%</div>
            <div class="summary-label">نسبة التحصيل</div>
          </div>
          ` : ''}
        </div>
        
        <table>
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
        
        <div class="footer">جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
      </div>
    </body>
    </html>`;
    
    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window. Please check if pop-ups are blocked.');
    }
    
    // Write HTML content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for resources to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } catch (error) {
    console.error('Error printing PDF:', error);
    throw error;
  }
}; 