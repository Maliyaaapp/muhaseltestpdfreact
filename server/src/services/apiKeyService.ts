/**
 * API Key Service
 * 
 * This service handles API key management, including:
 * - Creating new API keys
 * - Validating API keys
 * - Retrieving API key information
 * - Revoking API keys
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from './loggerService';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

// API key interfaces
interface ApiKey {
  id: string;
  name: string;
  key: string; // Only returned when creating a new key
  key_hash?: string; // Stored in database
  created_by: string;
  school_id: string | null;
  permissions: string[];
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiKeyCreateParams {
  name: string;
  created_by: string;
  school_id?: string | null;
  permissions?: string[];
  expires_at?: string | null;
}

interface ApiKeyVerifyResult {
  isValid: boolean;
  accountId?: string;
  schoolId?: string;
  permissions?: string[];
}

/**
 * Initialize the Supabase client
 * @returns True if initialization was successful
 */
function initSupabase(): boolean {
  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase URL or service role key not configured');
    return false;
  }

  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    return false;
  }
}

/**
 * Generate a secure random API key
 * @returns A secure random API key string
 */
function generateApiKey(): string {
  // Format: prefix_randomBytes
  const prefix = 'msl_';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomBytes}`;
}

/**
 * Hash an API key for storage
 * @param key The API key to hash
 * @returns The hashed API key
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new API key
 * @param params Parameters for creating the API key
 * @returns The created API key or null if creation failed
 */
async function createApiKey(params: ApiKeyCreateParams): Promise<ApiKey | null> {
  if (!supabase) {
    if (!initSupabase()) return null;
  }

  try {
    // Generate a new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    // Insert the API key into the database
    const { data, error } = await supabase!.from('api_keys').insert({
      name: params.name,
      key_hash: keyHash,
      created_by: params.created_by,
      school_id: params.school_id || null,
      permissions: params.permissions || [],
      expires_at: params.expires_at || null
    }).select('*').single();

    if (error) {
      logger.error('Failed to create API key:', error);
      return null;
    }

    // Return the API key with the actual key (only time it's available)
    return {
      ...data,
      key: apiKey
    } as ApiKey;
  } catch (error) {
    logger.error('Error creating API key:', error);
    return null;
  }
}

/**
 * Verify an API key
 * @param apiKey The API key to verify
 * @returns Result of the verification
 */
async function verifyApiKey(apiKey: string): Promise<ApiKeyVerifyResult> {
  if (!supabase) {
    if (!initSupabase()) {
      return { isValid: false };
    }
  }

  try {
    // Use the database function to verify the API key
    const { data, error } = await supabase!.rpc('verify_api_key', {
      api_key: apiKey
    });

    if (error || !data || data.length === 0) {
      logger.debug('API key verification failed:', error || 'No data returned');
      return { isValid: false };
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      accountId: result.account_id,
      schoolId: result.school_id,
      permissions: result.permissions
    };
  } catch (error) {
    logger.error('Error verifying API key:', error);
    return { isValid: false };
  }
}

/**
 * Get all API keys for a school
 * @param schoolId The school ID to get API keys for
 * @returns Array of API keys or null if retrieval failed
 */
async function getApiKeysBySchool(schoolId: string): Promise<Omit<ApiKey, 'key'>[] | null> {
  if (!supabase) {
    if (!initSupabase()) return null;
  }

  try {
    const { data, error } = await supabase!.from('api_keys')
      .select('*')
      .eq('school_id', schoolId);

    if (error) {
      logger.error('Failed to get API keys for school:', error);
      return null;
    }

    return data as Omit<ApiKey, 'key'>[];
  } catch (error) {
    logger.error('Error getting API keys for school:', error);
    return null;
  }
}

/**
 * Get an API key by ID
 * @param keyId The API key ID
 * @returns The API key or null if not found
 */
async function getApiKeyById(keyId: string): Promise<Omit<ApiKey, 'key'> | null> {
  if (!supabase) {
    if (!initSupabase()) return null;
  }

  try {
    const { data, error } = await supabase!.from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error) {
      logger.error('Failed to get API key by ID:', error);
      return null;
    }

    return data as Omit<ApiKey, 'key'>;
  } catch (error) {
    logger.error('Error getting API key by ID:', error);
    return null;
  }
}

/**
 * Revoke (delete) an API key
 * @param keyId The ID of the API key to revoke
 * @returns True if the key was revoked successfully
 */
async function revokeApiKey(keyId: string): Promise<boolean> {
  if (!supabase) {
    if (!initSupabase()) return false;
  }

  try {
    const { error } = await supabase!.from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      logger.error('Failed to revoke API key:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error revoking API key:', error);
    return false;
  }
}

/**
 * Update an API key's properties
 * @param keyId The ID of the API key to update
 * @param updates The properties to update
 * @returns The updated API key or null if update failed
 */
async function updateApiKey(
  keyId: string, 
  updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'expires_at'>>
): Promise<Omit<ApiKey, 'key'> | null> {
  if (!supabase) {
    if (!initSupabase()) return null;
  }

  try {
    const { data, error } = await supabase!.from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update API key:', error);
      return null;
    }

    return data as Omit<ApiKey, 'key'>;
  } catch (error) {
    logger.error('Error updating API key:', error);
    return null;
  }
}

export {
  ApiKey,
  ApiKeyCreateParams,
  ApiKeyVerifyResult,
  initSupabase,
  createApiKey,
  verifyApiKey,
  getApiKeysBySchool,
  getApiKeyById,
  revokeApiKey,
  updateApiKey
};