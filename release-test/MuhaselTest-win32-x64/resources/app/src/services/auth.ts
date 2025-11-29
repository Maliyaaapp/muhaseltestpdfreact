import { v4 as uuidv4 } from 'uuid';

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
  gradeLevels?: string[];
  createdAt: string;
}

// Constants
const ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'schoolAdmin',
  GRADE_MANAGER: 'gradeManager'
};

// Helper functions for localStorage
const getUsers = (): UserData[] => {
  try {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  } catch (e) {
    console.error('Error parsing users from localStorage:', e);
    return [];
  }
};

const saveUsers = (users: UserData[]): void => {
  try {
    localStorage.setItem('users', JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users to localStorage:', e);
  }
};

// No default users - accounts should be created through Supabase

// Current user state
let currentUser: UserData | null = null;

export const registerUser = async (
  email: string,
  password: string,
  name: string,
  role: string = ROLES.SCHOOL_ADMIN,
  schoolId?: string,
  gradeLevels?: string[]
): Promise<UserData> => {
  try {
    const users = getUsers();
    
    // Check if email already exists
    if (users.some(user => user.email === email)) {
      throw new Error('Email already in use');
    }
    
    // Create new user
    const userData: UserData = {
      id: uuidv4(),
      email,
      name,
      role,
      schoolId,
      gradeLevels,
      createdAt: new Date().toISOString()
    };
    
    // Save password in a separate object for security
    const passwords = JSON.parse(localStorage.getItem('passwords') || '{}');
    passwords[userData.id] = password;
    localStorage.setItem('passwords', JSON.stringify(passwords));
    
    // Save user
    users.push(userData);
    saveUsers(users);
    
    return userData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const loginUser = async (email: string, password: string): Promise<UserData> => {
  try {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check password
    const passwords = JSON.parse(localStorage.getItem('passwords') || '{}');
    if (passwords[user.id] !== password) {
      throw new Error('Invalid password');
    }
    
    // Set current user
    currentUser = user;
    
    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logoutUser = async (): Promise<void> => {
  currentUser = null;
};

export const getCurrentUser = async (): Promise<UserData | null> => {
  return currentUser;
};