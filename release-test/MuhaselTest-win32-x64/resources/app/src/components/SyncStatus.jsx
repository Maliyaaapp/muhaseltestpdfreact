import React, { useState, useEffect } from 'react';
import syncManager from '../services/offline/sync-manager';
import connectionManager from '../services/offline/connection-manager';

/**
 * SyncStatus Component
 * Displays the current synchronization status and provides controls to trigger sync
 */
function SyncStatus() {
  const [syncState, setSyncState] = useState({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null,
    message: '',
    progress: null
  });

  useEffect(() => {
    // Initial status
    updateSyncState();
    
    // Register listeners for connection and sync status changes
    const connectionUnsubscribe = connectionManager.addListener(isOnline => {
      setSyncState(prevState => ({
        ...prevState,
        isOnline
      }));
    });
    
    const syncUnsubscribe = syncManager.addListener(data => {
      setSyncState(prevState => ({
        ...prevState,
        isSyncing: data.status === 'syncing',
        message: data.message || '',
        lastSyncTime: data.lastSyncTime || prevState.lastSyncTime,
        progress: data.progress || null
      }));
    });
    
    // Set up interval to periodically update sync status
    const interval = setInterval(() => {
      updateSyncState();
    }, 30000); // Every 30 seconds
    
    // Clean up on unmount
    return () => {
      connectionUnsubscribe();
      syncUnsubscribe();
      clearInterval(interval);
    };
  }, []);

  /**
   * Update sync state from service
   */
  const updateSyncState = () => {
    const status = syncManager.getStatus();
    setSyncState(prevState => ({
      ...prevState,
      isOnline: connectionManager.isConnected(),
      isSyncing: status.isSyncing,
      lastSyncTime: status.lastSyncTime
    }));
  };

  /**
   * Trigger manual synchronization
   */
  const handleSyncNow = async () => {
    try {
      await syncManager.syncNow();
      updateSyncState();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    if (!date) return 'Never';
    
    return new Date(date).toLocaleString();
  };

  return (
    <div className="sync-status-container">
      <div className={`connection-indicator ${syncState.isOnline ? 'online' : 'offline'}`}>
        <span className="indicator-dot"></span>
        <span className="indicator-text">
          {syncState.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <div className="sync-info">
        {syncState.isSyncing ? (
          <div className="sync-progress">
            <span className="sync-message">{syncState.message}</span>
            {syncState.progress && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${(syncState.progress.current / syncState.progress.total) * 100}%` 
                  }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="last-sync">
            <span>Last sync: {formatDate(syncState.lastSyncTime)}</span>
          </div>
        )}
      </div>
      
      <button
        className="sync-button"
        onClick={handleSyncNow}
        disabled={syncState.isSyncing || !syncState.isOnline}
      >
        {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
      
      <style jsx>{`
        .sync-status-container {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background-color: #f5f5f5;
          border-radius: 4px;
          margin: 8px 0;
          font-size: 14px;
        }
        
        .connection-indicator {
          display: flex;
          align-items: center;
          margin-right: 12px;
          padding-right: 12px;
          border-right: 1px solid #ddd;
        }
        
        .indicator-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 6px;
        }
        
        .online .indicator-dot {
          background-color: #4CAF50;
        }
        
        .offline .indicator-dot {
          background-color: #F44336;
        }
        
        .online .indicator-text {
          color: #4CAF50;
        }
        
        .offline .indicator-text {
          color: #F44336;
        }
        
        .sync-info {
          flex-grow: 1;
          overflow: hidden;
        }
        
        .sync-progress {
          display: flex;
          flex-direction: column;
        }
        
        .progress-bar {
          height: 4px;
          background-color: #e0e0e0;
          border-radius: 2px;
          margin-top: 4px;
          width: 100%;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #2196F3;
          transition: width 0.3s ease;
        }
        
        .sync-button {
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .sync-button:hover:not(:disabled) {
          background-color: #1976D2;
        }
        
        .sync-button:disabled {
          background-color: #B0BEC5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default SyncStatus; 