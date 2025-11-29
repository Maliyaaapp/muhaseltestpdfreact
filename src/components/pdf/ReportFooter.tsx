import React from 'react';
import { useReportSettings } from '../../contexts/ReportSettingsContext';

interface ReportFooterProps {
  schoolName: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolEmail?: string;
  isMultiPage?: boolean;
  isFirstPage?: boolean;
  type?: 'report' | 'receipt' | 'installment';
}

const ReportFooter: React.FC<ReportFooterProps> = ({
  schoolName,
  schoolPhone,
  schoolPhoneWhatsapp,
  schoolPhoneCall,
  schoolEmail,
  isMultiPage = false,
  isFirstPage = false,
  type = 'report'
}) => {
  const { settings } = useReportSettings();
  const { footerSettings } = settings;

  // Check if footer should be shown based on document type
  const shouldShowFooter = () => {
    
    switch (type) {
      case 'report':
        return footerSettings.showInReports;
      case 'receipt':
        return footerSettings.showInReceipts;
      case 'installment':
        return footerSettings.showInInstallments;
      default:
        return true;
    }
  };

  // Don't render if footer is disabled or shouldn't show for this document type
  if (!shouldShowFooter()) return null;

  // Don't render on first page of multi-page documents
  if (isMultiPage && isFirstPage) return null;

  return (
    <div className="report-footer">
      <style>
        {`
          .report-footer {
            position: fixed;
            bottom: 20mm;
            left: 20mm;
            right: 20mm;
            width: calc(100% - 40mm);
            background-color: white;
            padding: 15px;
            text-align: center;
            border-top: 1px solid #eee;
            margin-top: auto;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            z-index: 9999;
          }

          .footer-school-name {
            font-size: 16px;
            font-weight: 500;
            color: #333;
            margin-bottom: 8px;
          }

          .contact-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: #666;
          }

          .contact-info span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          @media print {
            .report-footer {
              position: fixed !important;
              bottom: 20mm !important;
              left: 20mm !important;
              right: 20mm !important;
              width: calc(100% - 40mm) !important;
              background-color: white !important;
              z-index: 9999 !important;
              margin: 0 !important;
              padding: 10px 15px !important;
            }

            /* Hide footer on first page of multi-page documents */
            .pdf-content[data-pages="multiple"] .report-footer:first-of-type {
              display: none !important;
            }

            /* Show footer on single page documents */
            .pdf-content[data-pages="single"] .report-footer {
              display: block !important;
            }

            /* Ensure footer is above other content */
            .report-footer {
              position: relative !important;
              z-index: 9999 !important;
            }
          }
        `}
      </style>
      <div className="footer-school-name">{schoolName}</div>
      <div className="contact-info">
        {footerSettings.contactInfo.phone && (
          <span>هاتف: {footerSettings.contactInfo.phone}</span>
        )}
        {footerSettings.contactInfo.whatsapp && (
          <span>واتساب: {footerSettings.contactInfo.whatsapp}</span>
        )}
        {footerSettings.contactInfo.email && (
          <span>البريد الإلكتروني: {footerSettings.contactInfo.email}</span>
        )}
        {footerSettings.contactInfo.address && (
          <span>العنوان: {footerSettings.contactInfo.address}</span>
        )}
      </div>
    </div>
  );
};

export default ReportFooter;