import React, { useState, useEffect } from 'react';

/**
 * ConnectionStatusIndicator Component
 * Shows current online/offline status in a compact format suitable for headers
 */
function ConnectionStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state based on navigator.onLine
    setIsOnline(navigator.onLine);

    // Check if hybrid API is available
    if (window.hybridApi && window.hybridApi.connection) {
      // Use hybrid API for more accurate status
      setIsOnline(window.hybridApi.connection.isOnline());
      
      // Add listener for connection status changes
      const unsubscribe = window.hybridApi.connection.addListener((online) => {
        setIsOnline(online);
      });
      
      // Clean up on unmount
      return () => unsubscribe();
    } else {
      // Fall back to browser online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <div className="connection-status-indicator">
      <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
      <span className="status-text">{isOnline ? 'متصل' : 'غير متصل'}</span>
      
      <style jsx>{`
        .connection-status-indicator {
          display: flex;
          align-items: center;
          font-size: 0.75rem;
          margin-right: 1rem;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 4px;
        }
        
        .status-dot.online {
          background-color: #10b981;
        }
        
        .status-dot.offline {
          background-color: #ef4444;
        }
        
        .status-text {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}

export default ConnectionStatusIndicator; 