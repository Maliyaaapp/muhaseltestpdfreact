import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Function to update online status
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      // Show the status when it changes
      if (online !== isOnline) {
        setShowStatus(true);
        // Auto hide after 5 seconds
        setTimeout(() => setShowStatus(false), 5000);
      }
    };

    // Add event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // If starting offline, show the status
    if (!navigator.onLine) {
      setShowStatus(true);
    }

    // Clean up
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isOnline]);

  // If not showing status, return null
  if (!showStatus) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 px-4 py-2 rounded-md shadow-md flex items-center gap-2 text-sm ${
      isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isOnline ? (
        <>
          <Wifi size={16} className="text-green-600" />
          <span>أنت متصل الآن بالإنترنت</span>
        </>
      ) : (
        <>
          <WifiOff size={16} className="text-red-600" />
          <span>أنت غير متصل بالإنترنت. سيتم حفظ التغييرات محليًا حتى تعود للاتصال</span>
        </>
      )}
    </div>
  );
};

export default NetworkStatus; 