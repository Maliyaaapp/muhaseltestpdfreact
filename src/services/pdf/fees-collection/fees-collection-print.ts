import { FeesCollectionReportData } from '../types';
import { generateFeesCollectionReportHTML } from './fees-collection-html';
import { openPrintWindow } from '../core/print-utils';

/**
 * Print fees collection report using browser's print functionality
 * @param data - The fees collection report data
 */
export const printFeesCollectionReport = (data: FeesCollectionReportData): void => {
  try {
    // Generate HTML content
    const htmlContent = generateFeesCollectionReportHTML(data);
    
    // Add data attribute for footer visibility
    const footerVisibility = data.showFooter !== false;
    const htmlWithSettings = htmlContent.replace('<body', `<body data-show-footer="${footerVisibility}" class="arabic-text"`);
    
    // Use the openPrintWindow utility to handle printing
    openPrintWindow(htmlWithSettings, 500);
  } catch (error) {
    console.error('Error printing fees collection report:', error);
    alert('حدث خطأ أثناء طباعة تقرير تحصيل الرسوم. يرجى المحاولة مرة أخرى.');
  }
}; 