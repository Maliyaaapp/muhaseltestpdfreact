import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if Supabase credentials are configured
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
}

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '');

/**
 * Check if Supabase Admin client is properly configured
 */
export const isSupabaseAdminConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseServiceKey;
};

/**
 * Create a new user in Supabase Auth
 * @param email User email
 * @param password User password
 * @param metadata Additional user metadata
 * @returns Created user object
 */
export const createUser = async (email: string, password: string, metadata: any = {}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  });

  if (error) {
    console.error('Error creating user in Supabase Auth:', error);
    throw error;
  }

  if (!data.user) {
    throw new Error('Failed to create user in Supabase Auth');
  }

  return data.user;
};

/**
 * Delete a user from Supabase Auth
 * @param userId User ID to delete
 */
export const deleteUser = async (userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error(`Error deleting user ${userId} from Supabase Auth:`, error);
    throw error;
  }

  // The accounts table should be automatically deleted via RLS cascade
  return { success: true };
};

/**
 * Create a record in the accounts table
 * @param accountData Account data to insert
 */
export const createAccountRecord = async (accountData: any) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .insert(accountData)
    .select()
    .single();

  if (error) {
    console.error('Error creating account record:', error);
    throw error;
  }

  return data;
};

/**
 * Update a user in Supabase Auth
 * @param userId User ID to update
 * @param updates Object containing email and/or password to update
 */
export const updateUser = async (userId: string, updates: { email?: string; password?: string }) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

  if (error) {
    console.error(`Error updating user ${userId} in Supabase Auth:`, error);
    throw error;
  }

  return data.user;
};

/**
 * Update a record in the accounts table
 * @param userId User ID to update
 * @param accountData Account data to update
 */
export const updateAccountRecord = async (userId: string, accountData: any) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .update(accountData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating account record for user ${userId}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
};

/**
 * Get a user by ID from the accounts table
 * @param userId User ID to fetch
 */
export const getUserById = async (userId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }

  return data;
};

/**
 * Get an account by ID from the accounts table
 * @param accountId Account ID to fetch
 */
export const getAccountById = async (accountId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) {
    console.error(`Error fetching account ${accountId}:`, error);
    throw error;
  }

  return data;
};

/**
 * Delete an account record from the accounts table
 * @param accountId Account ID to delete
 */
export const deleteAccountRecord = async (accountId: string) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (error) {
    console.error(`Error deleting account ${accountId}:`, error);
    throw error;
  }

  return true;
};

/**
 * Get all users from the accounts table
 * @param filters Optional filters to apply
 */
export const getAllUsers = async (filters: { role?: string; school_id?: string } = {}) => {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase Admin client not configured');
  }

  let query = supabaseAdmin.from('accounts').select('*');

  // Apply filters if provided
  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  if (filters.school_id) {
    query = query.eq('school_id', filters.school_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data;
};