import React from 'react';
import { CheckCircle } from 'lucide-react';

const AccountSyncStatus: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">حالة التخزين المحلي</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">وضع التخزين</div>
            <div className="flex items-center mt-2">
              <CheckCircle size={18} className="text-green-500 ml-1" />
              <span className="text-green-600 font-medium">التخزين المحلي يعمل بشكل صحيح</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSyncStatus; 