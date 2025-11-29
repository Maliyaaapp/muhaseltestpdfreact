import { Bell, User, RefreshCw, Database } from 'lucide-react';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import { resetAllData } from '../../services/dataStore';
import { useState } from 'react';
import AuthResetButton from '../AuthResetButton';
import storage, { safeClearStorage } from '../../utils/storage';

const Header = () => {
  const { user } = useSupabaseAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setIsResetting(true);
    try {
      resetAllData();
      alert('تم مسح جميع البيانات بنجاح. سيتم تحديث الصفحة الآن.');
      window.location.reload();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('حدث خطأ أثناء مسح البيانات');
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const cancelReset = () => {
    setShowResetConfirm(false);
  };

  const handleClearCache = () => {
    if (confirm('هل تريد مسح ذاكرة التخزين المؤقت؟ سيؤدي هذا إلى تحسين أداء التطبيق.')) {
      setIsClearing(true);
      
      try {
        // Safely clear session data while preserving important application data
        safeClearStorage();
        
        alert('تم مسح ذاكرة التخزين المؤقت بنجاح. سيتم إعادة تحميل التطبيق.');
        
        // Reload the page
        window.location.reload();
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('حدث خطأ أثناء مسح ذاكرة التخزين المؤقت');
        setIsClearing(false);
      }
    }
  };

  return (
    <header className="bg-white shadow-sm py-3 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-gray-800">
          {user?.schoolName || 'لوحة التحكم'}
        </h2>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Auth Reset Button */}
        <AuthResetButton size="sm" />
        
        {/* Cache Clear Button */}
        <button
          onClick={handleClearCache}
          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm"
          disabled={isClearing}
          title="تنظيف ذاكرة التخزين المؤقت"
        >
          <Database size={16} className={isClearing ? 'animate-spin' : ''} />
          <span>{isClearing ? 'جاري المسح...' : 'تنظيف الذاكرة'}</span>
        </button>
        
        {/* Data Reset Button */}
        {!showResetConfirm ? (
          <button
            onClick={handleResetClick}
            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm"
            title="إعادة تعيين البيانات"
          >
            <RefreshCw size={16} />
            <span>إعادة تعيين البيانات</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelReset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm"
            >
              إلغاء
            </button>
            <button
              onClick={confirmReset}
              className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-1"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>جاري التنفيذ...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>تأكيد إعادة التعيين</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Notification button */}
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Bell size={20} />
        </button>
        
        {/* User button */}
        <button className="p-2 rounded-full hover:bg-gray-100">
          <User size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
 