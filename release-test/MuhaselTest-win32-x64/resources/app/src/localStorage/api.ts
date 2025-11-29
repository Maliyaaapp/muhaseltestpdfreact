// Mock API service using localStorage
import { v4 as uuidv4 } from 'uuid';

// Interface for API response
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// Helper functions for localStorage
const getCollection = (collectionName: string): any[] => {
  try {
    const collection = localStorage.getItem(collectionName);
    return collection ? JSON.parse(collection) : [];
  } catch (e) {
    console.error(`Error parsing ${collectionName} from localStorage:`, e);
    return [];
  }
};

const saveCollection = (collectionName: string, data: any[]): void => {
  try {
    localStorage.setItem(collectionName, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${collectionName} to localStorage:`, e);
  }
};

// Simulate API delay
const simulateDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Schools API
export const getSchools = async (): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getCollection('schools');
    return { success: true, data: schools };
  } catch (error: unknown) {
    console.error('Error getting schools:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getSchool = async (id: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getCollection('schools');
    const school = schools.find(s => s.id === id);
    
    if (school) {
      return { success: true, data: school };
    } else {
      return { success: false, error: 'مدرسة غير موجودة' };
    }
  } catch (error: unknown) {
    console.error('Error getting school:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createSchool = async (schoolData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const schools = getCollection('schools');
    
    // Create new school with ID
    const newSchool = {
      id: uuidv4(),
      ...schoolData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    schools.push(newSchool);
    saveCollection('schools', schools);
    
    return { success: true, data: newSchool };
  } catch (error: unknown) {
    console.error('Error creating school:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Students API
export const getStudents = async (schoolId?: string, gradeLevel?: string | string[]): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let students = getCollection('students');
    
    if (schoolId) {
      students = students.filter(s => s.schoolId === schoolId);
    }
    
    if (gradeLevel) {
      if (Array.isArray(gradeLevel)) {
        students = students.filter(s => gradeLevel.includes(s.grade));
      } else {
        students = students.filter(s => s.grade === gradeLevel);
      }
    }
    
    return { success: true, data: students };
  } catch (error: unknown) {
    console.error('Error getting students:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Accounts API
export const getAccounts = async (schoolId?: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    let accounts = getCollection('accounts');
    
    if (schoolId) {
      accounts = accounts.filter(a => a.schoolId === schoolId || a.role === 'admin');
    }
    
    return { success: true, data: accounts };
  } catch (error: unknown) {
    console.error('Error getting accounts:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const createAccount = async (accountData: any): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getCollection('accounts');
    
    // Create new account with ID
    const newAccount = {
      id: uuidv4(),
      ...accountData,
      createdAt: new Date().toISOString(),
    };
    
    accounts.push(newAccount);
    saveCollection('accounts', accounts);
    
    return { 
      success: true, 
      data: {
        user: {
          uid: newAccount.id,
          email: newAccount.email,
          displayName: newAccount.name
        }
      }
    };
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const getAccount = async (id: string): Promise<ApiResponse> => {
  try {
    await simulateDelay();
    const accounts = getCollection('accounts');
    const account = accounts.find(a => a.id === id);
    
    if (account) {
      return { success: true, data: account };
    } else {
      return { success: false, error: 'حساب غير موجود' };
    }
  } catch (error: unknown) {
    console.error('Error getting account:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Batch operations
export const writeBatch = () => {
  const batch = {
    set: () => batch,
    update: () => batch,
    delete: () => batch,
    commit: async () => Promise.resolve()
  };
  return batch;
};

// Password reset
export const sendPasswordReset = async (email: string): Promise<ApiResponse> => {
  console.log(`Password reset requested for ${email}`);
  return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور' };
};

// Export function to check if email is in use
export const isEmailInUse = async (email: string): Promise<boolean> => {
  try {
    const accounts = getCollection('accounts');
    return accounts.some(a => a.email === email);
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

// Export all functions as default
const api = {
  getSchools,
  getSchool,
  createSchool,
  getStudents,
  getAccounts,
  createAccount,
  getAccount,
  writeBatch,
  sendPasswordReset,
  isEmailInUse
};

export default api; 