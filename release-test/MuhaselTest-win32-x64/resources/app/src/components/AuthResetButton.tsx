import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { logout } from '../utils/authUtils';

// Define a local resetAuth function since we no longer have resetFirebaseAuth
const resetAuth = async (): Promise<void> => {
  // Clear authentication data from localStorage
  await logout();
  
  // Clear any other auth-related data that might be in localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('authRefreshToken');
  localStorage.removeItem('authExpiration');
  
  // Reload the page to reset the application state
  window.location.reload();
};

interface AuthResetButtonProps {
  variant?: 'primary' | 'secondary' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AuthResetButton = ({ 
  variant = 'warning', 
  size = 'md',
  className = '' 
}: AuthResetButtonProps) => {
  const [isResetting, setIsResetting] = useState(false);
  
  const getButtonStyle = () => {
    const baseStyle = "flex items-center gap-2 rounded-md font-medium";
    
    const variantStyles = {
      primary: "bg-primary text-white hover:bg-primary-dark",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      warning: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
    };
    
    const sizeStyles = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-2 text-sm",
      lg: "px-4 py-3 text-base"
    };
    
    return `${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  };
  
  const handleReset = async () => {
    if (isResetting) return;
    
    const confirmed = window.confirm(
      'هذا سيقوم بإعادة تعيين حالة المصادقة ومسح البيانات المخزنة محلياً المتعلقة بالمصادقة. ' +
      'قد يساعد هذا في حل مشاكل تسجيل الدخول.\n\n' +
      'هل أنت متأكد من المتابعة؟'
    );
    
    if (!confirmed) return;
    
    setIsResetting(true);
    
    try {
      await resetAuth();
      // The page will reload from resetAuth function
    } catch (error) {
      console.error('Error resetting auth state:', error);
      alert('حدث خطأ أثناء إعادة تعيين حالة المصادقة');
      setIsResetting(false);
    }
  };
  
  return (
    <button
      type="button"
      onClick={handleReset}
      className={getButtonStyle()}
      disabled={isResetting}
      title="إعادة تعيين حالة المصادقة"
    >
      <RefreshCw size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className={isResetting ? "animate-spin" : ""} />
      <span>{isResetting ? 'جاري إعادة التعيين...' : 'إعادة تعيين المصادقة'}</span>
    </button>
  );
};

export default AuthResetButton; 