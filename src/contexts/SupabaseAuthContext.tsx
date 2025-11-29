import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import * as supabaseAuthService from '../services/supabaseAuthService';
import { shouldUseSupabase } from '../services/supabase';

type Role = 'admin' | 'schoolAdmin' | 'gradeManager';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string;
  gradeLevels?: string[];
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (email: string, name: string, password: string, role?: Role, schoolId?: string, gradeLevels?: string[]) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserInfo: (user: Partial<User>) => Promise<void>;
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
  updateUserInfo: async () => { }
};

const SupabaseAuthContext = createContext<AuthContextType>(defaultAuthContext);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Check if Supabase is configured and online
  const isSupabaseAvailable = shouldUseSupabase();

  // Set up auth state listener
  useEffect(() => {
    if (!isSupabaseAvailable) {
      setIsLoading(false);
      return;
    }

    // Track if component is mounted
    let isMounted = true;
    
    // Add error boundary for initialization
    try {
      console.log('Checking Supabase for user session');
      
      // Get current user from Supabase
      const fetchUser = async () => {
        try {
          const userData = await supabaseAuthService.getCurrentUser();
          
          if (userData && isMounted) {
            setUser({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              schoolId: userData.schoolId,
              schoolName: userData.schoolName,
              schoolLogo: userData.schoolLogo,
              gradeLevels: userData.gradeLevels,
              lastLogin: userData.lastLogin
            });
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };
      
      fetchUser();
      
      // Subscribe to auth changes
      const { data: { subscription } } = supabaseAuthService.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            const userData = await supabaseAuthService.getCurrentUser();
            if (userData && isMounted) {
              setUser({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                schoolId: userData.schoolId,
                schoolName: userData.schoolName,
                schoolLogo: userData.schoolLogo,
                gradeLevels: userData.gradeLevels,
                lastLogin: userData.lastLogin
              });
              setIsAuthenticated(true);
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      );
      
      // Cleanup function
      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error in auth initialization:', error);
      if (isMounted) {
        setIsLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }
  }, [isSupabaseAvailable]);

  // Login implementation using Supabase
  const login = async (email: string, password: string): Promise<User> => {
    if (!isSupabaseAvailable) {
      throw new Error('Supabase is not available. Please check your internet connection.');
    }

    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
      console.log('Attempting login with:', email);
      
      const userData = await supabaseAuthService.loginUser(email, password);
      
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        schoolId: userData.schoolId,
        schoolName: userData.schoolName,
        schoolLogo: userData.schoolLogo,
        gradeLevels: userData.gradeLevels,
        lastLogin: userData.lastLogin
      };
      
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error: any) {
      setAuthError(error.message || 'حدث خطأ أثناء تسجيل الدخول');
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Logout implementation
  const logout = async (): Promise<void> => {
    try {
      // Only try to logout from Supabase if we're online and Supabase is available
      if (navigator.onLine && isSupabaseAvailable) {
        try {
          await supabaseAuthService.logoutUser();
        } catch (error) {
          console.warn('Failed to logout from Supabase, but continuing with local logout:', error);
        }
      }
      
      // Always perform local logout regardless of online status
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, ensure local state is cleared
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    }
  };

  // Register implementation
  const register = async (
    email: string, 
    name: string, 
    password: string, 
    role: Role = 'schoolAdmin',
    schoolId?: string,
    gradeLevels?: string[]
  ): Promise<User> => {
    if (!isSupabaseAvailable) {
      throw new Error('Supabase is not available. Please check your internet connection.');
    }

    setIsAuthLoading(true);
    setAuthError(null);
    
    try {
      const userData = await supabaseAuthService.registerUser(
        email,
        password,
        name,
        role,
        schoolId,
        gradeLevels
      );
      
      const user: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        schoolId: userData.schoolId,
        schoolName: userData.schoolName,
        schoolLogo: userData.schoolLogo,
        gradeLevels: userData.gradeLevels,
        lastLogin: userData.lastLogin
      };
      
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error: any) {
      setAuthError(error.message || 'حدث خطأ أثناء التسجيل');
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    if (!isSupabaseAvailable) {
      throw new Error('Supabase is not available. Please check your internet connection.');
    }

    try {
      await supabaseAuthService.resetPassword(email);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  };

  // Update user info
  const updateUserInfo = async (updatedUser: Partial<User>) => {
    if (!isSupabaseAvailable) {
      throw new Error('Supabase is not available. Please check your internet connection.');
    }

    try {
      if (!user) throw new Error('No user is logged in');
      
      const userData = await supabaseAuthService.updateUserProfile({
        name: updatedUser.name,
        role: updatedUser.role as any,
        schoolId: updatedUser.schoolId,
        gradeLevels: updatedUser.gradeLevels
      });
      
      const updatedUserData: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        schoolId: userData.schoolId,
        schoolName: userData.schoolName,
        schoolLogo: userData.schoolLogo,
        gradeLevels: userData.gradeLevels,
        lastLogin: userData.lastLogin
      };
      
      setUser(updatedUserData);
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      isAuthenticated,
      isAuthLoading,
      authError,
      login,
      logout,
      register,
      resetPassword,
      updateUserInfo
    }}>
      {!isLoading && children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  return useContext(SupabaseAuthContext);
};