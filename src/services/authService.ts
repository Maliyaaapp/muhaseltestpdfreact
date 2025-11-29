import { v4 as uuidv4 } from 'uuid';

export interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'schoolAdmin' | 'gradeManager';
  schoolId?: string;
  schoolName?: string;
  gradeLevels?: string[];
  createdAt: string;
}

export const registerUser = async (
  email: string,
  password: string,
  name: string,
  role: UserData['role'] = 'schoolAdmin',
  schoolId?: string,
  gradeLevels?: string[]
): Promise<UserData> => {
  try {
    // Check if user already exists
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const existingAccount = accounts.find((acc: any) => acc.email === email);
    
    if (existingAccount) {
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }

    // Create a new user ID
    const uid = uuidv4();

    // Create user data
    const userData: UserData = {
      uid,
      email,
      name,
      role,
      schoolId,
      gradeLevels,
      createdAt: new Date().toISOString()
    };

    // Create account object
    const account = {
      id: uid,
      email,
      password,
      name,
      username: email,
      role,
      schoolId: schoolId || '',
      gradeLevels: gradeLevels || [],
      lastLogin: null
    };

    // Add to accounts in localStorage
    accounts.push(account);
    localStorage.setItem('accounts', JSON.stringify(accounts));
    
    // Set current user
    localStorage.setItem('currentUser', JSON.stringify(userData));

    return userData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const loginUser = async (email: string, password: string): Promise<UserData> => {
  try {
    // Get accounts from localStorage
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    
    // Find account with matching email and password
    const account = accounts.find((acc: any) => 
      acc.email === email && acc.password === password
    );
    
    if (!account) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    
    // Create user data
    const userData: UserData = {
      uid: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      schoolId: account.schoolId,
      schoolName: account.schoolName,
      gradeLevels: account.gradeLevels,
      createdAt: account.createdAt || new Date().toISOString()
    };
    
    // Update last login
    const updatedAccounts = accounts.map((acc: any) => {
      if (acc.id === account.id) {
        return {
          ...acc,
          lastLogin: new Date().toISOString()
        };
      }
      return acc;
    });
    
    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    
    // Set current user
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    return userData;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    // Clear current user from localStorage
    localStorage.removeItem('currentUser');
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<UserData | null> => {
  try {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    
    return JSON.parse(userJson) as UserData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}; 