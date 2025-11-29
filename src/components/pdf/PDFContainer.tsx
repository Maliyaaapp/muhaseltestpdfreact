import React, { useEffect, useRef } from 'react';
import { useReportSettings } from '../../contexts/ReportSettingsContext';

interface PDFContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PDFContainer: React.FC<PDFContainerProps> = ({ children, className = '' }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { settings } = useReportSettings();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Calculate content height in mm
    const contentHeight = content.offsetHeight;
    const mmPerPixel = 0.264583333;
    const contentHeightMm = contentHeight * mmPerPixel;
    
    // A4 height minus margins
    const availableHeight = 297 - (2 * 20); // 297mm (A4) - margins
    
    // Calculate number of pages
    const pagesCount = Math.ceil(contentHeightMm / availableHeight);
    
    // Set data attribute for styling
    content.setAttribute('data-pages', pagesCount > 1 ? 'multiple' : 'single');

    // Add page numbers if multiple pages
    if (pagesCount > 1) {
      const footers = content.querySelectorAll('.report-footer');
      const lastFooter = footers[footers.length - 1] as HTMLElement;
      if (lastFooter) {
        const pageInfo = document.createElement('div');
        pageInfo.className = 'page-info';
        pageInfo.style.cssText = 'margin-top: 8px; font-size: 11px; color: #666; text-align: center;';
        pageInfo.textContent = `الصفحة ${pagesCount} من ${pagesCount}`;
        lastFooter.appendChild(pageInfo);
      }
    }
  }, [children]);

  return (
    <div ref={contentRef} className={`pdf-content ${className}`}>
      <style>
        {`
          @page {
            size: A4;
            margin: 20mm;
          }

          .pdf-content {
            background: white;
            position: relative;
            box-sizing: border-box;
            min-height: 100%;
            display: flex;
            flex-direction: column;
          }

          /* Basic table styles */
          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead {
            display: table-header-group;
          }

          /* Print-specific styles */
          @media print {
            html, body {
              margin: 0;
              padding: 0;
              background: white;
              height: 100%;
            }

            .pdf-content {
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: 100%;
              position: relative;
            }

            /* Content page breaks */
            .report-section {
              page-break-inside: avoid;
            }

            tr {
              page-break-inside: avoid;
            }

            /* Main content wrapper */
            .report-content {
              flex: 1;
              position: relative;
              z-index: 1;
              margin-bottom: 60mm; /* Space for footer */
            }

            /* Footer styles */
            .report-footer {
              position: fixed;
              bottom: 20mm;
              left: 20mm;
              right: 20mm;
              background: white;
              border-top: 1px solid #eee;
              text-align: center;
              padding: 10px 0;
              z-index: 2;
            }

            /* Footer visibility */
            .report-footer {
              visibility: hidden;
            }

            .pdf-content[data-pages="single"] .report-footer {
              visibility: visible;
            }

            .pdf-content[data-pages="multiple"] .report-footer:last-of-type {
              visibility: visible;
            }

            /* Hide print buttons */
            .print-buttons {
              display: none !important;
            }
          }
        `}
      </style>
      {children}
    </div>
  );
};

export default PDFContainer;