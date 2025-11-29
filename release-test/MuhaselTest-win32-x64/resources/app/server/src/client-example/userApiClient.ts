/**
 * Example TypeScript client for the User Management API
 * 
 * This file demonstrates how to call the backend API endpoints
 * for user management instead of directly using Supabase client
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000/api/users';
let authToken: string | null = null;
let apiKey: string | null = null;

// User interfaces
interface UserData {
  email: string;
  password?: string;
  username: string;
  name: string;
  role: 'user' | 'admin' | 'superadmin';
}

interface User extends Omit<UserData, 'password'> {
  id: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

interface UserResponse extends ApiResponse {
  user: User;
}

interface UsersResponse extends ApiResponse {
  users: User[];
}

/**
 * Set the authentication token for authenticated requests
 * @param token - JWT token from Supabase Auth
 */
export function setAuthToken(token: string): void {
  authToken = token;
}

/**
 * Set the API key for API key authenticated requests
 * @param key - API key for server-to-server communication
 */
export function setApiKey(key: string): void {
  apiKey = key;
}

/**
 * Get headers for API requests
 * @param includeContentType - Whether to include Content-Type header
 * @returns Headers object
 */
function getHeaders(includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }
  
  return headers;
}

/**
 * Create a new user through the backend API
 * @param userData - User data including email, password, username, name, role
 * @returns Created user data
 */
export async function createUser(userData: UserData): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create user');
    }
    
    return data as UserResponse;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get a user by ID
 * @param userId - User ID to retrieve
 * @returns User data
 */
export async function getUser(userId: string): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get user');
    }
    
    return data as UserResponse;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get all users
 * @returns List of users
 */
export async function getAllUsers(): Promise<UsersResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to get users');
    }
    
    return data as UsersResponse;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Update a user
 * @param userId - User ID to update
 * @param userData - Updated user data
 * @returns Updated user data
 */
export async function updateUser(userId: string, userData: Partial<UserData>): Promise<UserResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update user');
    }
    
    return data as UserResponse;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete a user
 * @param userId - User ID to delete
 * @returns Response data
 */
export async function deleteUser(userId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }
    
    return data as ApiResponse;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}