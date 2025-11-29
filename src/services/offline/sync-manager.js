const connectionManager = require('./connection-manager');
const sqliteService = require('./sqlite-service');

/**
 * Sync Manager Service
 * Handles data synchronization between local SQLite and remote MongoDB
 */
class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.apiBaseUrl = null;
    this.token = null;
    this.initialized = false;
    this.listeners = [];
  }

  /**
   * Initialize the sync manager
   * @param {string} apiBaseUrl - Base URL for API requests
   */
  initialize(apiBaseUrl) {
    if (this.initialized) return;

    this.apiBaseUrl = apiBaseUrl || 'http://localhost:5000/api';
    
    // Start automatic sync interval (every 5 minutes when online)
    this.startSyncInterval();
    
    // Listen to connection changes
    connectionManager.addListener(this.handleConnectionChange.bind(this));
    
    this.initialized = true;
    console.log('Sync manager initialized');
  }

  /**
   * Set authentication token for API requests
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.token = token;
    console.log('Auth token updated in sync manager');
  }

  /**
   * Start automatic sync interval
   */
  startSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.token && connectionManager.isConnected() && !this.isSyncing) {
        this.syncNow().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Handle connection status change
   * @param {boolean} isOnline - Whether the connection is online
   */
  handleConnectionChange(isOnline) {
    if (isOnline && this.token && !this.isSyncing) {
      console.log('Connection restored. Starting sync...');
      this.syncNow().catch(error => {
        console.error('Connection-restored sync failed:', error);
      });
    }
  }

  /**
   * Start synchronization process immediately
   * @returns {Promise<boolean>} - Whether sync was successful
   */
  async syncNow() {
    if (this.isSyncing || !connectionManager.isConnected() || !this.token) {
      return false;
    }

    try {
      this.isSyncing = true;
      this.notifyListeners({ status: 'syncing', message: 'Syncing data...' });

      await sqliteService.initialize();

      // 1. Upload local changes to server
      const uploadResult = await this.uploadLocalChanges();
      
      // 2. Download server changes to local DB
      const downloadResult = await this.downloadServerChanges();

      this.lastSyncTime = new Date();
      this.isSyncing = false;

      this.notifyListeners({
        status: 'completed',
        message: 'Sync completed',
        lastSyncTime: this.lastSyncTime,
        changes: {
          uploaded: uploadResult.count,
          downloaded: downloadResult.count
        }
      });
      
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      
      this.isSyncing = false;
      this.notifyListeners({
        status: 'failed',
        message: `Sync failed: ${error.message}`,
        error
      });
      
      return false;
    }
  }

  /**
   * Upload local changes to server
   * @returns {Promise<{count: number, success: number, failed: number}>}
   */
  async uploadLocalChanges() {
    const pendingChanges = await sqliteService.getPendingSyncOperations();
    
    let count = 0;
    let success = 0;
    let failed = 0;

    for (const change of pendingChanges) {
      try {
        count++;
        const { entity, entityId, operation, data } = change;
        
        let endpoint, method;
        
        switch (operation) {
          case 'create':
            endpoint = `/${entity}`;
            method = 'POST';
            break;
          case 'update':
            endpoint = `/${entity}/${entityId}`;
            method = 'PUT';
            break;
          case 'delete':
            endpoint = `/${entity}/${entityId}`;
            method = 'DELETE';
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        // Send to server
        const response = await this.apiRequest(endpoint, method, data);
        
        if (response.success) {
          // Update local entity with server data if needed
          if ((operation === 'create' || operation === 'update') && response.data) {
            switch (entity) {
              case 'users':
                await sqliteService.updateUser(entityId, response.data);
                break;
              case 'schools':
                await sqliteService.updateSchool(entityId, response.data);
                break;
            }
          }
          
          // Mark as synced
          await sqliteService.updateSyncOperationStatus(change.id, 'synced');
          await sqliteService.markEntitySynced(entity, entityId);
          success++;
        } else {
          // Mark as failed
          await sqliteService.updateSyncOperationStatus(change.id, 'failed');
          failed++;
          console.error(`Failed to sync ${entity} operation:`, response);
        }
      } catch (error) {
        console.error(`Failed to sync change ${change.id}:`, error);
        await sqliteService.updateSyncOperationStatus(change.id, 'failed');
        failed++;
      }
      
      // Update progress
      this.notifyListeners({
        status: 'syncing',
        message: `Uploading changes (${count}/${pendingChanges.length})...`,
        progress: {
          current: count,
          total: pendingChanges.length
        }
      });
    }

    return { count, success, failed };
  }

  /**
   * Download server changes to local database
   * @returns {Promise<{count: number}>}
   */
  async downloadServerChanges() {
    let totalDownloaded = 0;

    // Format last sync time for the API
    const lastSync = this.lastSyncTime ? this.lastSyncTime.toISOString() : null;
    
    try {
      // 1. Sync users
      const usersResponse = await this.apiRequest(`/sync/users`, 'GET', { lastSync });
      if (usersResponse.success) {
        await this.processServerChanges('users', usersResponse.data || []);
        totalDownloaded += usersResponse.data?.length || 0;
        
        this.notifyListeners({
          status: 'syncing',
          message: `Downloaded ${usersResponse.data?.length || 0} user records`,
        });
      }

      // 2. Sync schools
      const schoolsResponse = await this.apiRequest('/sync/schools', 'GET', { lastSync });
      if (schoolsResponse.success) {
        await this.processServerChanges('schools', schoolsResponse.data || []);
        totalDownloaded += schoolsResponse.data?.length || 0;
        
        this.notifyListeners({
          status: 'syncing',
          message: `Downloaded ${schoolsResponse.data?.length || 0} school records`,
        });
      }

      return { count: totalDownloaded };
    } catch (error) {
      console.error('Error downloading changes:', error);
      throw error;
    }
  }

  /**
   * Process changes from server
   * @param {string} entity - Entity type (users, schools, etc.)
   * @param {Array} items - Array of items to process
   */
  async processServerChanges(entity, items) {
    for (const item of items) {
      try {
        switch (entity) {
          case 'users':
            const existingUser = await sqliteService.getUserById(item.id || item._id);
            const userId = item.id || item._id;
            
            // If user exists and has pending changes, don't overwrite
            if (existingUser && existingUser.syncStatus === 'pending') {
              console.log(`Skipping user ${userId} with pending changes`);
              continue;
            }
            
            if (existingUser) {
              // Update existing user
              await sqliteService.updateUser(userId, {
                ...item,
                id: userId,
                syncStatus: 'synced',
                lastSynced: new Date().toISOString()
              });
            } else {
              // Create new user
              await sqliteService.createUser({
                ...item,
                id: userId,
                syncStatus: 'synced',
                lastSynced: new Date().toISOString()
              });
            }
            break;

          case 'schools':
            const existingSchool = await sqliteService.getSchoolById(item.id || item._id);
            const schoolId = item.id || item._id;
            
            // If school exists and has pending changes, don't overwrite
            if (existingSchool && existingSchool.syncStatus === 'pending') {
              console.log(`Skipping school ${schoolId} with pending changes`);
              continue;
            }
            
            if (existingSchool) {
              // Update existing school
              await sqliteService.updateSchool(schoolId, {
                ...item,
                id: schoolId,
                syncStatus: 'synced',
                lastSynced: new Date().toISOString()
              });
            } else {
              // Create new school
              await sqliteService.createSchool({
                ...item,
                id: schoolId,
                syncStatus: 'synced',
                lastSynced: new Date().toISOString()
              });
            }
            break;
        }
      } catch (error) {
        console.error(`Error processing ${entity} item:`, error);
      }
    }
  }

  /**
   * Make API request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async apiRequest(endpoint, method, data = null) {
    if (!connectionManager.isConnected()) {
      throw new Error('Not connected to the Internet');
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = { method, headers };

    // Handle data based on method type
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      // Convert data to query string for GET requests
      const params = new URLSearchParams();
      
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      }
      
      const queryString = params.toString();
      if (queryString) {
        endpoint = `${endpoint}?${queryString}`;
      }
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
      const responseData = await response.json();
      
      if (!response.ok) {
        const error = new Error(responseData.message || 'API request failed');
        error.status = response.status;
        error.response = responseData;
        throw error;
      }
      
      return responseData;
    } catch (error) {
      console.error(`API request error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get sync status information
   * @returns {object} - Sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      isOnline: connectionManager.isConnected(),
    };
  }

  /**
   * Register listener for sync events
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove listener
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.push(callback);
    
    // Return function to remove listener
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify listeners of sync events
   * @param {object} data - Event data
   */
  notifyListeners(data) {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.listeners = [];
    this.initialized = false;
  }
}

// Create singleton instance
const syncManager = new SyncManager();
module.exports = syncManager; 