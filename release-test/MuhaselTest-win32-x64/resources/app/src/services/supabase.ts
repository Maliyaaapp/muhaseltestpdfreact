import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== '' && supabaseAnonKey !== '';
};

// Check if we're online
export const isOnline = () => {
  return navigator.onLine;
};

// Check if we should use Supabase
export const shouldUseSupabase = () => {
  return isSupabaseConfigured() && isOnline();
};

/**
 * Get the Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
  return supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: metadata
    }
  });
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  return supabase.auth.signOut();
};

/**
 * Get the current user session
 */
export const getSession = async () => {
  return supabase.auth.getSession();
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export default {
  supabase,
  isSupabaseConfigured,
  isOnline,
  shouldUseSupabase,
  getSupabaseClient,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSession,
  getCurrentUser,
  onAuthStateChange
};