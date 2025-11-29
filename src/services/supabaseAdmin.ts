import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Supabase configuration with service role key for admin operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy initialization of Supabase admin client
let supabaseAdmin: SupabaseClient<Database> | null = null;

const getSupabaseAdmin = (): SupabaseClient<Database> => {
  if (!supabaseAdmin && isSupabaseAdminConfigured()) {
    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin!;
};

// Export for backward compatibility (but will throw if not configured)
export { getSupabaseAdmin as supabaseAdmin };

// Check if Supabase Admin is configured
export const isSupabaseAdminConfigured = () => {
  return supabaseUrl !== '' && supabaseServiceRoleKey !== '';
};

/**
 * Create a new user in Supabase Auth using admin privileges
 * @param email User's email
 * @param password User's password
 * @param userData Additional user metadata
 * @returns The created user data or throws an error
 */
export const createUser = async (email: string, password: string, userData: any = {}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin is not configured. Admin operations should be performed through the backend API.');
  }

  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to avoid verification step
      user_metadata: userData
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to create user');

    return data.user;
  } catch (error: any) {
    console.error('Error creating user with admin API:', error);
    throw error;
  }
};

/**
 * Delete a user from Supabase Auth using admin privileges
 * @param userId The UUID of the user to delete
 * @returns Success status or throws an error
 */
export const deleteUser = async (userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin is not configured. Admin operations should be performed through the backend API.');
  }

  try {
    const adminClient = getSupabaseAdmin();
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user with admin API:', error);
    throw error;
  }
};

export default {
  supabaseAdmin: getSupabaseAdmin,
  isSupabaseAdminConfigured,
  createUser,
  deleteUser
};