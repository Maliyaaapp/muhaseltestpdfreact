import { SubscriptionInvoiceData } from '../types';
import { formatDate, getCurrencySymbol } from '../utils/formatting';
import { getSubscriptionStatusText } from '../utils/status-helpers';
import { getRandomBackground } from '../utils/print-styles';

/**
 * Generate HTML for subscription invoice
 * @param data - The subscription invoice data
 * @returns HTML string for the invoice
 */
export const generateSubscriptionInvoiceHTML = (data: SubscriptionInvoiceData): string => {
  // Use document-specific setting or fall back to general setting
  const showLogoBackground = data.showLogoBackgroundOnInvoice !== undefined ? 
    data.showLogoBackgroundOnInvoice : 
    (data.showLogoBackground !== undefined ? data.showLogoBackground : false);

  // Get random background pattern if needed
  const backgroundPattern = getRandomBackground();

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>فاتورة اشتراك - ${data.schoolName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
        
        /* Reset and Base Styles */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Tajawal', sans-serif;
        }
        
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        html {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #2D3748;
          direction: rtl;
          background: #fff;
          min-height: 100vh;
        }
        
        /* Invoice Container */
        .invoice-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        /* Background Pattern */
        .background-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.03;
          z-index: 0;
        }
        
        /* Logo Background */
        .logo-background {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: auto;
          opacity: 0.05;
          z-index: 0;
        }
        
        /* Invoice */
        .invoice {
          position: relative;
          z-index: 1;
          padding: 40px;
          min-height: 297mm;
          display: flex;
          flex-direction: column;
        }
        
        /* Invoice Header */
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #800000;
        }
        
        .invoice-logo {
          width: 120px;
          height: auto;
          object-fit: contain;
        }
        
        .invoice-title {
          text-align: center;
          flex-grow: 1;
          padding: 0 20px;
        }
        
        .invoice-title h1 {
          font-size: 24px;
          font-weight: bold;
          color: #800000;
          margin-bottom: 5px;
        }
        
        .invoice-title p {
          font-size: 16px;
          color: #4A5568;
        }
        
        .invoice-info {
          text-align: left;
        }
        
        .invoice-info p {
          margin-bottom: 5px;
        }
        
        .invoice-info strong {
          color: #2D3748;
        }
        
        /* Invoice Body */
        .invoice-body {
          flex-grow: 1;
          margin-bottom: 40px;
        }
        
        .school-info {
          margin-bottom: 30px;
          padding: 15px;
          background-color: #F7FAFC;
          border-radius: 8px;
        }
        
        .school-info h2 {
          font-size: 18px;
          color: #2D3748;
          margin-bottom: 10px;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 8px;
        }
        
        .school-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-size: 12px;
          color: #718096;
          margin-bottom: 3px;
        }
        
        .info-value {
          font-size: 14px;
          color: #2D3748;
          font-weight: 500;
        }
        
        /* Subscription Details */
        .subscription-details {
          margin-bottom: 30px;
        }
        
        .subscription-details h2 {
          font-size: 18px;
          color: #2D3748;
          margin-bottom: 15px;
          border-bottom: 1px solid #E2E8F0;
          padding-bottom: 8px;
        }
        
        .subscription-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .subscription-table th {
          background-color: #F7FAFC;
          padding: 12px;
          text-align: right;
          font-weight: 600;
          border-bottom: 2px solid #E2E8F0;
        }
        
        .subscription-table td {
          padding: 12px;
          border-bottom: 1px solid #E2E8F0;
        }
        
        .subscription-table tr:last-child td {
          border-bottom: none;
        }
        
        /* Payment Status */
        .payment-status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
        }
        
        .status-paid {
          background-color: #C6F6D5;
          color: #22543D;
        }
        
        .status-unpaid {
          background-color: #FED7D7;
          color: #822727;
        }
        
        .status-active {
          background-color: #C6F6D5;
          color: #22543D;
        }
        
        .status-expired {
          background-color: #FED7D7;
          color: #822727;
        }
        
        .status-pending {
          background-color: #FEEBC8;
          color: #744210;
        }
        
        .status-paused {
          background-color: #BEE3F8;
          color: #2A4365;
        }
        
        /* Total Amount */
        .total-amount {
          margin-top: 20px;
          text-align: left;
          padding: 15px;
          background-color: #F7FAFC;
          border-radius: 8px;
        }
        
        .total-amount p {
          font-size: 16px;
          font-weight: 600;
          color: #2D3748;
        }
        
        .total-amount .amount {
          font-size: 20px;
          font-weight: 700;
          color: #800000;
        }
        
        /* Invoice Footer */
        .invoice-footer {
          margin-top: auto;
          padding-top: 20px;
          border-top: 2px solid #800000;
          text-align: center;
          font-size: 12px;
          color: #718096;
        }
        
        .footer-contact {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 10px;
        }
        
        /* Watermark */
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          z-index: 0;
          opacity: 0.03;
          font-size: 100px;
          font-weight: bold;
          color: #000;
          transform: rotate(-45deg);
        }
        
        /* Stamp functionality removed */
        
        .signature-container {
          position: absolute;
          bottom: 120px;
          left: 50px;
          width: 150px;
          text-align: center;
        }
        
        .signature-line {
          width: 100%;
          border-bottom: 1px solid #000;
          margin-bottom: 5px;
        }
        
        .signature-title {
          font-size: 12px;
          font-weight: 600;
        }
        
        /* Print Styles */
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          
          .invoice-container {
            width: 100%;
            box-shadow: none;
          }
          
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        ${showLogoBackground && data.schoolLogo ? `<img src="${data.schoolLogo}" alt="Logo Background" class="logo-background" onerror="this.style.display='none'">` : ''}
        ${backgroundPattern ? `<div class="background-pattern" style="background-image: url('${backgroundPattern}');"></div>` : ''}
        ${data.showWatermark ? `<div class="watermark">${data.schoolName}</div>` : ''}
        
        <div class="invoice">
          <div class="invoice-header">
            ${data.schoolLogo ? `<img src="${data.schoolLogo}" alt="${data.schoolName}" class="invoice-logo" onerror="this.style.display='none'">` : ''}
            
            <div class="invoice-title">
              <h1>فاتورة اشتراك</h1>
              <p>نظام إدارة المالية المدرسية</p>
            </div>
            
            <div class="invoice-info">
              <p><strong>رقم الفاتورة:</strong> ${data.invoiceNumber}</p>
              <p><strong>التاريخ:</strong> ${formatDate(data.date)}</p>
            </div>
          </div>
          
          <div class="invoice-body">
            <div class="school-info">
              <h2>معلومات المدرسة</h2>
              <div class="school-info-grid">
                <div class="info-item">
                  <span class="info-label">اسم المدرسة</span>
                  <span class="info-value">${data.schoolName}</span>
                </div>
                
                ${data.schoolPhone ? `
                  <div class="info-item">
                    <span class="info-label">رقم الهاتف</span>
                    <span class="info-value">${data.schoolPhone}</span>
                  </div>
                ` : ''}
                
                ${data.schoolEmail ? `
                  <div class="info-item">
                    <span class="info-label">البريد الإلكتروني</span>
                    <span class="info-value">${data.schoolEmail}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div class="subscription-details">
              <h2>تفاصيل الاشتراك</h2>
              <table class="subscription-table">
                <thead>
                  <tr>
                    <th>الوصف</th>
                    <th>تاريخ البداية</th>
                    <th>تاريخ الانتهاء</th>
                    <th>المبلغ</th>
                    <th>حالة الدفع</th>
                    <th>حالة الاشتراك</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>اشتراك سنوي في نظام إدارة المالية المدرسية</td>
                    <td>${formatDate(data.subscriptionStart)}</td>
                    <td>${formatDate(data.subscriptionEnd)}</td>
                    <td>${data.amount.toLocaleString()} ${getCurrencySymbol()}</td>
                    <td>
                      <span class="payment-status ${data.paid ? 'status-paid' : 'status-unpaid'}">
                        ${data.paid ? 'مدفوع' : 'غير مدفوع'}
                      </span>
                    </td>
                    <td>
                      <span class="payment-status status-${data.status || 'active'}">
                        ${getSubscriptionStatusText(data.status || 'active')}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div class="total-amount">
                <p>إجمالي المبلغ: <span class="amount">${data.amount.toLocaleString()} ${getCurrencySymbol()}</span></p>
              </div>
            </div>
          </div>
          
          <!-- Stamp functionality removed -->
          
          ${data.showSignatureOnInvoice ? `
            <div class="signature-container">
              <div class="signature-line"></div>
              <div class="signature-title">توقيع المسؤول</div>
            </div>
          ` : ''}
          
          <div class="invoice-footer">
            <div>© ${new Date().getFullYear()} نظام إدارة المالية المدرسية - جميع الحقوق محفوظة</div>
            <div class="footer-contact">
              ${data.schoolPhone ? `<div>هاتف: ${data.schoolPhone}</div>` : ''}
              ${data.schoolEmail ? `<div>البريد: ${data.schoolEmail}</div>` : ''}
            </div>
          </div>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #800000; color: white; border: none; border-radius: 5px; cursor: pointer; font-family: 'Tajawal', sans-serif;">
            طباعة الفاتورة
          </button>
        </div>
      </div>
    </body>
    </html>
  `;
};