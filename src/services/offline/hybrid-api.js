const connectionManager = require('./connection-manager');
const sqliteService = require('./sqlite-service');
const syncManager = require('./sync-manager');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Hybrid API Service
 * Provides a unified API interface for both online and offline operations
 */
class HybridApiService {
  constructor() {
    this.apiBaseUrl = null;
    this.token = null;
    this.currentUser = null;
    this.initialized = false;
  }

  /**
   * Initialize the API service
   * @param {string} apiBaseUrl - Base URL for API requests
   */
  initialize(apiBaseUrl) {
    if (this.initialized) return;

    this.apiBaseUrl = apiBaseUrl || 'http://localhost:5000/api';
    
    // Initialize dependencies
    connectionManager.initialize(this.apiBaseUrl);
    syncManager.initialize(this.apiBaseUrl);
    
    this.initialized = true;
    console.log('Hybrid API service initialized with base URL:', this.apiBaseUrl);
  }

  /**
   * Set authentication token
   * @param {string} token - JWT token
   * @param {object} user - User object from authentication
   */
  setAuthToken(token, user) {
    this.token = token;
    this.currentUser = user;
    syncManager.setAuthToken(token);
    
    console.log('Auth token updated in hybrid API service');
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.token = null;
    this.currentUser = null;
    syncManager.setAuthToken(null);
    
    console.log('Auth token cleared from hybrid API service');
  }

  /**
   * Get current user information
   * @returns {object|null} - Current user object or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Execute API request with online/offline handling
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async request(endpoint, method, data = null) {
    // Check if API service is initialized
    if (!this.initialized) {
      this.initialize();
    }

    // Special handling for authentication endpoints
    if (endpoint.startsWith('/auth')) {
      return this.handleAuthRequest(endpoint, method, data);
    }

    // For other endpoints, try online first if connected
    const isOnline = connectionManager.isConnected();
    
    if (isOnline) {
      try {
        // Try online request
        const response = await this.onlineRequest(endpoint, method, data);
        return response;
      } catch (error) {
        console.error('Online request failed, falling back to offline:', error);
        
        // If online fails, fall back to offline
        return this.offlineRequest(endpoint, method, data);
      }
    } else {
      // Offline mode
      console.log('Operating in offline mode');
      return this.offlineRequest(endpoint, method, data);
    }
  }

  /**
   * Handle authentication-specific requests
   * @param {string} endpoint - Auth endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async handleAuthRequest(endpoint, method, data) {
    // For login, always try online first
    if (endpoint === '/auth/login' && connectionManager.isConnected()) {
      try {
        const response = await this.onlineRequest(endpoint, method, data);
        
        // If login successful, store user data for offline use
        if (response.success && response.data && response.data.user && response.data.token) {
          await this.storeUserForOffline(response.data.user, response.data.token);
          this.setAuthToken(response.data.token, response.data.user);
        }
        
        return response;
      } catch (error) {
        console.error('Online login failed, trying offline login:', error);
        return this.handleOfflineLogin(data);
      }
    } else if (endpoint === '/auth/login') {
      // Offline login
      return this.handleOfflineLogin(data);
    } else if (endpoint === '/auth/me') {
      // Get current user - return from memory if available
      if (this.currentUser) {
        return {
          success: true,
          data: this.currentUser
        };
      }
      
      // Otherwise try to get from local storage or return error
      if (this.token) {
        try {
          const userId = this.extractUserIdFromToken(this.token);
          if (userId) {
            const user = await sqliteService.getUserById(userId);
            if (user) {
              delete user.password; // Never send password
              return {
                success: true,
                data: user
              };
            }
          }
        } catch (error) {
          console.error('Error getting user from token:', error);
        }
      }
      
      return {
        success: false,
        message: 'Not authenticated'
      };
    } else if (endpoint === '/auth/logout') {
      // Logout - clear token and return success
      this.clearAuthToken();
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
    
    // Other auth endpoints - try online if possible
    if (connectionManager.isConnected()) {
      return this.onlineRequest(endpoint, method, data);
    } else {
      return {
        success: false,
        message: 'Operation not available in offline mode'
      };
    }
  }

  /**
   * Handle offline login
   * @param {object} credentials - Login credentials
   * @returns {Promise<object>} - Login response
   */
  async handleOfflineLogin(credentials) {
    try {
      await sqliteService.initialize();
      
      const { emailOrUsername, password } = credentials;
      
      if (!emailOrUsername || !password) {
        return {
          success: false,
          message: 'Email/username and password are required'
        };
      }
      
      // Find user in local database
      const user = await sqliteService.findUserByCredentials(emailOrUsername);
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
      
      // Generate offline token
      const offlineToken = `offline_${uuidv4()}_${user.id}`;
      
      // Update user's last login
      const timestamp = new Date().toISOString();
      await sqliteService.updateUser(user.id, {
        lastLogin: timestamp
      });
      
      // Extract user data without password
      const userData = { ...user };
      delete userData.password;
      
      // Set token in memory
      this.setAuthToken(offlineToken, userData);
      
      return {
        success: true,
        data: {
          token: offlineToken,
          user: userData
        },
        offline: true
      };
    } catch (error) {
      console.error('Offline login error:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  /**
   * Store user data for offline use
   * @param {object} user - User object
   * @param {string} token - JWT token
   */
  async storeUserForOffline(user, token) {
    try {
      await sqliteService.initialize();
      
      const userId = user.id || user._id;
      
      // Check if user already exists in local database
      const existingUser = await sqliteService.getUserById(userId);
      
      if (existingUser) {
        // Update existing user
        await sqliteService.updateUser(userId, {
          ...user,
          id: userId,
          syncStatus: 'synced',
          lastSynced: new Date().toISOString()
        });
      } else {
        // Create new user
        await sqliteService.createUser({
          ...user,
          id: userId,
          syncStatus: 'synced',
          lastSynced: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error storing user for offline use:', error);
    }
  }

  /**
   * Extract user ID from token
   * @param {string} token - JWT or offline token
   * @returns {string|null} - User ID or null if invalid
   */
  extractUserIdFromToken(token) {
    if (!token) return null;
    
    // Handle offline token format: offline_<uuid>_<userId>
    if (token.startsWith('offline_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        return parts[2];
      }
      return null;
    }
    
    // TODO: For JWT tokens, implement proper decoding
    // This is a simplified version - in production you would use jwt.decode
    try {
      // Very basic JWT parsing - don't use in production
      const payload = token.split('.')[1];
      if (!payload) return null;
      
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      return decodedPayload.id || decodedPayload.userId || decodedPayload.sub;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      return null;
    }
  }

  /**
   * Make online API request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async onlineRequest(endpoint, method, data) {
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
      console.error(`Online API request error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Handle offline API request
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async offlineRequest(endpoint, method, data) {
    try {
      await sqliteService.initialize();
      
      // Parse endpoint to determine the entity and operation
      const parts = endpoint.split('/').filter(p => p);
      
      if (parts.length === 0) {
        throw new Error('Invalid endpoint');
      }
      
      const entity = parts[0];
      const id = parts.length > 1 ? parts[1] : null;
      
      // Handle different entity types
      switch (entity) {
        case 'users':
          return this.handleOfflineUserRequest(id, method, data);
        case 'schools':
          return this.handleOfflineSchoolRequest(id, method, data);
        case 'sync':
          return this.handleOfflineSyncRequest(parts[1], method, data);
        default:
          throw new Error(`Offline operation not supported for endpoint: ${endpoint}`);
      }
    } catch (error) {
      console.error(`Offline request error (${method} ${endpoint}):`, error);
      return {
        success: false,
        message: error.message || 'Offline operation failed'
      };
    }
  }

  /**
   * Handle offline user requests
   * @param {string|null} id - User ID or null for collection operations
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async handleOfflineUserRequest(id, method, data) {
    switch (method) {
      case 'GET':
        if (id) {
          // Get single user
          const user = await sqliteService.getUserById(id);
          
          if (!user) {
            return {
              success: false,
              message: 'User not found'
            };
          }
          
          // Remove sensitive data
          const userData = { ...user };
          delete userData.password;
          
          return {
            success: true,
            data: userData
          };
        } else {
          // Get all users (with filtering)
          // Apply role-based filtering - only show users from same school for schoolAdmin
          let filter = {};
          
          if (this.currentUser && this.currentUser.role !== 'admin') {
            filter.schoolId = this.currentUser.schoolId;
          }
          
          // Apply additional filters from request data
          if (data) {
            filter = { ...filter, ...data };
          }
          
          const users = await sqliteService.getUsers(filter);
          
          // Remove sensitive data
          const safeUsers = users.map(user => {
            const userData = { ...user };
            delete userData.password;
            return userData;
          });
          
          return {
            success: true,
            count: safeUsers.length,
            data: safeUsers
          };
        }

      case 'POST':
        // Create user
        // Verify permissions
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.role !== 'schoolAdmin')) {
          return {
            success: false,
            message: 'Not authorized to create users'
          };
        }
        
        // Enforce schoolId for non-admin users
        if (this.currentUser.role !== 'admin') {
          data.schoolId = this.currentUser.schoolId;
        }
        
        // Hash password
        if (data.password) {
          const salt = await bcrypt.genSalt(10);
          data.password = await bcrypt.hash(data.password, salt);
        }
        
        const newUser = await sqliteService.createUser(data);
        
        // Remove sensitive data
        const newUserData = { ...newUser };
        delete newUserData.password;
        
        return {
          success: true,
          data: newUserData
        };

      case 'PUT':
        // Update user
        // Verify permissions
        if (!this.currentUser) {
          return {
            success: false,
            message: 'Authentication required'
          };
        }
        
        // Only allow updates to own user or if admin/schoolAdmin
        if (
          this.currentUser.id !== id && 
          this.currentUser.role !== 'admin' && 
          (this.currentUser.role !== 'schoolAdmin' || this.currentUser.schoolId !== data.schoolId)
        ) {
          return {
            success: false,
            message: 'Not authorized to update this user'
          };
        }
        
        // Non-admin can't change role
        if (this.currentUser.role !== 'admin' && data.role) {
          delete data.role;
        }
        
        // Hash password if included
        if (data.password) {
          const salt = await bcrypt.genSalt(10);
          data.password = await bcrypt.hash(data.password, salt);
        }
        
        const updatedUser = await sqliteService.updateUser(id, data);
        
        // Remove sensitive data
        const updatedUserData = { ...updatedUser };
        delete updatedUserData.password;
        
        return {
          success: true,
          data: updatedUserData
        };

      case 'DELETE':
        // Delete user
        // Verify admin permissions
        if (!this.currentUser || this.currentUser.role !== 'admin') {
          return {
            success: false,
            message: 'Not authorized to delete users'
          };
        }
        
        await sqliteService.deleteUser(id);
        
        return {
          success: true,
          message: 'User deleted successfully'
        };

      default:
        throw new Error(`Unsupported method for users: ${method}`);
    }
  }

  /**
   * Handle offline school requests
   * @param {string|null} id - School ID or null for collection operations
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async handleOfflineSchoolRequest(id, method, data) {
    switch (method) {
      case 'GET':
        if (id) {
          // Get single school
          const school = await sqliteService.getSchoolById(id);
          
          if (!school) {
            return {
              success: false,
              message: 'School not found'
            };
          }
          
          // Verify permissions - non-admin can only view their own school
          if (
            this.currentUser && 
            this.currentUser.role !== 'admin' && 
            this.currentUser.schoolId !== id
          ) {
            return {
              success: false,
              message: 'Not authorized to access this school'
            };
          }
          
          return {
            success: true,
            data: school
          };
        } else {
          // Get all schools (with filtering)
          let filter = {};
          
          // Apply role-based filtering - non-admin can only see their school
          if (this.currentUser && this.currentUser.role !== 'admin') {
            filter.id = this.currentUser.schoolId;
          }
          
          // Apply additional filters from request data
          if (data) {
            filter = { ...filter, ...data };
          }
          
          const schools = await sqliteService.getSchools(filter);
          
          return {
            success: true,
            count: schools.length,
            data: schools
          };
        }

      case 'POST':
        // Create school
        // Verify admin permissions
        if (!this.currentUser || this.currentUser.role !== 'admin') {
          return {
            success: false,
            message: 'Not authorized to create schools'
          };
        }
        
        const newSchool = await sqliteService.createSchool(data);
        
        return {
          success: true,
          data: newSchool
        };

      case 'PUT':
        // Update school
        // Verify permissions
        if (!this.currentUser) {
          return {
            success: false,
            message: 'Authentication required'
          };
        }
        
        // Only admin can update any school, schoolAdmin can update only their own
        if (
          this.currentUser.role !== 'admin' && 
          (this.currentUser.role !== 'schoolAdmin' || this.currentUser.schoolId !== id)
        ) {
          return {
            success: false,
            message: 'Not authorized to update this school'
          };
        }
        
        const updatedSchool = await sqliteService.updateSchool(id, data);
        
        return {
          success: true,
          data: updatedSchool
        };

      case 'DELETE':
        // Delete school
        // Verify admin permissions
        if (!this.currentUser || this.currentUser.role !== 'admin') {
          return {
            success: false,
            message: 'Not authorized to delete schools'
          };
        }
        
        await sqliteService.deleteSchool(id);
        
        return {
          success: true,
          message: 'School deleted successfully'
        };

      default:
        throw new Error(`Unsupported method for schools: ${method}`);
    }
  }

  /**
   * Handle offline sync requests
   * @param {string} entity - Entity type (users, schools, etc.)
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   * @returns {Promise<object>} - Response data
   */
  async handleOfflineSyncRequest(entity, method, data) {
    // In offline mode, sync requests can only return local data
    // These endpoints will be used when connection is restored
    
    return {
      success: false,
      message: 'Sync operations not available in offline mode'
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    connectionManager.destroy();
    syncManager.destroy();
    this.initialized = false;
    this.token = null;
    this.currentUser = null;
  }
}

// Create singleton instance
const hybridApi = new HybridApiService();
module.exports = hybridApi; 