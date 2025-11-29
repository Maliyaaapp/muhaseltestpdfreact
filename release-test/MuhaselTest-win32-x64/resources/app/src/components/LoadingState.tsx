import React from 'react';
import { Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';

interface LoadingStateProps {
  isLoading?: boolean;
  isOffline?: boolean;
  hasData?: boolean;
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading = false,
  isOffline = false,
  hasData = false,
  message,
  showRetry = false,
  onRetry
}) => {
  // Don't show anything if we have data and we're not loading
  if (hasData && !isLoading) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-center">
          {message || 'جاري تحميل البيانات...'}
        </p>
        {isOffline && (
          <div className="flex items-center mt-2 text-amber-600">
            <WifiOff className="h-4 w-4 mr-2" />
            <span className="text-sm">وضع عدم الاتصال</span>
          </div>
        )}
      </div>
    );
  }

  // Offline state with no data
  if (isOffline && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-amber-100 rounded-full p-4 mb-4">
          <WifiOff className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          لا يوجد اتصال بالإنترنت
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          لا توجد بيانات محفوظة للعرض في وضع عدم الاتصال. يرجى الاتصال بالإنترنت لتحميل البيانات.
        </p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة المحاولة
          </button>
        )}
      </div>
    );
  }

  // Online state with no data
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-gray-100 rounded-full p-4 mb-4">
          <Database className="h-8 w-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          لا توجد بيانات
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          {message || 'لم يتم العثور على أي بيانات للعرض.'}
        </p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة التحميل
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default LoadingState;