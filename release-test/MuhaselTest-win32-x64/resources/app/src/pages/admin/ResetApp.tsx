import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { cleanupDatabase } from '../../services/hybridApi';
import { getSchools } from '../../services/schoolService';

const ResetApp = () => {
  const navigate = useNavigate();
  const [isResetting, setIsResetting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleReset = async () => {
    setIsResetting(true);
    setResetMessage('جاري إعادة تعيين البيانات...');
    
    try {
      // Get schools from Firebase first to verify reset worked
      const firebaseSchools = await getSchools();
      console.log(`Found ${firebaseSchools.length} schools in Firebase before reset`);
      
      // Use the cleanupDatabase function from api.ts
      const result = await cleanupDatabase();
      
      if (result.success) {
        setResetMessage(result.message || 'تم مسح جميع المدارس والبيانات المرتبطة بها بنجاح');
      } else {
        throw new Error(result.error || 'فشل في تنظيف قاعدة البيانات');
      }
      
      // Show success
      setResetComplete(true);
      setConfirmation('');
      setShowConfirmation(false);
      
      // Reset state after delay
      setTimeout(() => {
        setIsResetting(false);
      }, 1000);
    } catch (error) {
      console.error('Error resetting application data:', error);
      setIsResetting(false);
      setResetMessage('حدث خطأ أثناء إعادة تعيين البيانات');
      alert('حدث خطأ أثناء إعادة تعيين البيانات. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowRight size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">إعادة تعيين النظام</h1>
      </div>
      
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-full">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-red-700">تحذير</h2>
          <p className="text-red-700">
            سيؤدي إعادة تعيين النظام إلى حذف بيانات مهمة من التطبيق. هذا الإجراء لا يمكن التراجع عنه.
            استخدم هذه الوظيفة فقط إذا كنت تواجه مشاكل في النظام وتحتاج إلى البدء من جديد.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-800">إعادة تعيين النظام</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-medium text-yellow-800">
                سيؤدي هذا الإجراء إلى:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-yellow-700">
                <li>حذف جميع المدارس من النظام</li>
                <li>حذف جميع حسابات المستخدمين المرتبطة بالمدارس</li>
                <li>حذف جميع بيانات الطلاب والرسوم</li>
                <li>إزالة الإعدادات المخصصة</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            {resetComplete ? (
              <div className="bg-green-50 p-4 rounded border border-green-200 text-green-700 flex items-center gap-3">
                <RefreshCw size={20} />
                <span>{resetMessage}</span>
              </div>
            ) : (
              <div className="flex justify-end">
                {!showConfirmation ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(true)}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    <span>إعادة التعيين</span>
                  </button>
                ) : (
                  <div className="w-full space-y-4">
                    <div>
                      <label className="block text-red-600 font-medium mb-2">
                        اكتب "تأكيد" لإعادة التعيين
                      </label>
                      <input
                        type="text"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        className="input border-red-300 focus:border-red-500 focus:ring-red-500"
                        placeholder="تأكيد"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfirmation(false);
                          setConfirmation('');
                        }}
                        className="btn btn-outline"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={confirmation !== 'تأكيد' || isResetting}
                        onClick={handleReset}
                        className="btn btn-danger flex items-center gap-2"
                      >
                        {isResetting ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            <span>{resetMessage}</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={18} />
                            <span>تأكيد إعادة التعيين</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {resetComplete && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="btn btn-primary"
          >
            العودة إلى لوحة التحكم
          </button>
        </div>
      )}
    </div>
  );
};

export default ResetApp;