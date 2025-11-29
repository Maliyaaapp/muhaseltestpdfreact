import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { shouldUseSupabase } from '../services/supabase';
import { processSyncQueue } from '../services/hybridApi';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  message: string;
}

const SupabaseSyncStatus: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    message: ''
  });
  const [showStatus, setShowStatus] = useState(false);

  // Function to get pending changes count from localStorage
  const getPendingChangesCount = (): number => {
    try {
      const syncQueue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
      return syncQueue.length;
    } catch (e) {
      console.error('Error parsing sync queue:', e);
      return 0;
    }
  };

  // Update sync state
  const updateSyncState = () => {
    const isOnline = navigator.onLine;
    const pendingChanges = getPendingChangesCount();
    
    setSyncState(prev => ({
      ...prev,
      isOnline,
      pendingChanges
    }));

    // Show status if there are pending changes or we're offline
    if (pendingChanges > 0 || !isOnline) {
      setShowStatus(true);
    }
  };

  // Handle manual sync
  const handleSync = async () => {
    if (!shouldUseSupabase() || syncState.isSyncing) return;
    
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, message: 'Syncing...' }));
      
      const result = await processSyncQueue();
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        pendingChanges: getPendingChangesCount(),
        message: result.message || ''
      }));

      // Auto hide after successful sync if no pending changes
      if (getPendingChangesCount() === 0) {
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        message: 'Sync failed. Try again.'
      }));
    }
  };

  useEffect(() => {
    // Initial update
    updateSyncState();
    
    // Set up event listeners for online/offline status
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      setShowStatus(true);
      
      // Auto sync when coming back online
      if (getPendingChangesCount() > 0) {
        handleSync();
      } else {
        // Auto hide after 3 seconds if no pending changes
        setTimeout(() => setShowStatus(false), 3000);
      }
    };
    
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
      setShowStatus(true);
    };
    
    // Listen for storage changes (for sync queue updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'syncQueue') {
        updateSyncState();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorageChange);
    
    // Set up interval to check pending changes
    const interval = setInterval(updateSyncState, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Hide button to manually close the status
  const handleClose = () => setShowStatus(false);

  // If not showing status, return null
  if (!showStatus) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
      <div className="flex items-center gap-2">
        {syncState.isOnline ? (
          <Cloud size={18} className="text-blue-500" />
        ) : (
          <CloudOff size={18} className="text-orange-500" />
        )}
        
        <div className="text-sm">
          <div className="font-medium">
            {syncState.isOnline ? 'Connected to Supabase' : 'Working Offline'}
          </div>
          
          {syncState.pendingChanges > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {syncState.pendingChanges} {syncState.pendingChanges === 1 ? 'change' : 'changes'} pending
            </div>
          )}
          
          {syncState.message && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {syncState.message}
            </div>
          )}
        </div>
        
        {syncState.isOnline && syncState.pendingChanges > 0 && (
          <button 
            onClick={handleSync}
            disabled={syncState.isSyncing}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Sync now"
          >
            <RefreshCw 
              size={16} 
              className={`${syncState.isSyncing ? 'animate-spin text-blue-500' : 'text-gray-500'}`} 
            />
          </button>
        )}
        
        <button 
          onClick={handleClose}
          className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default SupabaseSyncStatus;