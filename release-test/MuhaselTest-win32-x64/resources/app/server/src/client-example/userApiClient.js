/**
 * Example client for the User Management API
 * 
 * This file demonstrates how to call the backend API endpoints
 * for user management instead of directly using Supabase client
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000/api/users';
let authToken = null;
let apiKey = null;

/**
 * Set the authentication token for authenticated requests
 * @param {string} token - JWT token from Supabase Auth
 */
function setAuthToken(token) {
  authToken = token;
}

/**
 * Set the API key for API key authenticated requests
 * @param {string} key - API key for server-to-server communication
 */
function setApiKey(key) {
  apiKey = key;
}

/**
 * Create a new user through the backend API
 * @param {Object} userData - User data including email, password, username, name, role
 * @returns {Promise<Object>} - Created user data
 */
async function createUser(userData) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create user');
    }
    
    return data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get a user by ID
 * @param {string} userId - User ID to retrieve
 * @returns {Promise<Object>} - User data
 */
async function getUser(userId) {
  try {
    const headers = {};
    
    // Add authentication if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Update a user
 * @param {string} userId - User ID to update
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Updated user data
 */
async function updateUser(userId, userData) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user');
    }
    
    return data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete a user
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} - Response data
 */
async function deleteUser(userId) {
  try {
    const headers = {};
    
    // Add authentication if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'DELETE',
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }
    
    return data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// Export the API client functions
export {
  setAuthToken,
  setApiKey,
  createUser,
  getUser,
  updateUser,
  deleteUser
};