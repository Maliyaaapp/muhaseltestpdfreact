const { contextBridge, ipcRenderer } = require('electron');
const sqliteService = require('./src/services/offline/sqlite-service');
const connectionManager = require('./src/services/offline/connection-manager');
const syncManager = require('./src/services/offline/sync-manager');
const hybridApi = require('./src/services/offline/hybrid-api');

// Initialize services with API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Expose API to renderer process
contextBridge.exposeInMainWorld('hybridApi', {
  // Authentication
  auth: {
    login: async (credentials) => hybridApi.request('/auth/login', 'POST', credentials),
    logout: async () => hybridApi.request('/auth/logout', 'POST'),
    me: async () => hybridApi.request('/auth/me', 'GET'),
    getCurrentUser: () => hybridApi.getCurrentUser()
  },
  
  // Users
  users: {
    getAll: async () => hybridApi.request('/users', 'GET'),
    getById: async (id) => hybridApi.request(`/users/${id}`, 'GET'),
    create: async (userData) => hybridApi.request('/users', 'POST', userData),
    update: async (id, userData) => hybridApi.request(`/users/${id}`, 'PUT', userData),
    delete: async (id) => hybridApi.request(`/users/${id}`, 'DELETE')
  },
  
  // Schools
  schools: {
    getAll: async () => hybridApi.request('/schools', 'GET'),
    getById: async (id) => hybridApi.request(`/schools/${id}`, 'GET'),
    create: async (schoolData) => hybridApi.request('/schools', 'POST', schoolData),
    update: async (id, schoolData) => hybridApi.request(`/schools/${id}`, 'PUT', schoolData),
    delete: async (id) => hybridApi.request(`/schools/${id}`, 'DELETE')
  },
  
  // Sync
  sync: {
    getStatus: () => syncManager.getStatus(),
    syncNow: () => syncManager.syncNow(),
    addListener: (callback) => {
      const removeListener = syncManager.addListener(callback);
      return () => removeListener();
    }
  },
  
  // Connection
  connection: {
    isOnline: () => connectionManager.isConnected(),
    addListener: (callback) => {
      const removeListener = connectionManager.addListener(callback);
      return () => removeListener();
    }
  }
});

// Initialize services when preload script runs
(async function initialize() {
  try {
    // Initialize SQLite database
    await sqliteService.initialize();
    console.log('SQLite database initialized');
    
    // Initialize API service
    hybridApi.initialize(API_BASE_URL);
    console.log('Hybrid API service initialized');
    
    // Tell the main process that offline services are ready
    ipcRenderer.send('offline-services-ready');
  } catch (error) {
    console.error('Failed to initialize offline services:', error);
    ipcRenderer.send('offline-services-error', error.message);
  }
})(); 