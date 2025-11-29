/**
 * Authentication utilities using localStorage for user management
 */
import { STORAGE_KEYS } from '../services/hybridApi';
import storage, { safeClearStorage } from '../utils/storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  schoolId?: string;
  gradeLevels?: string[];
}

// Keys that should be removed on logout but without clearing all data
const SESSION_AUTH_KEYS = [
  'currentUser', 
  'authToken', 
  'session',
  'firebase:authUser:AIzaSyA5xFSJtKRizitssb2dtmNOiKLkg8iwLG8:[DEFAULT]'
];

// Get the currently logged-in user from localStorage
export const getCurrentUser = (): User | null => {
  try {
    const user = storage.get('currentUser');
    if (!user) return null;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Set the current user in localStorage
export const setCurrentUser = (user: User | null): void => {
  if (user) {
    storage.set('currentUser', user);
  } else {
    storage.remove('currentUser');
  }
};

// Check if a user has a specific role
export const hasRole = (user: User | null, role: string): boolean => {
  if (!user) return false;
  return user.role === role;
};

// Check if the user can access a specific grade level
export const canAccessGradeLevel = (user: User | null, gradeLevel: string): boolean => {
  if (!user) return false;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // School admin can access all grades in their school
  if (user.role === 'schoolAdmin') return true;
  
  // Grade manager can only access specified grades
  if (user.role === 'gradeManager' && user.gradeLevels) {
    // Exact match
    if (user.gradeLevels.includes(gradeLevel)) {
      return true;
    }
    
    // Special handling for KG grades
    const isTargetKG = gradeLevel.includes('الروضة') || 
                      gradeLevel.includes('التمهيدي') || 
                      gradeLevel.toLowerCase().includes('kg');
    
    if (isTargetKG) {
      // Check for KG1
      if ((gradeLevel === 'الروضة KG1' || gradeLevel.toLowerCase().includes('kg1')) && 
          user.gradeLevels.some(g => 
            g === 'الروضة KG1' || 
            g.toLowerCase().includes('kg1') && !g.toLowerCase().includes('kg2')
          )) {
        console.log(`Grade level access granted: "${gradeLevel}" matched with user grade levels`);
        return true;
      }
      
      // Check for KG2/التمهيدي
      if ((gradeLevel === 'التمهيدي KG2' || gradeLevel.toLowerCase().includes('kg2') || gradeLevel.includes('التمهيدي')) && 
          user.gradeLevels.some(g => g === 'التمهيدي KG2' || g.toLowerCase().includes('kg2') || g.includes('التمهيدي'))) {
        return true;
      }
    }
    
    return false;
  }
  
  return false;
};

// Login function using localStorage
export const login = async (email: string, password: string): Promise<User> => {
  // Delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Get accounts from storage
    const accounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
    
    // Find account with matching email and password
    const account = accounts.find((acc: any) => 
      acc.email === email && acc.password === password
    );
    
    if (!account) {
      throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    
    // Create user object
    const user: User = {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      schoolId: account.schoolId,
      gradeLevels: account.gradeLevels
    };
    
    // Store current user in storage
    setCurrentUser(user);
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Legacy logout function - keeps important data
export const logout = async (): Promise<void> => {
  // Use the safeClearStorage function which preserves important data
  // but only removes the currentUser and auth-related data
  safeClearStorage();
};

// Safe logout that uses session clear - preserves all important data 
// but clears authentication state and session data
export const safeLogout = async (): Promise<void> => {
  // Use the improved safeClearStorage function which:
  // 1. Preserves accounts, schools, and other important data
  // 2. Only removes session data and authentication tokens
  // 3. Works safely in both browser and Electron environments
  safeClearStorage();
};

// Cleanup auth accounts function - for removing orphaned or problematic accounts
export const cleanupAuthAccounts = async (): Promise<{success: boolean, message: string}> => {
  try {
    // In the storage implementation, we just check for consistency
    // between accounts and other data structures
    const accounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
    const schools = storage.get(STORAGE_KEYS.SCHOOLS) || [];
    
    // Find accounts with invalid school IDs
    const schoolIds = new Set(schools.map((school: any) => school.id));
    const invalidAccounts = accounts.filter((account: any) => 
      account.schoolId && !schoolIds.has(account.schoolId)
    );
    
    if (invalidAccounts.length > 0) {
      // Remove accounts with invalid school IDs
      const validAccounts = accounts.filter((account: any) => 
        !account.schoolId || schoolIds.has(account.schoolId)
      );
      
      storage.set(STORAGE_KEYS.ACCOUNTS, validAccounts);
      
      return {
        success: true,
        message: `تم تنظيف ${invalidAccounts.length} حسابات غير صالحة`
      };
    }
    
    return {
      success: true,
      message: 'لم يتم العثور على حسابات تحتاج للتنظيف'
    };
  } catch (error) {
    console.error('Error cleaning up auth accounts:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تنظيف الحسابات'
    };
  }
};

// Export all auth utilities
export default {
  getCurrentUser,
  setCurrentUser,
  hasRole,
  canAccessGradeLevel,
  login,
  logout,
  safeLogout,
  cleanupAuthAccounts
};