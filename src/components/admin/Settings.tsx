import React from 'react';
import ReportSettings from '../pdf/ReportSettings';
import FooterSettings from './FooterSettings';

const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">الإعدادات</h2>
      
      <div className="grid gap-6">
        <FooterSettings />
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">إعدادات التقارير</h3>
            <ReportSettings />
          </div>
        </div>
        
        {/* Add other settings sections here */}
      </div>
    </div>
  );
};

export default Settings; 