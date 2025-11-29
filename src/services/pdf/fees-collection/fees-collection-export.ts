import { FeesCollectionReportData } from '../types';
import { generateFeesCollectionReportHTML } from './fees-collection-html';
import { generatePDF } from '../core/pdf-generation';

/**
 * Download fees collection report as PDF using Electron's printToPDF
 * @param data - The data to use for generating the PDF
 * @returns Promise resolving to void
 */
export const downloadFeesCollectionReportAsPDF = async (data: FeesCollectionReportData): Promise<void> => {
  try {
    // Stamp functionality removed
    const dataWithoutStamp = {
      ...data,
      showStamp: false,
      // stamp: data.stampSettings?.showStamp === true ? (data.stampSettings?.stampImage || data.stamp) : undefined, // Stamp functionality removed
      // Remove footer from PDFs
      showFooter: false
    };
    
    // Get HTML content from the same generator used for printing
    const htmlContent = generateFeesCollectionReportHTML(dataWithoutStamp);
    const fileName = `تقرير_تحصيل_الرسوم_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Add data attributes for header/footer visibility control
    let htmlWithSettings = htmlContent.replace('<body', `<body data-show-footer="false" data-header-first-page-only="true" class="arabic-text"`);

    // Use our generatePDF utility with landscape=true and zero margins
    const result = await generatePDF(htmlWithSettings, fileName, {
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    
    // Don't show error if user canceled the save dialog
    if (!result.success && !result.canceled) {
      console.error('Error generating fees collection report PDF:', result.error);
      alert('حدث خطأ أثناء إنشاء ملف PDF: ' + result.error);
    }
  } catch (error) {
    console.error('Error generating PDF report:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
  }
};

/**
 * Export fees collection report as PDF using Electron's printToPDF
 * @param data - The data to use for generating the PDF
 * @returns Promise resolving to the path of the saved PDF file
 */
export const exportFeesCollectionReportAsPDF = async (data: FeesCollectionReportData): Promise<string> => {
  try {
    // Stamp functionality removed
    const dataWithoutStamp = {
      ...data,
      showStamp: false,
      // stamp: data.stampSettings?.showStamp === true ? (data.stampSettings?.stampImage || data.stamp) : undefined, // Stamp functionality removed
      // Remove footer from PDFs
      showFooter: false
    };
    
    // Get HTML content from the same generator used for printing
    const htmlContent = generateFeesCollectionReportHTML(dataWithoutStamp);
    const fileName = `تقرير_تحصيل_الرسوم_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Add data attributes for header/footer visibility control
    let htmlWithSettings = htmlContent.replace('<body', `<body data-show-footer="false" data-header-first-page-only="true" class="arabic-text"`);

    // Use our generatePDF utility with landscape=true and zero margins
    const result = await generatePDF(htmlWithSettings, fileName, {
      landscape: true,
      printBackground: true,
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });
    
    if (!result.success || !result.filePath) {
      throw new Error(result.error || 'Failed to generate PDF');
    }
    
    return result.filePath;
  } catch (error) {
    console.error('Error exporting fees collection report as PDF:', error);
    throw error;
  }
};