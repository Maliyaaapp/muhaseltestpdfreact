import React from 'react';
import { useReportSettings } from '../../contexts/ReportSettingsContext';

const ReportSettings: React.FC = () => {
  const { settings, updateSettings } = useReportSettings();

  const handleFooterToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Footer setting removed
  };

  return (
    <div className="report-settings p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">إعدادات التقارير</h3>
      
      <div className="space-y-4">
        <div className="footer-settings">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <label htmlFor="show-footer" className="font-medium text-gray-700">
                تذييل الصفحة
              </label>
              <p className="text-sm text-gray-500">
                إظهار معلومات المدرسة في تذييل التقارير
              </p>
            </div>
            <div className="relative inline-block w-12 mr-2 align-middle select-none">
              <input
                type="checkbox"
                id="show-footer"
                checked={false}
                onChange={handleFooterToggle}
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

export default ReportSettings;