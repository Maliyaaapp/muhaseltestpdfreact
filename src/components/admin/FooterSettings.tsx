import React from 'react';
import { useReportSettings } from '../../contexts/ReportSettingsContext';

const FooterSettings: React.FC = () => {
  const { settings, updateFooterSettings } = useReportSettings();
  const { footerSettings } = settings;

  const handleToggleChange = (field: keyof typeof footerSettings) => {
    updateFooterSettings({
      [field]: !footerSettings[field]
    });
  };

  const handleContactInfoChange = (field: keyof typeof footerSettings.contactInfo, value: string) => {
    updateFooterSettings({
      contactInfo: {
        ...footerSettings.contactInfo,
        [field]: value
      }
    });
  };

  return (
    <div className="footer-settings p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-6">إعدادات تذييل الصفحة</h3>
      
      <div className="space-y-6">
        {/* Main Footer Toggle */}
        <div className="toggle-section">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label htmlFor="show-footer" className="font-medium text-gray-700">
                تذييل الصفحة
              </label>
              <p className="text-sm text-gray-500">
                إظهار معلومات المدرسة في تذييل الصفحات
              </p>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none">
              <input
                type="checkbox"
                id="show-footer"
                checked={false}
        onChange={() => {}}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-6 checked:bg-primary"
              />
              <label
                htmlFor="show-footer"
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                  'bg-gray-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Document Type Settings */}
        <div className="document-settings space-y-4">
          <h4 className="font-medium text-gray-700 mb-2">إظهار في المستندات</h4>
          
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label htmlFor="show-in-reports" className="text-sm text-gray-600">التقارير</label>
              <input
                type="checkbox"
                id="show-in-reports"
                checked={footerSettings.showInReports}
                onChange={() => handleToggleChange('showInReports')}
                className="form-checkbox h-5 w-5 text-primary rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label htmlFor="show-in-receipts" className="text-sm text-gray-600">الإيصالات</label>
              <input
                type="checkbox"
                id="show-in-receipts"
                checked={footerSettings.showInReceipts}
                onChange={() => handleToggleChange('showInReceipts')}
                className="form-checkbox h-5 w-5 text-primary rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label htmlFor="show-in-installments" className="text-sm text-gray-600">تقارير الأقساط</label>
              <input
                type="checkbox"
                id="show-in-installments"
                checked={footerSettings.showInInstallments}
                onChange={() => handleToggleChange('showInInstallments')}
                className="form-checkbox h-5 w-5 text-primary rounded border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="contact-info space-y-4">
          <h4 className="font-medium text-gray-700 mb-2">معلومات الاتصال</h4>
          
          <div className="grid gap-4">
            <div className="form-group">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                id="phone"
                value={footerSettings.contactInfo.phone || ''}
                onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                رقم الواتساب
              </label>
              <input
                type="tel"
                id="whatsapp"
                value={footerSettings.contactInfo.whatsapp || ''}
                onChange={(e) => handleContactInfoChange('whatsapp', e.target.value)}
                className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                id="email"
                value={footerSettings.contactInfo.email || ''}
                onChange={(e) => handleContactInfoChange('email', e.target.value)}
                className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                العنوان
              </label>
              <input
                type="text"
                id="address"
                value={footerSettings.contactInfo.address || ''}
                onChange={(e) => handleContactInfoChange('address', e.target.value)}
                className="form-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          .toggle-checkbox:checked {
            right: 0;
            border-color: #800000;
          }
          .toggle-label {
            width: 48px;
          }
          .toggle-checkbox {
            right: 0;
            z-index: 1;
            border-color: #ccc;
          }
        `}
      </style>
    </div>
  );
};

export default FooterSettings;