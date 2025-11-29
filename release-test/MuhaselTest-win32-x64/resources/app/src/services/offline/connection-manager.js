/**
 * Connection Manager Service
 * Manages online/offline status detection and notifications
 */
class ConnectionManager {
  constructor() {
    this.isOnline = true; // Assume online until checked
    this.listeners = [];
    this.checkInterval = null;
    this.apiUrl = null;
    this.initialized = false;
  }

  /**
   * Initialize the connection manager
   * @param {string} apiUrl - The API endpoint to ping for connectivity check
   */
  initialize(apiUrl) {
    if (this.initialized) return;

    this.apiUrl = apiUrl || 'http://localhost:5000/api';
    this.isOnline = navigator.onLine;

    // Set up event listeners for online/offline events
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));

    // Periodically check actual connection to API
    this.checkInterval = setInterval(() => this.checkConnection(), 30000);

    // Initial connection check
    this.checkConnection();
    this.initialized = true;

    console.log('Connection manager initialized, current status:', this.isOnline ? 'online' : 'offline');
  }

  /**
   * Handle connection status change
   * @param {boolean} isOnline - Whether the connection is online
   */
  handleConnectionChange(isOnline) {
    if (this.isOnline !== isOnline) {
      console.log(`Connection status changed: ${isOnline ? 'online' : 'offline'}`);
      this.isOnline = isOnline;
      this.notifyListeners();
    }
  }

  /**
   * Check actual connection to API server
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.apiUrl}`, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store',
        timeout: 5000
      });

      this.handleConnectionChange(response.ok);
    } catch (error) {
      this.handleConnectionChange(false);
    }
  }

  /**
   * Force an immediate connection check
   * @returns {Promise<boolean>} - Whether the connection is online
   */
  async checkNow() {
    await this.checkConnection();
    return this.isOnline;
  }

  /**
   * Get current connection status
   * @returns {boolean} - Whether the connection is online
   */
  isConnected() {
    return this.isOnline;
  }

  /**
   * Register a listener for connection status changes
   * @param {Function} callback - Function to call when connection status changes
   * @returns {Function} - Function to call to remove the listener
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
   * Notify all listeners of connection status change
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('online', this.handleConnectionChange);
    window.removeEventListener('offline', this.handleConnectionChange);

    this.listeners = [];
    this.initialized = false;
  }
}

// Create singleton instance
const connectionManager = new ConnectionManager();
module.exports = connectionManager; 