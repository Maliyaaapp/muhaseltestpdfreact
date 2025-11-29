/**
 * PDFKit Generator for Electron Main Process
 * 
 * This module generates PDFs using PDFKit in Electron's main process.
 * It's called via IPC from the renderer process.
 */

const PDFDocument = require('pdfkit');

// A4 dimensions in points (72 points per inch)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

// Colors matching the HTML design
const COLORS = {
  primaryBlue: '#1A365D',
  secondaryBlue: '#2C5282',
  lightBlue: '#EBF8FF',
  borderBlue: '#BEE3F8',
  textDark: '#2D3748',
  textMedium: '#4A5568',
  textLight: '#718096',
  background: '#F7FAFC',
  cardBackground: '#F8FAFC',
  border: '#E2E8F0',
  success: '#28a745',
  warning: '#fd7e14',
  danger: '#dc3545',
  white: '#FFFFFF'
};

// Currency symbol
const CURRENCY = 'د.أ';

/**
 * Format date in Arabic format
 */
const formatDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format number with Arabic locale
 */
const formatNumber = (num) => {
  return num.toLocaleString('ar-SA');
};

/**
 * Draw a rounded rectangle
 */
const drawRoundedRect = (doc, x, y, width, height, radius, fillColor, strokeColor) => {
  doc.roundedRect(x, y, width, height, radius);
  if (fillColor) {
    doc.fillColor(fillColor).fill();
  }
  if (strokeColor) {
    doc.roundedRect(x, y, width, height, radius).strokeColor(strokeColor).stroke();
  }
};

/**
 * Draw header
 */
const drawHeader = (doc, title) => {
  const headerHeight = 60;
  
  doc.rect(0, 0, A4_WIDTH, headerHeight).fill(COLORS.primaryBlue);
  doc.rect(0, headerHeight - 3, A4_WIDTH, 3).fill(COLORS.border);
  
  doc.fillColor(COLORS.white)
     .fontSize(24)
     .font('Helvetica-Bold')
     .text(title, 0, 18, { width: A4_WIDTH, align: 'center' });
  
  return headerHeight;
};

/**
 * Draw report metadata
 */
const drawReportMetadata = (doc, reportId, academicYear, reportDate, startY) => {
  const margin = 30;
  const sectionWidth = A4_WIDTH - (margin * 2);
  const sectionHeight = 50;
  
  drawRoundedRect(doc, margin, startY, sectionWidth, sectionHeight, 8, COLORS.background);
  doc.roundedRect(margin, startY, sectionWidth, sectionHeight, 8).strokeColor(COLORS.border).stroke();
  
  const colWidth = sectionWidth / 3;
  const textY = startY + 15;
  
  // Report ID
  doc.fillColor(COLORS.textMedium).fontSize(10).font('Helvetica-Bold')
     .text('رقم التقرير:', margin + colWidth * 2, textY, { width: colWidth, align: 'center' });
  doc.fillColor(COLORS.textDark).font('Helvetica')
     .text(reportId, margin + colWidth * 2, textY + 15, { width: colWidth, align: 'center' });
  
  // Academic Year
  doc.fillColor(COLORS.textMedium).font('Helvetica-Bold')
     .text('العام الدراسي:', margin + colWidth, textY, { width: colWidth, align: 'center' });
  doc.fillColor(COLORS.textDark).font('Helvetica')
     .text(academicYear, margin + colWidth, textY + 15, { width: colWidth, align: 'center' });
  
  // Report Date
  doc.fillColor(COLORS.textMedium).font('Helvetica-Bold')
     .text('تاريخ الإصدار:', margin, textY, { width: colWidth, align: 'center' });
  doc.fillColor(COLORS.textDark).font('Helvetica')
     .text(reportDate, margin, textY + 15, { width: colWidth, align: 'center' });
  
  return startY + sectionHeight + 15;
};

/**
 * Draw school info
 */
const drawSchoolInfo = (doc, data, startY) => {
  const margin = 30;
  const sectionWidth = A4_WIDTH - (margin * 2);
  const sectionHeight = 100;
  
  drawRoundedRect(doc, margin, startY, sectionWidth, sectionHeight, 8, COLORS.cardBackground);
  doc.roundedRect(margin, startY, sectionWidth, sectionHeight, 8).strokeColor(COLORS.border).stroke();
  
  // School name
  doc.fillColor(COLORS.primaryBlue).fontSize(20).font('Helvetica-Bold')
     .text(data.schoolName, margin + 15, startY + 20, { width: sectionWidth - 100, align: 'right' });
  
  // Contact info
  let contactY = startY + 50;
  doc.fillColor(COLORS.textMedium).fontSize(11).font('Helvetica');
  
  if (data.schoolPhone) {
    doc.text(`هاتف: ${data.schoolPhone}`, margin + 15, contactY, { width: sectionWidth - 100, align: 'right' });
    contactY += 18;
  }
  
  if (data.schoolEmail) {
    doc.text(`البريد الإلكتروني: ${data.schoolEmail}`, margin + 15, contactY, { width: sectionWidth - 100, align: 'right' });
  }
  
  return startY + sectionHeight + 20;
};

/**
 * Draw document title
 */
const drawDocumentTitle = (doc, title, startY) => {
  const margin = 30;
  
  doc.fillColor(COLORS.primaryBlue).fontSize(18).font('Helvetica-Bold')
     .text(title, margin, startY, { width: A4_WIDTH - (margin * 2), align: 'center' });
  
  const underlineY = startY + 25;
  const underlineWidth = 100;
  const underlineX = (A4_WIDTH - underlineWidth) / 2;
  
  doc.rect(underlineX, underlineY, underlineWidth, 3).fill(COLORS.primaryBlue);
  
  return underlineY + 20;
};

/**
 * Draw student details
 */
const drawStudentDetails = (doc, data, paymentStatus, statusColor, startY) => {
  const margin = 30;
  const sectionWidth = A4_WIDTH - (margin * 2);
  const sectionHeight = 160;
  
  drawRoundedRect(doc, margin, startY, sectionWidth, sectionHeight, 10, COLORS.white);
  doc.roundedRect(margin, startY, sectionWidth, sectionHeight, 10).strokeColor(COLORS.border).stroke();
  
  const colWidth = (sectionWidth - 60) / 2;
  const leftCol = margin + 15;
  const rightCol = margin + colWidth + 45;
  let currentY = startY + 20;
  
  // Row 1
  doc.fillColor(COLORS.textDark).fontSize(12).font('Helvetica-Bold')
     .text('اسم الطالب:', rightCol, currentY, { width: colWidth, align: 'right' });
  doc.fillColor(COLORS.primaryBlue).font('Helvetica')
     .text(data.studentName, rightCol, currentY + 18, { width: colWidth, align: 'right' });
  
  doc.fillColor(COLORS.textDark).font('Helvetica-Bold')
     .text('رقم الطالب:', leftCol, currentY, { width: colWidth, align: 'right' });
  doc.fillColor(COLORS.primaryBlue).font('Helvetica')
     .text(data.studentId, leftCol, currentY + 18, { width: colWidth, align: 'right' });
  
  currentY += 50;
  
  // Row 2
  doc.fillColor(COLORS.textDark).font('Helvetica-Bold')
     .text('الصف:', rightCol, currentY, { width: colWidth, align: 'right' });
  doc.fillColor(COLORS.primaryBlue).font('Helvetica')
     .text(data.grade, rightCol, currentY + 18, { width: colWidth, align: 'right' });
  
  doc.fillColor(COLORS.textDark).font('Helvetica-Bold')
     .text('حالة الدفع:', leftCol, currentY, { width: colWidth, align: 'right' });
  doc.fillColor(COLORS.primaryBlue).font('Helvetica')
     .text(paymentStatus, leftCol, currentY + 18, { width: colWidth, align: 'right' });
  
  currentY += 55;
  
  // Payment status badge
  const badgeWidth = sectionWidth - 40;
  const badgeHeight = 35;
  const badgeX = margin + 20;
  
  drawRoundedRect(doc, badgeX, currentY, badgeWidth, badgeHeight, 8, statusColor);
  
  doc.fillColor(COLORS.white).fontSize(16).font('Helvetica-Bold')
     .text(paymentStatus, badgeX, currentY + 9, { width: badgeWidth, align: 'center' });
  
  return startY + sectionHeight + 20;
};

/**
 * Draw fees table
 */
const drawFeesTable = (doc, fees, startY) => {
  const margin = 30;
  const tableWidth = A4_WIDTH - (margin * 2);
  const rowHeight = 35;
  const headerHeight = 40;
  
  const colWidths = [tableWidth * 0.25, tableWidth * 0.19, tableWidth * 0.18, tableWidth * 0.19, tableWidth * 0.19];
  
  // Calculate totals
  let totalAmount = 0, totalPaid = 0, totalBalance = 0, totalDiscount = 0;
  
  fees.forEach(fee => {
    totalAmount += fee.amount;
    totalPaid += fee.paid;
    totalDiscount += fee.balance === 0 ? 0 : (fee.discount || 0);
    totalBalance += fee.balance;
  });
  
  const tableHeight = headerHeight + (fees.length * rowHeight) + rowHeight;
  
  doc.roundedRect(margin, startY, tableWidth, tableHeight, 10).strokeColor(COLORS.border).stroke();
  
  // Header
  doc.rect(margin, startY, tableWidth, headerHeight).fill(COLORS.lightBlue);
  doc.rect(margin, startY + headerHeight - 2, tableWidth, 2).fill(COLORS.borderBlue);
  
  const headers = ['نوع الرسوم', 'المبلغ', 'الخصم', 'المدفوع', 'المتبقي'];
  let headerX = margin + tableWidth;
  
  doc.fillColor(COLORS.secondaryBlue).fontSize(12).font('Helvetica-Bold');
  headers.forEach((header, i) => {
    headerX -= colWidths[i];
    doc.text(header, headerX, startY + 12, { width: colWidths[i], align: 'center' });
  });
  
  // Data rows
  let currentY = startY + headerHeight;
  
  fees.forEach((fee, rowIndex) => {
    if (rowIndex % 2 === 1) {
      doc.rect(margin, currentY, tableWidth, rowHeight).fill(COLORS.background);
    }
    
    let cellX = margin + tableWidth;
    const rowData = [
      fee.type,
      `${formatNumber(fee.amount)} ${CURRENCY}`,
      `${formatNumber(fee.discount || 0)} ${CURRENCY}`,
      `${formatNumber(fee.paid)} ${CURRENCY}`,
      `${formatNumber(fee.balance)} ${CURRENCY}`
    ];
    
    doc.fillColor(COLORS.textDark).fontSize(11).font('Helvetica');
    rowData.forEach((cell, i) => {
      cellX -= colWidths[i];
      doc.text(cell, cellX, currentY + 10, { width: colWidths[i], align: 'center' });
    });
    
    doc.rect(margin, currentY + rowHeight - 1, tableWidth, 1).fill(COLORS.border);
    currentY += rowHeight;
  });
  
  // Total row
  doc.rect(margin, currentY, tableWidth, rowHeight).fill(COLORS.lightBlue);
  doc.rect(margin, currentY, tableWidth, 2).fill(COLORS.borderBlue);
  
  let totalX = margin + tableWidth;
  const totalData = [
    'الإجمالي',
    `${formatNumber(totalAmount)} ${CURRENCY}`,
    `${formatNumber(totalDiscount)} ${CURRENCY}`,
    `${formatNumber(totalPaid)} ${CURRENCY}`,
    `${formatNumber(totalBalance)} ${CURRENCY}`
  ];
  
  doc.fillColor(COLORS.secondaryBlue).fontSize(12).font('Helvetica-Bold');
  totalData.forEach((cell, i) => {
    totalX -= colWidths[i];
    doc.text(cell, totalX, currentY + 10, { width: colWidths[i], align: 'center' });
  });
  
  return currentY + rowHeight + 30;
};

/**
 * Draw footer
 */
const drawFooter = (doc) => {
  const footerHeight = 50;
  const footerY = A4_HEIGHT - footerHeight;
  
  doc.rect(0, footerY, A4_WIDTH, footerHeight).fill(COLORS.primaryBlue);
  
  doc.fillColor(COLORS.white).fontSize(10).font('Helvetica')
     .text('تم إصدار هذا التقرير بواسطة نظام المحاسبة المدرسي', 0, footerY + 12, { width: A4_WIDTH, align: 'center' })
     .text(`© ${new Date().getFullYear()} جميع الحقوق محفوظة`, 0, footerY + 28, { width: A4_WIDTH, align: 'center' });
};

/**
 * Generate Student Report PDF
 */
const generateStudentReportPDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `التقرير المالي للطالب - ${data.studentName}`,
          Author: data.schoolName,
          Subject: 'Student Financial Report',
          Creator: 'School Accounting System'
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Calculate totals
      let totalBalance = 0, totalPaid = 0;
      data.fees.forEach(fee => {
        totalBalance += fee.balance;
        totalPaid += fee.paid;
      });
      
      // Determine payment status
      let paymentStatus = 'غير مدفوع';
      let statusColor = COLORS.danger;
      
      if (totalBalance === 0) {
        paymentStatus = 'مدفوع بالكامل';
        statusColor = COLORS.success;
      } else if (totalPaid > 0) {
        paymentStatus = 'مدفوع جزئياً';
        statusColor = COLORS.warning;
      }
      
      // Generate IDs and dates
      const reportId = `SR-${Math.floor(Math.random() * 9000000) + 1000000}`;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const academicYearStart = currentDate.getMonth() >= 8 ? currentYear : currentYear - 1;
      const academicYear = `${academicYearStart}/${academicYearStart + 1}`;
      const reportDate = formatDate(currentDate.toISOString());
      
      // Draw components
      let currentY = drawHeader(doc, 'التقرير المالي للطالب');
      currentY += 15;
      currentY = drawReportMetadata(doc, reportId, academicYear, reportDate, currentY);
      currentY = drawSchoolInfo(doc, data, currentY);
      currentY = drawDocumentTitle(doc, 'التقرير المالي للطالب', currentY);
      currentY = drawStudentDetails(doc, data, paymentStatus, statusColor, currentY);
      currentY = drawFeesTable(doc, data.fees, currentY);
      drawFooter(doc);
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateStudentReportPDF
};
