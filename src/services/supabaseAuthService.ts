import { supabase } from './supabase';
import { User, AuthResponse, AuthError, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'schoolAdmin' | 'gradeManager';
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string;
  gradeLevels?: string[];
  createdAt: string;
  lastLogin?: string;
}

/**
 * Register a new user with Supabase Auth
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string,
  role: UserData['role'] = 'schoolAdmin',
  schoolId?: string,
  gradeLevels?: string[]
): Promise<UserData> => {
  try {
    // Use the server API to ensure proper Auth synchronization
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        username: email, // Use email as username by default
        name,
        role,
        school_id: schoolId || null,
        grade_levels: gradeLevels || []
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Registration failed');
    }
    
    // Return the user data in the expected format
    const userData: UserData = {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      role: result.data.role,
      schoolId,
      gradeLevels,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    return userData;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || 'Registration failed');
  }
};

/**
 * Login a user with Supabase Auth
 */
export const loginUser = async (email: string, password: string): Promise<UserData> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', authData.user.id)
      .order('id')
      .limit(1);

    if (accountError) throw accountError;
    if (!accountData || accountData.length === 0) {
      throw new Error('Account not found');
    }
    
    const account = accountData[0];

    const now = new Date().toISOString();
    await supabase
      .from('accounts')
      .update({ last_login: now })
      .eq('id', authData.user.id);

    let schoolName = '';
    let schoolLogo = '';
    if (account.school_id) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name, logo')
        .eq('id', account.school_id)
        .order('id')
        .limit(1);

      if (schoolData && schoolData.length > 0) {
        schoolName = schoolData[0].name;
        schoolLogo = schoolData[0].logo || '';
      }
    }

    const userData: UserData = {
      id: authData.user.id,
      email: account.email,
      name: account.name,
      role: account.role,
      schoolId: account.school_id,
      schoolName,
      schoolLogo,
      gradeLevels: account.grade_levels,
      createdAt: account.created_at,
      lastLogin: now
    };

    return userData;
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Login failed');
  }
};

/**
 * Logout the current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error(error.message || 'Logout failed');
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<UserData | null> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) return null;

    const user = sessionData.session.user;

    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .order('id')
      .limit(1);

    if (accountError || !accountData || accountData.length === 0) return null;
    
    const account = accountData[0];

    let schoolName = '';
    let schoolLogo = '';
    if (account.school_id) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name, logo')
        .eq('id', account.school_id)
        .order('id')
        .limit(1);

      if (schoolData && schoolData.length > 0) {
        schoolName = schoolData[0].name;
        schoolLogo = schoolData[0].logo || '';
      }
    }

    const userData: UserData = {
      id: user.id,
      email: account.email,
      name: account.name,
      role: account.role,
      schoolId: account.school_id,
      schoolName,
      schoolLogo,
      gradeLevels: account.grade_levels,
      createdAt: account.created_at,
      lastLogin: account.last_login
    };

    return userData;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Reset password for a user
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Password reset failed');
  }
};

/**
 * Update user password
 */
export const updatePassword = async (password: string): Promise<void> => {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  } catch (error: any) {
    console.error('Password update error:', error);
    throw new Error(error.message || 'Password update failed');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userData: Partial<UserData>): Promise<UserData> => {
  try {
    console.log('updateUserProfile called with:', userData);
    
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) throw new Error('No authenticated user');
    
    console.log('Current user ID:', currentUser.user.id);

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: userData.name,
        role: userData.role,
        schoolId: userData.schoolId,
        gradeLevels: userData.gradeLevels
      }
    });

    if (authError) {
      console.error('Auth update error:', authError);
      throw authError;
    }
    
    console.log('Auth update successful, updating accounts table...');

    const { error: accountError } = await supabase
      .from('accounts')
      .update({
        name: userData.name,
        role: userData.role,
        school_id: userData.schoolId,
        grade_levels: userData.gradeLevels
      })
      .eq('id', currentUser.user.id);

    if (accountError) {
      console.error('Account update error details:', {
        error: accountError,
        message: accountError.message,
        details: accountError.details,
        hint: accountError.hint,
        code: accountError.code
      });
      throw accountError;
    }
    
    console.log('Account update successful');
    
    // Fetch the updated account data separately
    const { data: accountData, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', currentUser.user.id)
      .single();

    if (fetchError || !accountData) {
      console.error('Error fetching updated account:', fetchError);
      // If we can't fetch the updated data, return what we know
      const updatedUserData: UserData = {
        id: currentUser.user.id,
        email: currentUser.user.email || '',
        name: userData.name || '',
        role: userData.role || 'schoolAdmin',
        schoolId: userData.schoolId || '',
        gradeLevels: userData.gradeLevels || [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      return updatedUserData;
    }
    
    console.log('Updated account data:', accountData);

    const updatedUserData: UserData = {
      id: currentUser.user.id,
      email: accountData.email,
      name: accountData.name,
      role: accountData.role,
      schoolId: accountData.school_id,
      gradeLevels: accountData.grade_levels,
      createdAt: accountData.created_at,
      lastLogin: accountData.last_login
    };

    console.log('Returning updated user data:', updatedUserData);
    return updatedUserData;
  } catch (error: any) {
    console.error('Profile update error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(error.message || 'Profile update failed');
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (
  callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED', session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event as any, session);
  });
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  resetPassword,
  updatePassword,
  updateUserProfile,
  onAuthStateChange
};
