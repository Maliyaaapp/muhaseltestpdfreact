import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, setCurrentUser, safeLogout } from '../utils/authUtils';
import { hybridApi, STORAGE_KEYS } from '../services/hybridApi';
import { recoverAccounts } from '../utils/accountUtils';
import secureStorage from '../services/secureStorage';
import storage from '../utils/storage';

// No hardcoded sample data - all accounts and schools should be created through Supabase

type Role = 'admin' | 'schoolAdmin' | 'gradeManager' | 'teacher';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  schoolPhoneWhatsapp?: string;
  schoolPhoneCall?: string;
  schoolAddress?: string;
  gradeLevels?: string[];
  username?: string;
  lastLogin?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserInfo: (user: User) => Promise<void>;
  syncAccounts: () => Promise<void>;
}

// Create a default context value
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isAuthLoading: false,
  authError: null,
  login: async () => { throw new Error('Not implemented'); },
  logout: async () => { },
  register: async () => { throw new Error('Not implemented'); },
  resetPassword: async () => { throw new Error('Not implemented'); },
  updateUserInfo: async () => { },
  syncAccounts: async () => { }
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // No hardcoded admin role enforcement needed

  // Initialize account recovery on first load
  useEffect(() => {
    try {
      // Run the recovery process to ensure all accounts are preserved
      console.log('Running account recovery during initialization');
      recoverAccounts();
    } catch (e) {
      console.error('Error running recovery during initialization:', e);
    }
  }, []);

  // Set up auth state listener
  useEffect(() => {
    // Track if component is mounted
    let isMounted = true;
    
    // Add error boundary for initialization
    try {
      console.log('Checking localStorage for user data');
      
      // Get current user from localStorage
      const currentUser = getCurrentUser();
      if (currentUser) {
        const userData: User = {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role as Role,
          schoolId: currentUser.schoolId,
          gradeLevels: currentUser.gradeLevels
        };
        
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      if (isMounted) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in auth initialization:', error);
      if (isMounted) {
        setIsLoading(false);
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Enhanced account synchronization
  const syncAccounts = async (): Promise<void> => {
    try {
      console.log('🔄 Starting account synchronization...');
      const result = await hybridApi.syncAllData();
      
      if (result.success) {
        console.log('✅ Account sync completed:', result.synced);
        // Trigger account recovery to ensure all accounts are available
        recoverAccounts();
      } else {
        console.warn('⚠️ Account sync had errors:', result.errors);
      }
    } catch (error) {
      console.error('❌ Error syncing accounts:', error);
    }
  };

  // Enhanced login with offline support
  const login = async (emailOrUsername: string, password: string): Promise<User> => {
    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
      console.log('Attempting login with:', emailOrUsername);
      
      // First, try to sync data if online
      if (navigator.onLine) {
        try {
          await hybridApi.syncAllData();
          console.log('✅ Data synced before login attempt');
        } catch (syncError) {
          console.warn('⚠️ Data sync failed, continuing with local data:', syncError);
        }
      }
      
      // Check storage for accounts
      const accounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
      console.log('Checking accounts in storage:', accounts.length);
      
      const account = accounts.find((a: any) => 
        a.email === emailOrUsername || a.username === emailOrUsername
      );
      
      if (account && (password === account.password)) {
        console.log('Login successful with account from storage:', account.email);
        
        const userData: User = {
          id: account.id,
          name: account.name,
          email: account.email,
          role: account.role as Role,
          schoolId: account.schoolId,
          schoolName: account.schoolName,
          schoolLogo: account.schoolLogo,
          schoolEmail: account.schoolEmail,
          schoolPhone: account.schoolPhone,
          schoolAddress: account.schoolAddress,
          username: account.username,
          lastLogin: new Date().toISOString(),
          gradeLevels: account.gradeLevels
        };
        
        // Store in localStorage
        setCurrentUser(userData);
        
        // Cache user session for offline use
        hybridApi.cacheUserSession(userData);
        
        // Update last login (only if online)
        if (navigator.onLine) {
          try {
            await hybridApi.updateLastLogin(account.id);
          } catch (e) {
            console.warn('Failed to update last login, but login continues:', e);
          }
        }
        
        setUser(userData);
        setIsAuthenticated(true);
        return userData;
      }
      
      // If local login fails and we're offline, check cached session
      if (!navigator.onLine) {
        const cachedUser = hybridApi.getCachedUserSession();
        if (cachedUser && (cachedUser.email === emailOrUsername || cachedUser.username === emailOrUsername)) {
          console.log('✅ Using cached session for offline login');
          setUser(cachedUser);
          setIsAuthenticated(true);
          return cachedUser;
        }
        throw new Error('تسجيل الدخول غير متاح في وضع عدم الاتصال. يرجى التأكد من تسجيل الدخول عبر الإنترنت مرة واحدة على الأقل.');
      }
      
      throw new Error('بيانات تسجيل الدخول غير صحيحة');
    } catch (error: any) {
      const errorMessage = error.message || 'حدث خطأ أثناء تسجيل الدخول';
      setAuthError(errorMessage);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout implementation
  const logout = async (): Promise<void> => {
    try {
      const rememberMe = secureStorage.getRememberMe();
      const rememberPassword = secureStorage.getRememberPassword();
      const staySignedIn = secureStorage.getStaySignedIn();

      // Always clear Stay Signed In
      secureStorage.setStaySignedIn(false);

      if (staySignedIn) {
        // Do nothing, user will be auto-logged in
      } else if (rememberMe && rememberPassword) {
        // Do nothing, keep both email and password
      } else if (rememberMe) {
        // Only clear the password, keep the email/username
        secureStorage.clearPasswordOnly();
      } else {
        // Clear all credentials
        secureStorage.clearCredentials();
      }

      // Use safe logout which preserves important data
      safeLogout();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      setAuthError(null);
      console.log('Logout completed, Remember Me:', rememberMe, 'Remember Password:', rememberPassword, 'Stay Signed In:', staySignedIn);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Update user info
  const updateUserInfo = async (updatedUser: User) => {
    try {
      // Update user in state
      setUser(updatedUser);
      
      // Update user in localStorage
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error updating user info:', error);
    }
  };

  // Register new user (not implemented for now)
  const register = async (username: string, email: string, password: string): Promise<User> => {
    throw new Error('Registration is disabled in demo mode');
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await api.sendPasswordReset(email);
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isAuthLoading,
      authError,
      login,
      logout,
      register,
      resetPassword,
      updateUserInfo,
      syncAccounts
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
 