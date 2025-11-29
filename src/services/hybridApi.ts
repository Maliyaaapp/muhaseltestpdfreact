import { v4 as uuidv4 } from 'uuid';
import { supabase, shouldUseSupabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import storage from '../utils/storage';
import { STORAGE_KEYS } from './api';

// Export STORAGE_KEYS for other modules
export { STORAGE_KEYS };

// API configuration
const API_BASE_URL = 'http://localhost:3001';

// Helper function to check online status
const isOnline = (): boolean => {
  return getCurrentConnectionStatus();
};

// Interface for API response
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  // Extended properties for cache/sync info
  stats?: { synced: number; conflicts: number; errors: number };
  details?: any;
  fromCache?: boolean;
  fromLocalStorage?: boolean;
  fromSupabase?: boolean;
}

// Helper functions for localStorage with caching metadata
interface CachedData {
  data: any[];
  timestamp: number;
  lastSync: number;
}

const getCollection = (collectionName: string): any[] => {
  try {
    const collection = storage.get(collectionName);
    return collection ? collection : [];
  } catch (e) {
    console.error(`Error parsing ${collectionName} from localStorage:`, e);
    return [];
  }
};

const getCachedCollection = (collectionName: string): CachedData | null => {
  try {
    const cacheKey = `${collectionName}_cache`;
    const cached = storage.get(cacheKey);
    return cached || null;
  } catch (e) {
    console.error(`Error parsing cached ${collectionName} from localStorage:`, e);
    return null;
  }
};
  
const saveCollection = (collectionName: string, data: any[]): void => {
  try {
    storage.set(collectionName, data);
  } catch (e) {
    console.error(`Error saving ${collectionName} to localStorage:`, e);
  }
};

const saveCachedCollection = (collectionName: string, data: any[]): void => {
  try {
    const cacheKey = `${collectionName}_cache`;
    const cachedData: CachedData = {
      data,
      timestamp: Date.now(),
      lastSync: Date.now()
    };
    storage.set(cacheKey, cachedData);
    // Also save to regular collection for backward compatibility
    saveCollection(collectionName, data);
  } catch (e) {
    console.error(`Error saving cached ${collectionName} to localStorage:`, e);
  }
};

const _isCacheValid = (cached: CachedData, maxAge: number = 5 * 60 * 1000): boolean => {
  return cached && (Date.now() - cached.timestamp) < maxAge;
};

const clearCachedCollection = (collectionName: string): void => {
  try {
    const cacheKey = `${collectionName}_cache`;
    storage.remove(cacheKey);
  } catch (e) {
    console.error(`Error clearing cached ${collectionName}:`, e);
  }
};

// Cache management functions
export const invalidateCache = (table: string): void => {
  try {
    const cacheKey = `${table}_cache`;
    storage.remove(cacheKey);
    
    // CRITICAL FIX: Also invalidate ALL filtered caches for this table
    // This ensures that queries with filters (like schoolId) also get fresh data
    invalidateFilteredCaches(table);
    
    console.log(`🗑️ Invalidated cache for ${table} (including filtered caches)`);
  } catch (e) {
    console.error(`Error invalidating cache for ${table}:`, e);
  }
};

export const invalidateAllCaches = (): void => {
  const tables = ['students', 'fees', 'installments', 'messages', 'schools', 'accounts', 'settings'];
  tables.forEach(table => invalidateCache(table));
  console.log('🗑️ Invalidated all caches');
};

// Debounce tracking for cache invalidations to prevent excessive invalidations
const lastInvalidationTime: { [key: string]: number } = {};
const INVALIDATION_DEBOUNCE_MS = 500; // Don't invalidate same table within 500ms

// Invalidate all filtered caches for a specific table
const invalidateFilteredCaches = (table: string): void => {
  try {
    const now = Date.now();
    
    // Debounce: Skip if invalidated within last 500ms
    if (lastInvalidationTime[table] && now - lastInvalidationTime[table] < INVALIDATION_DEBOUNCE_MS) {
      return; // Skip silently to avoid log spam
    }
    lastInvalidationTime[table] = now;
    
    // Get all cache keys from localStorage
    const allKeys = Object.keys(localStorage);
    const filteredCacheKeys = allKeys.filter(key => 
      key.startsWith(`${table}_`) && key.endsWith('_cache') && key.includes('{'));
    
    // Remove all filtered caches for this table
    filteredCacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    if (filteredCacheKeys.length > 0) {
      console.log(`🗑️ Invalidated ${filteredCacheKeys.length} filtered caches for ${table}`);
    }
  } catch (error) {
    console.warn('Error invalidating filtered caches:', error);
  }
};

export const getCacheInfo = (table: string): { hasCache: boolean; age?: number; itemCount?: number } => {
  const cached = getCachedCollection(table);
  if (cached) {
    return {
      hasCache: true,
      age: Date.now() - cached.timestamp,
      itemCount: cached.data.length
    };
  }
  return { hasCache: false };
};

// Refresh all dashboard data caches
// Debounce tracking for cache refreshes to prevent duplicate refreshes
const lastRefreshTime: { [key: string]: number } = {};
const REFRESH_DEBOUNCE_MS = 2000; // Don't refresh same entity within 2 seconds

export const refreshDashboardCaches = async (schoolId?: string): Promise<void> => {
  if (!shouldUseSupabase()) {
    console.log('📱 Offline: Cannot refresh caches');
    return;
  }
  
  const now = Date.now();
  const cacheKey = `dashboard_${schoolId || 'all'}`;
  
  // Debounce: Skip if refreshed within last 2 seconds
  if (lastRefreshTime[cacheKey] && now - lastRefreshTime[cacheKey] < REFRESH_DEBOUNCE_MS) {
    console.log('🔄 Skipping dashboard refresh (debounced)');
    return;
  }
  lastRefreshTime[cacheKey] = now;
  
  console.log('🔄 Refreshing all dashboard caches...');
  
  try {
    const refreshPromises = [];
    
    // Refresh students cache
    if (schoolId) {
      refreshPromises.push(getStudents(schoolId));
      refreshPromises.push(getFees(schoolId));
      refreshPromises.push(getInstallments(schoolId));
      refreshPromises.push(getMessages(schoolId));
    } else {
      refreshPromises.push(getStudents());
      refreshPromises.push(getFees());
      refreshPromises.push(getInstallments());
      refreshPromises.push(getMessages());
    }
    
    await Promise.all(refreshPromises);
    console.log('✅ All dashboard caches refreshed successfully');
  } catch (error) {
    console.error('❌ Error refreshing dashboard caches:', error);
  }
};

// Simulate API delay for local storage operations
const simulateDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Sync queue for offline operations
interface SyncOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  version?: number;
  clientId?: string;
}

let syncQueue: SyncOperation[] = [];

// Real-time channels and callbacks
let realtimeChannels: RealtimeChannel[] = [];
let realtimeCallbacks: { [key: string]: Function[] } = {};

// Load sync queue from localStorage
const loadSyncQueue = () => {
  try {
    const queue = storage.get('syncQueue');
    syncQueue = queue || [];
  } catch (e) {
    console.error('Error loading sync queue:', e);
    syncQueue = [];
  }
};

// Save sync queue to storage
const saveSyncQueue = () => {
  try {
    storage.set('syncQueue', syncQueue);
  } catch (e) {
    console.error('Error saving sync queue:', e);
  }
};

// Generate unique client ID for conflict resolution
const getClientId = () => {
  let clientId = storage.get('clientId');
  if (!clientId) {
    clientId = uuidv4();
    storage.set('clientId', clientId);
  }
  return clientId;
};

// Add operation to sync queue
const addToSyncQueue = (table: string, operation: 'insert' | 'update' | 'delete', data: any) => {
  if (!shouldUseSupabase()) {
    syncQueue.push({
      id: uuidv4(),
      table,
      operation,
      data: {
        ...data,
        updated_at: new Date().toISOString(),
        client_updated_at: new Date().toISOString()
      },
      timestamp: Date.now(),
      version: data.version || 1,
      clientId: getClientId()
    });
    saveSyncQueue();
  }
};

// Enhanced conflict resolution function
const resolveConflict = async (table: string, localData: any, serverData: any): Promise<any> => {
  console.log(`🔄 Resolving conflict for ${table}:`, { localData, serverData });
  
  // If no server data, use local data
  if (!serverData) {
    return localData;
  }
  
  // If no local data, use server data
  if (!localData) {
    return serverData;
  }
  
  // Timestamp-based conflict resolution
  const localTimestamp = new Date(localData.updated_at || localData.client_updated_at || 0).getTime();
  const serverTimestamp = new Date(serverData.updated_at || 0).getTime();
  
  // If local is newer, use local data
  if (localTimestamp > serverTimestamp) {
    console.log(`📱 Using local data (newer): ${localTimestamp} > ${serverTimestamp}`);
    return {
      ...serverData,
      ...localData,
      updated_at: new Date().toISOString(),
      conflict_resolved_at: new Date().toISOString(),
      conflict_resolution: 'local_wins_timestamp'
    };
  }
  
  // If server is newer, use server data but preserve local-only fields
  console.log(`☁️ Using server data (newer): ${serverTimestamp} >= ${localTimestamp}`);
  return {
    ...localData,
    ...serverData,
    conflict_resolved_at: new Date().toISOString(),
    conflict_resolution: 'server_wins_timestamp'
  };
};

// Helper function to check online status
const checkOnlineStatus = async (): Promise<boolean> => {
  try {
    // Use the same connection detection as isSupabaseAvailable for consistency
    // First check if we should use Supabase at all
    if (!shouldUseSupabase()) {
      console.log('Supabase disabled, using offline mode');
      return false;
    }
    
    // Try backend server first with improved error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout
    
    try {
      const response = await fetch('http://localhost:3001/', { 
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        console.log('Backend server available');
        return true;
      }
    } catch (fetchError) {
      console.log('Backend server check failed:', fetchError);
      clearTimeout(timeoutId);
    }
    
    // Fallback to Supabase connectivity check
    console.log('Backend unavailable, checking Supabase directly...');
    const { error } = await supabase.from('accounts').select('id').limit(1);
    const supabaseAvailable = !error;
    
    if (supabaseAvailable) {
      console.log('Supabase available, using direct connection');
    } else {
      console.log('Both backend and Supabase unavailable, using offline mode');
    }
    
    return supabaseAvailable;
  } catch (error) {
    console.log('Connection check failed, using offline mode:', error);
    return false;
  }
};

// Helper function to get auth headers
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    // Try to get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`
      };
    }
  } catch (error) {
    console.warn('Could not get auth headers:', error);
  }
  return {};
};

// Process sync queue when online
export const processSyncQueue = async (): Promise<ApiResponse> => {
  if (!shouldUseSupabase() || syncQueue.length === 0) {
    return { success: true, message: 'No items to sync' };
  }

  try {
    // Process operations in order
    const operations = [...syncQueue];
    let successCount = 0;
    let errorCount = 0;
    let conflictCount = 0;

    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'insert':
            // Check if record already exists
            const { data: existingRecord } = await supabase
              .from(op.table)
              .select('*')
              .eq('id', op.data.id)
              .single();
            
            if (existingRecord) {
              // Conflict detected - resolve it
              const resolvedData = await resolveConflict(op.table, op.data, existingRecord);
              await supabase.from(op.table).update(resolvedData).eq('id', op.data.id);
              conflictCount++;
              console.log(`🔄 Resolved insert conflict for ${op.table}:${op.data.id}`);
            } else {
              // No conflict - insert normally
              await supabase.from(op.table).insert(op.data);
            }
            break;
            
          case 'update':
            if (op.data?.id) {
              // Get current server data
              const { data: currentServerData } = await supabase
                .from(op.table)
                .select('*')
                .eq('id', op.data.id)
                .single();
              
              if (currentServerData) {
                // Check for conflicts
                const serverTimestamp = new Date(currentServerData.updated_at || 0).getTime();
                const localTimestamp = new Date(op.data.updated_at || op.data.client_updated_at || 0).getTime();
                
                if (Math.abs(serverTimestamp - localTimestamp) > 1000) { // 1 second tolerance
                  // Conflict detected - resolve it
                  const resolvedData = await resolveConflict(op.table, op.data, currentServerData);
                  await supabase.from(op.table).update(resolvedData).eq('id', op.data.id);
                  conflictCount++;
                  console.log(`🔄 Resolved update conflict for ${op.table}:${op.data.id}`);
                } else {
                  // No conflict - update normally
                  await supabase.from(op.table).update(op.data).eq('id', op.data.id);
                }
              } else {
                // Record doesn't exist on server - insert it
                await supabase.from(op.table).insert(op.data);
              }
            }
            break;
            
          case 'delete':
            if (op.data?.id) {
              // Check if record still exists
              const { data: existingRecord } = await supabase
                .from(op.table)
                .select('id, updated_at')
                .eq('id', op.data.id)
                .single();
              
              if (existingRecord) {
                // Check if it was modified after our delete timestamp
                const serverTimestamp = new Date(existingRecord.updated_at || 0).getTime();
                const deleteTimestamp = op.timestamp;
                
                if (serverTimestamp > deleteTimestamp) {
                  // Server record is newer - skip delete (conflict)
                  conflictCount++;
                  console.log(`⚠️ Skipped delete for ${op.table}:${op.data.id} - server record is newer`);
                } else {
                  // Safe to delete
                  await supabase.from(op.table).delete().eq('id', op.data.id);
                }
              }
              // If record doesn't exist, delete operation is already complete
            }
            break;
        }
        
        // Remove from queue on success
        syncQueue = syncQueue.filter(item => item.id !== op.id);
        successCount++;
      } catch (error: any) {
        console.error(`Error processing sync operation:`, error);
        errorCount++;
        
        // For certain errors, remove the operation from queue to prevent infinite retries
        if (error.message?.includes('duplicate key') || error.message?.includes('not found')) {
          console.log(`🗑️ Removing failed operation from queue: ${error.message}`);
          syncQueue = syncQueue.filter(item => item.id !== op.id);
        }
      }
    }

    saveSyncQueue();
    
    // Refresh caches after successful sync operations
    if (successCount > 0) {
      console.log('🔄 Refreshing caches after sync...');
      // Invalidate caches to force fresh data fetch on next request
      const affectedTables = [...new Set(operations.map(op => op.table))];
      affectedTables.forEach(table => invalidateCache(table));
    }

    const message = `Sync completed: ${successCount} operations successful${conflictCount > 0 ? `, resolved ${conflictCount} conflicts` : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}. ${syncQueue.length} operations remaining.`;
    console.log(`✅ ${message}`);
    
    return { 
      success: true, 
      message,
      stats: { synced: successCount, conflicts: conflictCount, errors: errorCount }
    };
  } catch (error: any) {
    console.error('❌ Error processing sync queue:', error);
    return { success: false, error: error.message };
  }
};

// Initialize sync queue
loadSyncQueue();

// Enhanced connection detection and management
let isOnlineStatus = true;
let connectionCheckInterval: NodeJS.Timeout | null = null;
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds
const CONNECTION_CHECK_CACHE_TIME = 5000; // 5 seconds cache

// Enhanced Supabase availability check with caching
export const isSupabaseAvailable = async (): Promise<boolean> => {
  if (!shouldUseSupabase()) return false;
  
  // Use cached result if recent
  const now = Date.now();
  if (now - lastConnectionCheck < CONNECTION_CHECK_CACHE_TIME) {
    return isOnlineStatus;
  }
  
  try {
    // Test actual connectivity with a lightweight query
    const { error } = await supabase.from('accounts').select('id').limit(1);
    isOnlineStatus = !error;
    lastConnectionCheck = now;
    return isOnlineStatus;
  } catch {
    isOnlineStatus = false;
    lastConnectionCheck = now;
    return false;
  }
};

// Initialize connection monitoring
export const initializeConnectionMonitoring = (): void => {
  if (connectionCheckInterval) return;
  
  // Check connection periodically
  connectionCheckInterval = setInterval(async () => {
    const wasOnline = isOnlineStatus;
    await isSupabaseAvailable();
    
    // If connection restored, trigger sync
    if (!wasOnline && isOnlineStatus) {
      console.log('🌐 Connection restored, triggering sync...');
      processSyncQueue().catch(error => {
        console.error('Auto-sync after connection restore failed:', error);
      });
    }
  }, CONNECTION_CHECK_INTERVAL);
  
  // Listen to browser online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.log('🌐 Browser detected online status');
      await isSupabaseAvailable();
      if (isOnlineStatus) {
        processSyncQueue().catch(error => {
          console.error('Auto-sync after browser online event failed:', error);
        });
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('📱 Browser detected offline status');
      isOnlineStatus = false;
      lastConnectionCheck = Date.now();
    });
  }
};

// Get current connection status
export const getCurrentConnectionStatus = (): boolean => isOnlineStatus;

// Comprehensive data sync manager with fees and installments
export const syncAllData = async (): Promise<{ success: boolean; synced: string[]; errors: string[] }> => {
  const synced: string[] = [];
  const errors: string[] = [];
  
  if (!(await isSupabaseAvailable())) {
    return { success: false, synced, errors: ['Supabase not available'] };
  }
  
  try {
    // Sync accounts (exclude password column to avoid 406 error)
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id,name,email,username,role,school_id,grade_levels,created_at,updated_at,last_login');
      
      if (accountsError) {
        errors.push(`Accounts sync failed: ${accountsError.message}`);
      } else if (accounts) {
        const localAccounts = getCollection(STORAGE_KEYS.ACCOUNTS);
        const mergedAccounts = mergeAccountData(accounts, localAccounts);
        saveCollection(STORAGE_KEYS.ACCOUNTS, mergedAccounts);
        saveCachedCollection(STORAGE_KEYS.ACCOUNTS, mergedAccounts);
        synced.push(`accounts (${accounts.length} items)`);
      }
    } catch (accountsSyncError: any) {
      console.warn('Accounts sync failed with error:', accountsSyncError);
      errors.push(`Accounts sync failed: ${accountsSyncError.message || 'Unknown error'}`);
    }
    
    // Sync schools
    const { data: schools, error: schoolsError } = await supabase.from('schools').select('*');
    if (schoolsError) {
      errors.push(`Schools sync failed: ${schoolsError.message}`);
    } else if (schools) {
      const localSchools = getCollection(STORAGE_KEYS.SCHOOLS);
      const mergedSchools = mergeData(schools, localSchools);
      saveCollection(STORAGE_KEYS.SCHOOLS, mergedSchools);
      saveCachedCollection(STORAGE_KEYS.SCHOOLS, mergedSchools);
      synced.push(`schools (${schools.length} items)`);
    }
    
    // Sync students
    const { data: students, error: studentsError } = await supabase.from('students').select('*');
    if (studentsError) {
      errors.push(`Students sync failed: ${studentsError.message}`);
    } else if (students) {
      const localStudents = getCollection(STORAGE_KEYS.STUDENTS);
      const mergedStudents = mergeData(students, localStudents);
      saveCollection(STORAGE_KEYS.STUDENTS, mergedStudents);
      saveCachedCollection(STORAGE_KEYS.STUDENTS, mergedStudents);
      synced.push(`students (${students.length} items)`);
    }
    
    // Sync fees
    const { data: fees, error: feesError } = await supabase.from('fees').select('*');
    if (feesError) {
      errors.push(`Fees sync failed: ${feesError.message}`);
    } else if (fees) {
      const localFees = getCollection(STORAGE_KEYS.FEES);
      const mergedFees = mergeData(fees, localFees);
      saveCollection(STORAGE_KEYS.FEES, mergedFees);
      saveCachedCollection(STORAGE_KEYS.FEES, mergedFees);
      synced.push(`fees (${fees.length} items)`);
    }
    
    // Sync installments
    const { data: installments, error: installmentsError } = await supabase.from('installments').select('*');
    if (installmentsError) {
      errors.push(`Installments sync failed: ${installmentsError.message}`);
    } else if (installments) {
      const localInstallments = getCollection(STORAGE_KEYS.INSTALLMENTS);
      const mergedInstallments = mergeData(installments, localInstallments);
      saveCollection(STORAGE_KEYS.INSTALLMENTS, mergedInstallments);
      saveCachedCollection(STORAGE_KEYS.INSTALLMENTS, mergedInstallments);
      synced.push(`installments (${installments.length} items)`);
    }
    
    console.log('✅ Data sync completed:', { synced, errors });
    return { success: errors.length === 0, synced, errors };
  } catch (error: any) {
    console.error('❌ Sync failed:', error);
    errors.push(`General sync error: ${error.message}`);
    return { success: false, synced, errors };
  }
};

// Merge account data preserving local-only information
const mergeAccountData = (supabaseAccounts: any[], localAccounts: any[]): any[] => {
  // Filter out null/undefined items and ensure they have valid IDs
  const validSupabaseAccounts = (supabaseAccounts || []).filter(acc => acc && acc.id);
  const validLocalAccounts = (localAccounts || []).filter(acc => acc && acc.id);
  
  const merged = [...validSupabaseAccounts];
  const supabaseIds = new Set(validSupabaseAccounts.map(acc => acc.id));
  
  // Add local-only accounts that don't exist in Supabase
  validLocalAccounts.forEach(localAcc => {
    if (!supabaseIds.has(localAcc.id)) {
      merged.push(localAcc);
    }
  });
  
  return merged;
};

// Generic data merge function
const mergeData = (supabaseData: any[], localData: any[]): any[] => {
  // Filter out null/undefined items and ensure they have valid IDs
  const validSupabaseData = (supabaseData || []).filter(item => item && item.id);
  const validLocalData = (localData || []).filter(item => item && item.id);
  
  const merged = [...validSupabaseData];
  const supabaseIds = new Set(validSupabaseData.map(item => item.id));
  
  // Add local-only items that don't exist in Supabase
  validLocalData.forEach(localItem => {
    if (!supabaseIds.has(localItem.id)) {
      merged.push(localItem);
    }
  });
  
  return merged;
};

// Enhanced offline authentication support
export const cacheUserSession = (user: any): void => {
  try {
    const sessionData = {
      user,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    storage.set('cached_session', sessionData);
    console.log('✅ User session cached for offline use');
  } catch (error) {
    console.error('❌ Failed to cache user session:', error);
  }
};

export const getCachedUserSession = (): any | null => {
  try {
    const sessionData = storage.get('cached_session');
    if (sessionData && sessionData.expiresAt > Date.now()) {
      return sessionData.user;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get cached user session:', error);
    return null;
  }
};

export const clearCachedUserSession = (): void => {
  try {
    storage.remove('cached_session');
    console.log('✅ Cached user session cleared');
  } catch (error) {
    console.error('❌ Failed to clear cached user session:', error);
  }
};

export const clearCache = (tables?: string[]): void => {
  try {
    const tablesToClear = tables || ['fees', 'installments', 'students', 'settings', 'messages'];
    tablesToClear.forEach(table => {
      clearCachedCollection(table);
      // CRITICAL FIX: Also clear ALL filtered caches for this table
      // This ensures queries with filters (like schoolId) also get fresh data
      invalidateFilteredCaches(table);
    });
    console.log('🗑️ Cleared cache for:', tablesToClear.join(', '), '(including filtered caches)');
  } catch (e) {
    console.error('Error clearing cache:', e);
  }
};

// Set up event listeners for online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('🌐 Back online! Processing sync queue and refreshing caches...');
    
    // Process sync queue first
    await processSyncQueue();
    
    // Sync all data
    await syncAllData();
    
    // Then refresh dashboard caches
    setTimeout(() => {
      refreshDashboardCaches();
    }, 1000); // Small delay to ensure sync is complete
  });
  
  window.addEventListener('offline', () => {
    console.log('📱 Gone offline - will serve cached data');
  });
}

// Helper function to merge sync queue operations with retrieved data
const mergeSyncQueueData = (baseData: any[], table: string, filters?: Record<string, any>): any[] => {
  // Get pending operations for this table from sync queue
  const pendingOps = syncQueue.filter(op => op.table === table);
  
  if (pendingOps.length === 0) {
    return baseData;
  }
  
  // Start with base data
  let mergedData = [...baseData];
  
  // Apply pending operations in chronological order
  pendingOps.sort((a, b) => a.timestamp - b.timestamp).forEach(op => {
    switch (op.operation) {
      case 'insert':
        // Add new items that don't already exist
        if (op.data?.id) {
          const existingIndex = mergedData.findIndex(item => item.id === op.data.id);
          if (existingIndex === -1) {
            mergedData.push(op.data);
          }
        }
        break;
        
      case 'update':
        // Update existing items
        if (op.data?.id) {
          const updateIndex = mergedData.findIndex(item => item.id === op.data.id);
          if (updateIndex !== -1) {
            mergedData[updateIndex] = { ...mergedData[updateIndex], ...op.data };
          }
        }
        break;
        
      case 'delete':
        // Remove deleted items
        if (op.data?.id) {
          mergedData = mergedData.filter(item => item.id !== op.data.id);
        }
        break;
    }
  });
  
  // Apply filters to merged data if provided
  if (filters) {
    mergedData = mergedData.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    });
  }
  
  return mergedData;
};

// Generic CRUD operations

// Get all items from a collection with enhanced caching and sync queue integration
export const getAll = async (table: string, filters?: Record<string, any>): Promise<ApiResponse> => {
  try {
    const cacheKey = filters ? `${table}_${JSON.stringify(filters)}` : table;
    const cached = getCachedCollection(cacheKey);

    // Prepare local-first data immediately
    let localItems: any[] | null = null;
    if (cached && cached.data) {
      localItems = cached.data;
    } else {
      localItems = getCollection(table);
    }
    
    // CRITICAL FIX: If cache was just invalidated and localStorage is empty,
    // wait for Supabase fetch instead of returning empty data
    const shouldWaitForSupabase = !cached && (!localItems || localItems.length === 0) && await isSupabaseAvailable();
    if (shouldWaitForSupabase && shouldUseSupabase()) {
      console.log(`⏳ No local data for ${table}, fetching from Supabase...`);
      try {
        let query = supabase.from(table).select('*');
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          });
        }
        const { data, error } = await query;
        if (error) throw error;

        let filteredData = data;
        if (filters) {
          filteredData = data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
              if (Array.isArray(value)) {
                return value.includes(item[key]);
              }
              return item[key] === value;
            });
          });
        }

        // Save to cache and localStorage - REPLACE, don't merge to avoid duplicates
        saveCachedCollection(cacheKey, filteredData);
        // Always save the full Supabase data to localStorage (replaces old data)
        saveCollection(table, data);
        saveCachedCollection(table, data);
        
        console.log(`✅ Fetched ${filteredData.length} items from Supabase for ${table}`);
        
        return {
          success: true,
          data: mergeSyncQueueData(filteredData, table, filters),
          fromCache: false,
          fromLocalStorage: false,
          fromSupabase: true
        };
      } catch (error: any) {
        console.warn(`⚠️ Supabase fetch failed for ${table}:`, error.message);
        // Fall through to return empty local data
      }
    }

    // Apply filters locally
    let localFiltered = localItems;
    if (filters && localFiltered) {
      localFiltered = localFiltered.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      });
    }

    // Merge with pending sync queue operations
    let mergedLocal = mergeSyncQueueData(localFiltered || [], table, filters);
    
    // CRITICAL FIX: Deduplicate by ID to prevent duplicate entries
    const seenIds = new Set<string>();
    mergedLocal = mergedLocal.filter(item => {
      if (!item?.id) return true; // Keep items without ID
      if (seenIds.has(item.id)) return false; // Remove duplicate
      seenIds.add(item.id);
      return true;
    });

    // Fire-and-forget background refresh from Supabase (if available)
    // DEBOUNCED: Prevent duplicate refreshes for same table within 3 seconds
    const bgRefreshKey = `${table}_${JSON.stringify(filters || {})}`;
    const now = Date.now();
    if (!lastRefreshTime[bgRefreshKey] || now - lastRefreshTime[bgRefreshKey] > 3000) {
      lastRefreshTime[bgRefreshKey] = now;
      
      (async () => {
        const online = await isSupabaseAvailable();
        if (online && shouldUseSupabase()) {
          try {
            let query = supabase.from(table).select('*');
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                  query = query.in(key, value);
                } else {
                  query = query.eq(key, value);
                }
              });
            }
            const { data, error } = await query;
            if (error) throw error;

            let filteredData = data;
            if (filters) {
              filteredData = data.filter(item => {
                return Object.entries(filters).every(([key, value]) => {
                  if (Array.isArray(value)) {
                    return value.includes(item[key]);
                  }
                  return item[key] === value;
                });
              });
            }

            saveCachedCollection(cacheKey, filteredData);
            // CRITICAL FIX: Replace localStorage with Supabase data to avoid duplicates
            // Don't merge - Supabase is the source of truth
            saveCollection(table, data);
            saveCachedCollection(table, data);
            console.log(`✅ Background cache refresh for ${table}:`, filteredData.length, 'items');
          } catch (bgErr: any) {
            console.warn(`⚠️ Background refresh failed for ${table}:`, bgErr.message);
          }
        }
      })();
    }

    // Return local-first data immediately (no delays, no spinner)
    return {
      success: true,
      data: mergedLocal,
      fromCache: Boolean(cached && cached.data),
      fromLocalStorage: !cached,
    };
  } catch (error: any) {
    console.error(`❌ Error getting ${table}:`, error);
    return { success: false, error: error.message };
  }
};

// Get a single item by ID with sync queue integration
export const getById = async (table: string, id: string): Promise<ApiResponse> => {
  try {
    let baseItem: any = null;
    
    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      try {
        // For accounts table, explicitly select columns to avoid 406 error with password column
        const selectColumns = table === 'accounts' 
          ? 'id,name,email,username,role,school_id,grade_levels,created_at,updated_at,last_login'
          : '*';
        
        const { data, error } = await supabase.from(table).select(selectColumns).eq('id', id).single();
        
        if (error) {
          // PGRST116 = no rows returned, PGRST406 = Not Acceptable
          if (error.code === 'PGRST116') {
            // No rows found, continue to check localStorage
            baseItem = null;
          } else if (error.code === 'PGRST406' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
            // 406 error - try to fetch from localStorage instead
            console.warn(`406 error fetching ${table} from Supabase, falling back to localStorage`);
            await simulateDelay();
            const items = getCollection(table);
            baseItem = items.find(i => i.id === id);
          } else {
            throw error;
          }
        } else {
          baseItem = data;
        }
      } catch (supabaseError: any) {
        // Catch any network or Supabase errors and fall back to localStorage
        console.warn(`Error fetching ${table} from Supabase (${supabaseError.message}), falling back to localStorage`);
        await simulateDelay();
        const items = getCollection(table);
        baseItem = items.find(i => i.id === id);
      }
    } else {
      // Fallback to localStorage
      await simulateDelay();
      const items = getCollection(table);
      baseItem = items.find(i => i.id === id);
    }
    
    // Check for pending operations in sync queue
    const pendingOps = syncQueue
      .filter(op => op.table === table && op.data?.id === id)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply pending operations
    let finalItem = baseItem;
    for (const op of pendingOps) {
      switch (op.operation) {
        case 'insert':
          if (!finalItem) {
            finalItem = op.data;
          }
          break;
          
        case 'update':
          if (finalItem) {
            finalItem = { ...finalItem, ...op.data };
          }
          break;
          
        case 'delete':
          finalItem = null;
          break;
      }
    }
    
    if (finalItem) {
      return { success: true, data: finalItem };
    } else {
      return { success: false, error: `Item not found in ${table}` };
    }
  } catch (error: any) {
    console.error(`Error getting ${table} by ID:`, error);
    return { success: false, error: error.message };
  }
};

// Create a new item
export const create = async (table: string, data: any): Promise<ApiResponse> => {
  try {
    // Validate UUID fields for installments table specifically
    if (table === 'installments') {
      const uuidFields = ['student_id', 'school_id', 'fee_id'];
      for (const field of uuidFields) {
        const value = data[field];
        // Skip validation if field is undefined (not provided)
        if (value !== undefined && (!value || typeof value !== 'string' || value.trim() === '')) {
          console.error(`create - Invalid ${field} for installments:`, value);
          return {
            success: false,
            error: `Invalid ${field}: cannot be empty or null`
          };
        }
      }
    }
    
    // Ensure data has an ID
    const itemData = {
      id: data.id || uuidv4(),
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log(`create - About to insert into ${table}:`, {
      schoolId: itemData.school_id,
      itemId: itemData.id,
      usingSupabase: shouldUseSupabase()
    });

    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      // Check authentication before attempting to create
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Authentication required for database operations');
        return { success: false, error: 'Authentication required. Please log in again.' };
      }
      
      console.log(`create - Supabase insert data for ${table}:`, itemData);
      
      // Log authentication status for debugging
      console.log(`create - Auth session for ${table}:`, {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionError: sessionError ? (sessionError as any).message : null
      });
      
      // Use upsert to handle duplicate keys gracefully
      const { data: result, error } = await supabase.from(table).upsert(itemData, { onConflict: 'id' }).select();
      
      if (error) {
        console.error(`create - Supabase error for ${table}:`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          itemData: itemData
        });
        
        // Handle specific error codes
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: 'Permission denied. Please ensure you are logged in and have access to this school\'s data.',
            details: error
          };
        }
        
        // Handle 409 Conflict errors specifically
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          return {
            success: false,
            error: 'Duplicate entry detected. This record may already exist.',
            details: error
          };
        }
        
        // Handle foreign key constraint violations
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          return {
            success: false,
            error: 'Invalid reference. Please ensure all related records exist.',
            details: error
          };
        }
        
        throw error;
      }
      
      console.log(`create - Supabase success for ${table}:`, result[0]);
      
      // Update cache with new item
      try {
        const cached = getCachedCollection(table);
        if (cached && cached.data) {
          const updatedData = [...cached.data, result[0]];
          saveCachedCollection(table, updatedData);
          console.log(`✅ Updated cache for ${table} after create`);
        }
        
        // CRITICAL FIX: Also invalidate filtered caches to ensure consistency
        // This ensures queries with filters (like schoolId) get fresh data
        invalidateFilteredCaches(table);
      } catch (cacheError) {
        console.warn('Cache update failed after create:', cacheError);
      }
      
      return { success: true, data: result[0] };
    } else {
      // Fallback to localStorage
      await simulateDelay();
      const items = getCollection(table);
      items.push(itemData);
      saveCollection(table, items);
      
      // Always update cache for immediate UI updates, create cache if it doesn't exist
      try {
        const cached = getCachedCollection(table);
        let updatedData;
        if (cached && cached.data) {
          updatedData = [...cached.data, itemData];
        } else {
          // Create new cache with current localStorage data
          updatedData = [...items];
        }
        saveCachedCollection(table, updatedData);
        console.log(`✅ Updated/created cache for ${table} after offline create`);
        
        // Invalidate filtered caches to ensure consistency
        invalidateFilteredCaches(table);
      } catch (cacheError) {
        console.warn('Cache update failed after offline create:', cacheError);
      }
      
      // Add to sync queue for later
      addToSyncQueue(table, 'insert', itemData);
      
      return { success: true, data: itemData };
    }
  } catch (error: any) {
    console.error(`Error creating ${table}:`, error);
    
    // Check for PGRST204 error specifically for settings table
    if (error.code === 'PGRST204' && table === 'settings') {
      // Extract missing column from error message
      const columnMatch = error.message?.match(/Could not find the '([^']+)' column/);
      const missingColumn = columnMatch ? columnMatch[1] : 'unknown column';
      
      const enhancedError = {
        ...error,
        userMessage: `Database schema error: The settings table is missing the '${missingColumn}' column. Please run the database migration to fix this issue.`,
        fixInstructions: {
          title: 'How to fix this error:',
          steps: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to the SQL Editor', 
            '3. Copy and run the complete SQL script from fix_settings_complete.sql',
            '4. This will add ALL missing columns including: address, logo, english_name, email, phone_whatsapp, phone_call, default_installments, and receipt number fields',
            '5. Clear browser cache and restart the development server',
            '6. Try the operation again'
          ]
        }
      };
      return { success: false, error: error.message, details: enhancedError };
    }
    
    // Check for PGRST204 error specifically for installments table balance column
    if (error.code === 'PGRST204' && table === 'installments' && error.message?.includes("balance")) {
      const enhancedError = {
        ...error,
        userMessage: `Database schema error: The installments table is missing the 'balance' column required for automatic balance calculation. Please run the database migration to fix this issue.`,
        fixInstructions: {
          title: 'How to fix this error:',
          steps: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to the SQL Editor', 
            '3. Copy and run the SQL script from supabase/add_balance_column.sql',
            '4. This will add the missing balance column to both installments and fees tables',
            '5. The script will also update existing records with calculated balance values',
            '6. Clear browser cache and try the operation again'
          ]
        }
      };
      return { success: false, error: error.message, details: enhancedError };
    }
    
    // Check for PGRST204 error specifically for fees table balance column
    if (error.code === 'PGRST204' && table === 'fees' && error.message?.includes("balance")) {
      const enhancedError = {
        ...error,
        userMessage: `Database schema error: The fees table is missing the 'balance' column required for automatic balance calculation. Please run the database migration to fix this issue.`,
        fixInstructions: {
          title: 'How to fix this error:',
          steps: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to the SQL Editor', 
            '3. Copy and run the SQL script from supabase/add_balance_column.sql',
            '4. This will add the missing balance column to both installments and fees tables',
            '5. The script will also update existing records with calculated balance values',
            '6. Clear browser cache and try the operation again'
          ]
        }
      };
      return { success: false, error: error.message, details: enhancedError };
    }
    
    // Check for other database schema errors
    if (error.code === 'PGRST204') {
      const columnMatch = error.message?.match(/Could not find the '([^']+)' column/);
      const missingColumn = columnMatch ? columnMatch[1] : 'unknown column';
      
      return { 
        success: false, 
        error: `Database schema error: Missing column '${missingColumn}' in table '${table}'. Please check your database schema.`,
        details: error
      };
    }
    
    return { success: false, error: error.message };
  }
};

// Update an existing item
export const update = async (table: string, id: string, data: any): Promise<ApiResponse> => {
  try {
    // Add updated_at timestamp and increment version for optimistic locking
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
      version: (data.version || 0) + 1
    };

    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      // Check authentication before attempting to update
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Authentication required for database operations');
        return { success: false, error: 'Authentication required. Please log in again.' };
      }
      
      // First, get the current record to check version for optimistic locking
      const { data: currentRecord, error: fetchError } = await supabase
        .from(table)
        .select('version, updated_at')
        .eq('id', id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`Error fetching current record for version check:`, fetchError);
        // Continue with update without version check if fetch fails
      } else if (currentRecord && data.version !== undefined) {
        // Check for version conflict (optimistic locking)
        if (currentRecord.version && currentRecord.version !== data.version) {
          return {
            success: false,
            error: `Version conflict: Record has been modified by another user. Please refresh and try again.`,
            details: {
              type: 'VERSION_CONFLICT',
              currentVersion: currentRecord.version,
              attemptedVersion: data.version
            }
          };
        }
      }
      
      const { data: result, error } = await supabase.from(table).update(updateData).eq('id', id).select();
      if (error) {
        // Handle RLS policy violations specifically
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: 'Permission denied. Please ensure you are logged in and have access to this school\'s data.',
            details: error
          };
        }
        throw error;
      }
      
      // Update cache with modified item
      try {
        const cached = getCachedCollection(table);
        if (cached && cached.data) {
          const updatedData = cached.data.map(item => 
            item.id === id ? result[0] : item
          );
          saveCachedCollection(table, updatedData);
          console.log(`✅ Updated cache for ${table} after update`);
        }
        
        // CRITICAL FIX: Also invalidate filtered caches to ensure consistency
        // This ensures queries with filters (like schoolId) get fresh data
        invalidateFilteredCaches(table);
      } catch (cacheError) {
        console.warn('Cache update failed after update:', cacheError);
      }
      
      return { success: true, data: result[0] };
    } else {
      // Fallback to localStorage
      await simulateDelay();
      const items = getCollection(table);
      const index = items.findIndex(i => i.id === id);
      
      if (index !== -1) {
        // Check version conflict in offline mode too
        if (data.version !== undefined && items[index].version && items[index].version !== data.version) {
          return {
            success: false,
            error: `Version conflict: Record has been modified. Please refresh and try again.`,
            details: {
              type: 'VERSION_CONFLICT',
              currentVersion: items[index].version,
              attemptedVersion: data.version
            }
          };
        }
        
        const updatedItem = { ...items[index], ...updateData };
        items[index] = updatedItem;
        saveCollection(table, items);
        
        // Always update cache for immediate UI updates, create cache if it doesn't exist
        try {
          const cached = getCachedCollection(table);
          let updatedData;
          if (cached && cached.data) {
            updatedData = cached.data.map(item => 
              item.id === id ? updatedItem : item
            );
          } else {
            // Create new cache with current localStorage data
            updatedData = [...items];
          }
          saveCachedCollection(table, updatedData);
          console.log(`✅ Updated/created cache for ${table} after offline update`);
          
          // Invalidate filtered caches to ensure consistency
          invalidateFilteredCaches(table);
        } catch (cacheError) {
          console.warn('Cache update failed after offline update:', cacheError);
        }
        
        // Add to sync queue for later
        addToSyncQueue(table, 'update', updatedItem);
        
        return { success: true, data: updatedItem };
      } else {
        return { success: false, error: `Item not found in ${table}` };
      }
    }
  } catch (error: any) {
    console.error(`Error updating ${table}:`, error);
    
    // Check for PGRST204 error specifically for settings table
    if (error.code === 'PGRST204' && table === 'settings') {
      // Extract missing column from error message
      const columnMatch = error.message?.match(/Could not find the '([^']+)' column/);
      const missingColumn = columnMatch ? columnMatch[1] : 'unknown column';
      
      const enhancedError = {
        ...error,
        userMessage: `Database schema error: The settings table is missing the '${missingColumn}' column. Please run the database migration to fix this issue.`,
        fixInstructions: {
          title: 'How to fix this error:',
          steps: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to the SQL Editor', 
            '3. Copy and run the complete SQL script from fix_settings_complete.sql',
            '4. This will add ALL missing columns including: address, logo, english_name, email, phone_whatsapp, phone_call, default_installments, and receipt number fields',
            '5. Clear browser cache and restart the development server',
            '6. Try the operation again'
          ]
        }
      };
      return { success: false, error: error.message, details: enhancedError };
    }
    
    // Check for other database schema errors
    if (error.code === 'PGRST204') {
      const columnMatch = error.message?.match(/Could not find the '([^']+)' column/);
      const missingColumn = columnMatch ? columnMatch[1] : 'unknown column';
      
      return { 
        success: false, 
        error: `Database schema error: Missing column '${missingColumn}' in table '${table}'. Please check your database schema.`,
        details: error
      };
    }
    
    return { success: false, error: error.message };
  }
};

// Delete an item
export const remove = async (table: string, id: string): Promise<ApiResponse> => {
  try {
    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      // Check authentication before attempting to delete
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error('Authentication required for database operations');
        return { success: false, error: 'Authentication required. Please log in again.' };
      }
      
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        // Handle RLS policy violations specifically
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          return { 
            success: false, 
            error: 'Permission denied. Please ensure you are logged in and have access to this school\'s data.',
            details: error
          };
        }
        throw error;
      }
      
      // Remove item from cache
      try {
        const cached = getCachedCollection(table);
        if (cached && cached.data) {
          const updatedData = cached.data.filter(item => item.id !== id);
          saveCachedCollection(table, updatedData);
          console.log(`✅ Updated cache for ${table} after delete`);
          
          // Invalidate filtered caches to ensure consistency
          invalidateFilteredCaches(table);
        }
      } catch (cacheError) {
        console.warn('Cache update failed after delete:', cacheError);
      }
      
      return { success: true };
    } else {
      // Fallback to localStorage
      await simulateDelay();
      const items = getCollection(table);
      const filteredItems = items.filter(i => i.id !== id);
      saveCollection(table, filteredItems);
      
      // Update cache to remove deleted item for immediate UI updates
      try {
        const cached = getCachedCollection(table);
        if (cached && cached.data) {
          const updatedData = cached.data.filter(item => item.id !== id);
          saveCachedCollection(table, updatedData);
          console.log(`✅ Updated cache for ${table} after offline delete`);
          
          // Invalidate filtered caches to ensure consistency
          invalidateFilteredCaches(table);
        }
      } catch (cacheError) {
        console.warn('Cache update failed after offline delete:', cacheError);
      }
      
      // Add to sync queue for later
      addToSyncQueue(table, 'delete', { id });
      
      return { success: true };
    }
  } catch (error: any) {
    console.error(`Error deleting from ${table}:`, error);
    return { success: false, error: error.message };
  }
};

// Specific API functions for each entity

// Schools API
export const getSchools = async (): Promise<ApiResponse> => {
  const response = await getAll(STORAGE_KEYS.SCHOOLS);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((school: any) => ({
      ...school,
      englishName: school.english_name,
      phoneWhatsapp: school.phone_whatsapp,
      phoneCall: school.phone_call,
      subscriptionStart: school.subscription_start,
      subscriptionEnd: school.subscription_end,
      // Keep snake_case versions for backward compatibility
      english_name: school.english_name,
      phone_whatsapp: school.phone_whatsapp,
      phone_call: school.phone_call,
      subscription_start: school.subscription_start,
      subscription_end: school.subscription_end
    }));
  }
  
  return response;
};

export const getSchool = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.SCHOOLS, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      englishName: response.data.english_name,
      phoneWhatsapp: response.data.phone_whatsapp,
      phoneCall: response.data.phone_call,
      subscriptionStart: response.data.subscription_start,
      subscriptionEnd: response.data.subscription_end,
      // Keep snake_case versions for backward compatibility
      english_name: response.data.english_name,
      phone_whatsapp: response.data.phone_whatsapp,
      phone_call: response.data.phone_call,
      subscription_start: response.data.subscription_start,
      subscription_end: response.data.subscription_end
    };
  }
  
  return response;
};

export const createSchool = async (schoolData: any): Promise<ApiResponse> => {
  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    ...schoolData,
    english_name: schoolData.englishName,
    phone_whatsapp: schoolData.phoneWhatsapp,
    phone_call: schoolData.phoneCall,
    subscription_start: schoolData.subscriptionStart,
    subscription_end: schoolData.subscriptionEnd,
    // Remove camelCase versions to avoid conflicts
    englishName: undefined,
    phoneWhatsapp: undefined,
    phoneCall: undefined,
    subscriptionStart: undefined,
    subscriptionEnd: undefined
  };
  
  return create(STORAGE_KEYS.SCHOOLS, mappedData);
};

export const updateSchool = async (id: string, schoolData: any): Promise<ApiResponse> => {
  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    ...schoolData,
    english_name: schoolData.englishName,
    phone_whatsapp: schoolData.phoneWhatsapp,
    phone_call: schoolData.phoneCall,
    subscription_start: schoolData.subscriptionStart,
    subscription_end: schoolData.subscriptionEnd,
    // Remove camelCase versions to avoid conflicts
    englishName: undefined,
    phoneWhatsapp: undefined,
    phoneCall: undefined,
    subscriptionStart: undefined,
    subscriptionEnd: undefined
  };
  
  return update(STORAGE_KEYS.SCHOOLS, id, mappedData);
};

export const deleteSchool = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.SCHOOLS, id);
};

// Save school function (create or update based on whether ID exists)
export const saveSchool = async (schoolData: any): Promise<ApiResponse> => {
  if (schoolData.id) {
    // Update existing school
    const { id, ...updateData } = schoolData;
    return updateSchool(id, updateData);
  } else {
    // Create new school
    return createSchool(schoolData);
  }
};

// Subscriptions API
export const getSubscriptions = async (schoolId?: string): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  
  const response = await getAll(STORAGE_KEYS.SUBSCRIPTIONS, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((subscription: any) => ({
      ...subscription,
      schoolId: subscription.school_id,
      contactEmail: subscription.contact_email,
      subscriptionStart: subscription.subscription_start,
      subscriptionEnd: subscription.subscription_end,
      paymentStatus: subscription.payment_status,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at
    }));
  }
  
  return response;
};

export const getSubscription = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.SUBSCRIPTIONS, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      schoolId: response.data.school_id,
      contactEmail: response.data.contact_email,
      subscriptionStart: response.data.subscription_start,
      subscriptionEnd: response.data.subscription_end,
      paymentStatus: response.data.payment_status,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at
    };
  }
  
  return response;
};

export const createSubscription = async (subscriptionData: any): Promise<ApiResponse> => {
  // Handle both camelCase and snake_case input
  const dbData = {
    school_id: subscriptionData.school_id || subscriptionData.schoolId,
    contact_email: subscriptionData.contact_email || subscriptionData.contactEmail,
    subscription_start: subscriptionData.subscription_start || subscriptionData.subscriptionStart,
    subscription_end: subscriptionData.subscription_end || subscriptionData.subscriptionEnd,
    amount: subscriptionData.amount,
    currency: subscriptionData.currency || 'USD',
    status: subscriptionData.status || 'active',
    payment_status: subscriptionData.payment_status || subscriptionData.paymentStatus || 'pending',
    notes: subscriptionData.notes || ''
  };
  
  return create(STORAGE_KEYS.SUBSCRIPTIONS, dbData);
};

export const updateSubscription = async (id: string, subscriptionData: any): Promise<ApiResponse> => {
  // Convert camelCase to snake_case for database
  const dbData = {
    school_id: subscriptionData.schoolId,
    contact_email: subscriptionData.contactEmail,
    subscription_start: subscriptionData.subscriptionStart,
    subscription_end: subscriptionData.subscriptionEnd,
    amount: subscriptionData.amount,
    currency: subscriptionData.currency,
    status: subscriptionData.status,
    payment_status: subscriptionData.paymentStatus,
    notes: subscriptionData.notes
  };
  
  return update(STORAGE_KEYS.SUBSCRIPTIONS, id, dbData);
};

export const deleteSubscription = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.SUBSCRIPTIONS, id);
};

export const saveSubscription = async (subscriptionData: any): Promise<ApiResponse> => {
  if (subscriptionData.id) {
    // Update existing subscription
    const { id, ...updateData } = subscriptionData;
    return updateSubscription(id, updateData);
  } else {
    // Create new subscription
    return createSubscription(subscriptionData);
  }
};

// Students API
export const getStudents = async (schoolId?: string, gradeLevel?: string | string[]): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  if (gradeLevel) filters.grade = gradeLevel;
  
  const response = await getAll(STORAGE_KEYS.STUDENTS, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((student: any) => ({
      ...student,
      studentId: student.student_id,
      parentName: student.parent_name,
      parentEmail: student.parent_email,
      englishName: student.english_name,
      englishGrade: student.english_grade,
      transportationDirection: student.transportation_direction,
      transportationFee: student.transportation_fee,
      customTransportationFee: student.custom_transportation_fee,
      schoolId: student.school_id
    }));
  }
  
  return response;
};

export const getStudent = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.STUDENTS, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      studentId: response.data.student_id,
      parentName: response.data.parent_name,
      parentEmail: response.data.parent_email,
      englishName: response.data.english_name,
      englishGrade: response.data.english_grade,
      transportationDirection: response.data.transportation_direction,
      transportationFee: response.data.transportation_fee,
      customTransportationFee: response.data.custom_transportation_fee,
      schoolId: response.data.school_id
    };
  }
  
  return response;
};

export const createStudent = async (studentData: any): Promise<ApiResponse> => {
  // Validate required fields to avoid Supabase 23502 (not-null) errors
  const requiredFields = {
    name: studentData?.name,
    grade: studentData?.grade,
    school_id: studentData?.schoolId || studentData?.school_id
  };
  for (const [field, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined) {
      console.error('createStudent - Missing required field:', field, 'value:', value);
      return { success: false, error: `Missing required student field: '${field}'` };
    }
  }

  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    ...studentData,
    student_id: studentData.studentId,
    parent_name: studentData.parentName,
    parent_email: studentData.parentEmail,
    english_name: studentData.englishName,
    english_grade: studentData.englishGrade,
    whatsapp: studentData.whatsapp,
    address: studentData.address,
    transportation_direction: studentData.transportationDirection,
    transportation_fee: studentData.transportationFee,
    custom_transportation_fee: studentData.customTransportationFee,
    school_id: studentData.schoolId,
    // Remove camelCase versions to avoid conflicts
    studentId: undefined,
    parentName: undefined,
    parentEmail: undefined,
    englishName: undefined,
    englishGrade: undefined,
    transportationDirection: undefined,
    transportationFee: undefined,
    customTransportationFee: undefined,
    schoolId: undefined
  };
  
  console.log('createStudent - Input data:', {
    originalSchoolId: studentData.schoolId,
    mappedSchoolId: mappedData.school_id,
    studentName: mappedData.name,
    studentId: mappedData.student_id
  });
  
  const result = await create(STORAGE_KEYS.STUDENTS, mappedData);
  
  console.log('createStudent - Result:', {
    success: result.success,
    error: result.error,
    dataId: result.data?.id
  });
  
  return result;
};

export const updateStudent = async (id: string, studentData: any): Promise<ApiResponse> => {
  // Validate required fields to avoid Supabase 23502 (not-null) errors
  const requiredFields = {
    name: studentData?.name,
    grade: studentData?.grade,
    school_id: studentData?.schoolId || studentData?.school_id
  };
  for (const [field, value] of Object.entries(requiredFields)) {
    if (value === null || value === undefined) {
      console.error('updateStudent - Missing required field:', field, 'value:', value);
      return { success: false, error: `Missing required student field: '${field}'` };
    }
  }

  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    ...studentData,
    student_id: studentData.studentId,
    parent_name: studentData.parentName,
    parent_email: studentData.parentEmail,
    english_name: studentData.englishName,
    english_grade: studentData.englishGrade,
    whatsapp: studentData.whatsapp,
    address: studentData.address,
    transportation_direction: studentData.transportationDirection,
    transportation_fee: studentData.transportationFee,
    custom_transportation_fee: studentData.customTransportationFee,
    school_id: studentData.schoolId,
    // Remove camelCase versions to avoid conflicts
    studentId: undefined,
    parentName: undefined,
    parentEmail: undefined,
    englishName: undefined,
    englishGrade: undefined,
    transportationDirection: undefined,
    transportationFee: undefined,
    customTransportationFee: undefined,
    schoolId: undefined
  };
  
  return update(STORAGE_KEYS.STUDENTS, id, mappedData);
};

export const deleteStudent = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.STUDENTS, id);
};

// Save student function (create or update based on whether ID exists)
export const saveStudent = async (studentData: any): Promise<ApiResponse> => {
  if (studentData.id) {
    // Update existing student
    const { id, ...updateData } = studentData;
    return updateStudent(id, updateData);
  } else {
    // Create new student
    return createStudent(studentData);
  }
};

// Fees API
export const getFees = async (schoolId?: string, studentId?: string, grades?: string | string[]): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  // Optional grade-level filter for role-based views
  if (grades && (Array.isArray(grades) ? grades.length > 0 : true)) {
    filters.grade = Array.isArray(grades) ? grades : [grades];
  }
  
  // Handle studentId - it could be either a UUID (id) or student identifier (student_id)
  if (studentId) {
    // Check if studentId is a UUID format (contains hyphens and is 36 characters)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
    
    if (isUUID) {
      // It's a UUID, use it directly as student_id
      filters.student_id = studentId;
    } else {
      // It's a student identifier (like K1001), need to find the student first
       // Query by student_id field (the identifier) to get the student record
       const studentsResponse = await getAll(STORAGE_KEYS.STUDENTS, { student_id: studentId });
       if (studentsResponse.success && studentsResponse.data && studentsResponse.data.length > 0) {
         // Use the UUID (id field) of the found student for fees query
         filters.student_id = studentsResponse.data[0].id;
       } else {
         // Student not found, return empty result
         return {
           success: true,
           data: [],
           error: undefined
         };
       }
    }
  }
  
  const response = await getAll(STORAGE_KEYS.FEES, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    // CRITICAL FIX: Use database values directly instead of recalculating
    // The SQL triggers now handle all balance and status calculations correctly
    const feesWithMappedFields = response.data.map((fee: any) => {
        return {
          ...fee,
          // Ensure numeric fields are correctly typed
          amount: Number(fee.amount || 0),
          discount: Number(fee.discount || 0),
          // Use database values directly - SQL triggers ensure these are correct
          paid: fee.paid || 0,
          balance: fee.balance || 0,
          status: fee.status || 'unpaid',
          studentId: fee.student_id,
          studentName: fee.student_name,
          schoolId: fee.school_id,
          feeType: fee.fee_type,
          dueDate: fee.due_date,
          paymentDate: fee.payment_date,
          paymentMethod: fee.payment_method,
          paymentNote: fee.payment_note,
          receiptNumber: fee.receipt_number,
          checkNumber: fee.check_number,
          checkDate: fee.check_date,
          bankNameArabic: fee.bank_name_arabic,
          bankNameEnglish: fee.bank_name_english,
          transportationType: fee.transportation_type,
          includesTransportation: fee.includes_transportation,
          createdAt: fee.created_at,
          updatedAt: fee.updated_at,
          // Keep snake_case versions for backward compatibility
          student_id: fee.student_id,
          student_name: fee.student_name,
          school_id: fee.school_id,
          fee_type: fee.fee_type,
          due_date: fee.due_date,
          payment_date: fee.payment_date,
          payment_method: fee.payment_method,
          payment_note: fee.payment_note,
          receipt_number: fee.receipt_number,
          check_number: fee.check_number,
          check_date: fee.check_date,
          bank_name_arabic: fee.bank_name_arabic,
          bank_name_english: fee.bank_name_english,
          transportation_type: fee.transportation_type,
          includes_transportation: fee.includes_transportation,
          created_at: fee.created_at,
          updated_at: fee.updated_at
        };
      });
    
    response.data = feesWithMappedFields;
  }
  
  return response;
};

export const getFee = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.FEES, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    const fee = response.data;
    
    // Get installments for this fee and calculate paid amounts
    const installmentsResponse = await getAll(STORAGE_KEYS.INSTALLMENTS, { fee_id: fee.id });
    const installments = installmentsResponse.success ? installmentsResponse.data : [];
    
    // Calculate total paid from installments
    const totalPaidFromInstallments = installments.reduce((sum: number, inst: any) => {
      return sum + (inst.paid_amount || 0);
    }, 0);
    
    // Calculate balance
    const netAmount = fee.amount - (fee.discount || 0);
    const calculatedBalance = Math.max(0, netAmount - totalPaidFromInstallments);
    
    // Determine status based on payments
    let calculatedStatus = 'unpaid';
    if (totalPaidFromInstallments > 0) {
      calculatedStatus = calculatedBalance > 0 ? 'partial' : 'paid';
    }
    
    response.data = {
      ...fee,
      paid: totalPaidFromInstallments, // Use calculated total from installments
      balance: calculatedBalance,
      status: calculatedStatus,
      studentId: fee.student_id,
      studentName: fee.student_name,
      schoolId: fee.school_id,
      feeType: fee.fee_type,
      dueDate: fee.due_date,
      paymentDate: fee.payment_date,
      paymentMethod: fee.payment_method,
      paymentNote: fee.payment_note,
      receiptNumber: fee.receipt_number,
      checkNumber: fee.check_number,
      checkDate: fee.check_date,
      bankNameArabic: fee.bank_name_arabic,
      bankNameEnglish: fee.bank_name_english,
      transportationType: fee.transportation_type,
      includesTransportation: fee.includes_transportation,
      createdAt: fee.created_at,
      updatedAt: fee.updated_at,
      // Keep snake_case versions for backward compatibility
      student_id: fee.student_id,
      student_name: fee.student_name,
      school_id: fee.school_id,
      fee_type: fee.fee_type,
      due_date: fee.due_date,
      payment_date: fee.payment_date,
      payment_method: fee.payment_method,
      payment_note: fee.payment_note,
      receipt_number: fee.receipt_number,
      check_number: fee.check_number,
      check_date: fee.check_date,
      bank_name_arabic: fee.bank_name_arabic,
      bank_name_english: fee.bank_name_english,
      transportation_type: fee.transportation_type,
      includes_transportation: fee.includes_transportation,
      created_at: fee.created_at,
      updated_at: fee.updated_at
    };
  }
  
  return response;
};

// Alias for backward compatibility
export const getFeeById = getFee;

export const createFee = async (feeData: any): Promise<ApiResponse> => {
  // Calculate balance if not provided (amount - discount - paid)
  const amount = feeData.amount || 0;
  const discount = feeData.discount || 0;
  const paid = feeData.paid || 0;
  const calculatedBalance = Math.max(0, amount - discount - paid);
  
  // Only include valid database fields for the fees table
  const mappedData: Record<string, any> = {
    school_id: feeData.schoolId || feeData.school_id,
    student_id: feeData.studentId || feeData.student_id,
    student_name: feeData.studentName || feeData.student_name,
    grade: feeData.grade,
    fee_type: feeData.feeType || feeData.fee_type,
    description: feeData.description,
    amount: amount,
    discount: discount,
    paid: paid,
    balance: feeData.balance !== undefined ? feeData.balance : calculatedBalance,
    status: feeData.status,
    due_date: feeData.dueDate || feeData.due_date,
    transportation_type: feeData.transportationType || feeData.transportation_type,
    payment_date: feeData.paymentDate || feeData.payment_date,
    payment_method: feeData.paymentMethod || feeData.payment_method,
    payment_note: feeData.paymentNote || feeData.payment_note,
    check_number: feeData.checkNumber || feeData.check_number,
    check_date: feeData.checkDate || feeData.check_date,
    bank_name_arabic: feeData.bankNameArabic || feeData.bank_name_arabic,
    bank_name_english: feeData.bankNameEnglish || feeData.bank_name_english,
    receipt_number: feeData.receiptNumber || feeData.receipt_number
  };
  
  // Remove undefined values to avoid database errors
  Object.keys(mappedData).forEach(key => {
    if (mappedData[key] === undefined) {
      delete mappedData[key];
    }
  });
  
  return create(STORAGE_KEYS.FEES, mappedData);
};

export const updateFee = async (id: string, feeData: any): Promise<ApiResponse> => {
  // Only include valid database fields for the fees table
  const mappedData: Record<string, any> = {
    school_id: feeData.schoolId || feeData.school_id,
    student_id: feeData.studentId || feeData.student_id,
    student_name: feeData.studentName || feeData.student_name,
    grade: feeData.grade,
    fee_type: feeData.feeType || feeData.fee_type,
    description: feeData.description,
    amount: feeData.amount,
    discount: feeData.discount,
    paid: feeData.paid,
    balance: feeData.balance,
    status: feeData.status,
    due_date: feeData.dueDate || feeData.due_date,
    transportation_type: feeData.transportationType || feeData.transportation_type,
    payment_date: feeData.paymentDate || feeData.payment_date,
    payment_method: feeData.paymentMethod || feeData.payment_method,
    payment_note: feeData.paymentNote || feeData.payment_note,
    check_number: feeData.checkNumber || feeData.check_number,
    check_date: feeData.checkDate || feeData.check_date,
    bank_name_arabic: feeData.bankNameArabic || feeData.bank_name_arabic,
    bank_name_english: feeData.bankNameEnglish || feeData.bank_name_english,
    receipt_number: feeData.receiptNumber || feeData.receipt_number
  };
  
  // Remove undefined values to avoid database errors
  Object.keys(mappedData).forEach(key => {
    if (mappedData[key] === undefined) {
      delete mappedData[key];
    }
  });
  
  return update(STORAGE_KEYS.FEES, id, mappedData);
};

export const deleteFee = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.FEES, id);
};

// Save fee function (create or update based on whether ID exists)
export const saveFee = async (feeData: any): Promise<ApiResponse> => {
  if (feeData.id) {
    // Update existing fee
    const { id, ...updateData } = feeData;
    return updateFee(id, updateData);
  } else {
    // Create new fee
    return createFee(feeData);
  }
};

// ============= BATCH UPDATE FUNCTIONS FOR PERFORMANCE =============
// These functions update multiple records in a single database operation
// and only invalidate cache once at the end, avoiding cache thrashing

/**
 * Batch update multiple fees in a single operation
 * Much faster than calling saveFee() in a loop
 */
export const batchUpdateFees = async (feesData: any[]): Promise<ApiResponse> => {
  if (!feesData || feesData.length === 0) {
    return { success: true, data: [] };
  }
  
  const startTime = Date.now();
  console.log(`[BatchUpdate] Starting batch update for ${feesData.length} fees`);
  
  try {
    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: 'Authentication required. Please log in again.' };
      }
      
      // OPTIMIZED: Only send payment-related fields that actually change
      // This dramatically reduces payload size and database processing time
      const mappedFees = feesData.map(feeData => {
        const minimalUpdate: any = {
          id: feeData.id, // Required for upsert
          // Payment fields only
          paid: feeData.paid,
          balance: feeData.balance,
          status: feeData.status,
          payment_date: feeData.paymentDate || feeData.payment_date,
          payment_method: feeData.paymentMethod || feeData.payment_method,
          updated_at: new Date().toISOString()
        };
        
        // Only include optional payment fields if they have values
        if (feeData.paymentNote || feeData.payment_note) {
          minimalUpdate.payment_note = feeData.paymentNote || feeData.payment_note;
        }
        if (feeData.checkNumber || feeData.check_number) {
          minimalUpdate.check_number = feeData.checkNumber || feeData.check_number;
        }
        if (feeData.checkDate || feeData.check_date) {
          minimalUpdate.check_date = feeData.checkDate || feeData.check_date;
        }
        if (feeData.bankNameArabic || feeData.bank_name_arabic) {
          minimalUpdate.bank_name_arabic = feeData.bankNameArabic || feeData.bank_name_arabic;
        }
        if (feeData.bankNameEnglish || feeData.bank_name_english) {
          minimalUpdate.bank_name_english = feeData.bankNameEnglish || feeData.bank_name_english;
        }
        if (feeData.receiptNumber || feeData.receipt_number) {
          minimalUpdate.receipt_number = feeData.receiptNumber || feeData.receipt_number;
        }
        
        return minimalUpdate;
      });
      
      console.log(`[BatchUpdate] Sending minimal payload: ${JSON.stringify(mappedFees).length} bytes`);
      
      // OPTIMIZED: Use parallel individual updates instead of upsert for better performance
      // Upsert with onConflict can be slow due to constraint checking
      const updatePromises = mappedFees.map(fee => {
        const { id, ...updateData } = fee;
        return supabase
          .from('fees')
          .update(updateData)
          .eq('id', id);
      });
      
      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[BatchUpdate] Some updates failed:', errors.map(e => e.error));
      }
      
      // Single cache invalidation at the end
      invalidateCache('fees');
      
      console.log(`[BatchUpdate] Completed ${feesData.length} fees in ${Date.now() - startTime}ms`);
      return { success: true, data: mappedFees };
    } else {
      // Offline fallback - update localStorage
      const items = getCollection(STORAGE_KEYS.FEES);
      
      for (const feeData of feesData) {
        const index = items.findIndex(i => i.id === feeData.id);
        if (index !== -1) {
          items[index] = { ...items[index], ...feeData, updated_at: new Date().toISOString() };
        }
      }
      
      saveCollection(STORAGE_KEYS.FEES, items);
      invalidateCache('fees');
      
      console.log(`[BatchUpdate] Completed ${feesData.length} fees offline in ${Date.now() - startTime}ms`);
      return { success: true, data: items };
    }
  } catch (error: any) {
    console.error('[BatchUpdate] Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Batch update multiple installments in a single operation
 */
export const batchUpdateInstallments = async (installmentsData: any[]): Promise<ApiResponse> => {
  if (!installmentsData || installmentsData.length === 0) {
    return { success: true, data: [] };
  }
  
  const startTime = Date.now();
  console.log(`[BatchUpdate] Starting batch update for ${installmentsData.length} installments`);
  
  try {
    const isOnline = await isSupabaseAvailable();
    
    if (isOnline && shouldUseSupabase()) {
      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: 'Authentication required. Please log in again.' };
      }
      
      // Map all installments to database format
      const mappedInstallments = installmentsData.map(inst => ({
        id: inst.id,
        student_id: inst.studentId || inst.student_id,
        student_name: inst.studentName || inst.student_name,
        school_id: inst.schoolId || inst.school_id,
        fee_id: inst.feeId || inst.fee_id,
        fee_type: inst.feeType || inst.fee_type,
        amount: inst.amount,
        due_date: inst.dueDate || inst.due_date,
        paid_date: inst.paidDate || inst.paid_date,
        paid_amount: inst.paidAmount || inst.paid_amount,
        balance: inst.balance,
        status: inst.status,
        grade: inst.grade,
        installment_count: inst.installmentCount || inst.installment_count,
        installment_number: inst.installmentNumber || inst.installment_number,
        installment_month: inst.installmentMonth || inst.installment_month,
        payment_method: inst.paymentMethod || inst.payment_method,
        payment_note: inst.paymentNote || inst.payment_note,
        receipt_number: inst.receiptNumber || inst.receipt_number,
        check_number: inst.checkNumber || inst.check_number,
        check_date: inst.checkDate || inst.check_date,
        bank_name_arabic: inst.bankNameArabic || inst.bank_name_arabic,
        bank_name_english: inst.bankNameEnglish || inst.bank_name_english,
        discount: inst.discount,
        updated_at: new Date().toISOString()
      }));
      
      // Remove undefined values
      mappedInstallments.forEach(inst => {
        Object.keys(inst).forEach(key => {
          if ((inst as any)[key] === undefined) {
            delete (inst as any)[key];
          }
        });
      });
      
      // Single upsert operation for all installments
      const { data: result, error } = await supabase
        .from('installments')
        .upsert(mappedInstallments, { onConflict: 'id' })
        .select();
      
      if (error) {
        console.error('[BatchUpdate] Supabase error:', error);
        throw error;
      }
      
      // Single cache invalidation at the end
      invalidateCache('installments');
      
      console.log(`[BatchUpdate] Completed ${installmentsData.length} installments in ${Date.now() - startTime}ms`);
      return { success: true, data: result };
    } else {
      // Offline fallback
      const items = getCollection(STORAGE_KEYS.INSTALLMENTS);
      
      for (const instData of installmentsData) {
        const index = items.findIndex(i => i.id === instData.id);
        if (index !== -1) {
          items[index] = { ...items[index], ...instData, updated_at: new Date().toISOString() };
        }
      }
      
      saveCollection(STORAGE_KEYS.INSTALLMENTS, items);
      invalidateCache('installments');
      
      console.log(`[BatchUpdate] Completed ${installmentsData.length} installments offline in ${Date.now() - startTime}ms`);
      return { success: true, data: items };
    }
  } catch (error: any) {
    console.error('[BatchUpdate] Error:', error);
    return { success: false, error: error.message };
  }
};

// Installments API
export const getInstallments = async (schoolId?: string, studentId?: string, feeId?: string, grades?: string | string[]): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  if (studentId) filters.student_id = studentId;
  if (feeId) filters.fee_id = feeId;
  // Optional grade-level filter for role-based views
  if (grades && (Array.isArray(grades) ? grades.length > 0 : true)) {
    filters.grade = Array.isArray(grades) ? grades : [grades];
  }
  
  const response = await getAll(STORAGE_KEYS.INSTALLMENTS, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((installment: any) => {
      const mappedInstallment = {
        ...installment,
        studentId: installment.student_id,
        studentName: installment.student_name,
        schoolId: installment.school_id,
        feeId: installment.fee_id,
        feeType: installment.fee_type,
        dueDate: installment.due_date,
        paidDate: installment.paid_date,
        paidAmount: installment.paid_amount,
        installmentCount: installment.installment_count,
        installmentNumber: installment.installment_number,
        installmentMonth: installment.installment_month,
        paymentMethod: installment.payment_method,
        paymentNote: installment.payment_note,
        checkNumber: installment.check_number,
        checkDate: installment.check_date,
        bankNameArabic: installment.bank_name_arabic,
        bankNameEnglish: installment.bank_name_english,
        discount: installment.discount,
        receiptNumber: installment.receipt_number, // CRITICAL: Map receipt_number to receiptNumber
        createdAt: installment.created_at,
        updatedAt: installment.updated_at,
        // Keep snake_case versions for backward compatibility
        student_id: installment.student_id,
        student_name: installment.student_name,
        school_id: installment.school_id,
        fee_id: installment.fee_id,
        fee_type: installment.fee_type,
        due_date: installment.due_date,
        paid_date: installment.paid_date,
        paid_amount: installment.paid_amount,
        installment_count: installment.installment_count,
        installment_number: installment.installment_number,
        installment_month: installment.installment_month,
        payment_method: installment.payment_method,
        payment_note: installment.payment_note,
        check_number: installment.check_number,
        check_date: installment.check_date,
        bank_name_arabic: installment.bank_name_arabic,
        bank_name_english: installment.bank_name_english,
        receipt_number: installment.receipt_number, // Keep snake_case for backward compatibility
        created_at: installment.created_at,
        updated_at: installment.updated_at
      };
      
      // FIXED: Preserve status from database - don't recalculate!
      // The status is already correctly set when saving the installment
      // Only recalculate if status is missing or for unpaid installments
      const paidAmt = mappedInstallment.paidAmount || mappedInstallment.paid_amount || 0;
      const amount = mappedInstallment.amount || 0;
      
      if (paidAmt >= amount && paidAmt > 0) {
        mappedInstallment.status = 'paid';
      } else if (paidAmt > 0 && paidAmt < amount) {
        mappedInstallment.status = 'partial';
      } else if (!mappedInstallment.status || mappedInstallment.status === 'upcoming' || mappedInstallment.status === 'overdue') {
        // Only recalculate date-based status for unpaid installments
        const dueDate = new Date(mappedInstallment.dueDate || mappedInstallment.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          mappedInstallment.status = 'overdue';
        } else {
          mappedInstallment.status = 'upcoming';
        }
      }
      
      return mappedInstallment;
    });
  }
  
  return response;
};

export const getInstallment = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.INSTALLMENTS, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      studentId: response.data.student_id,
      studentName: response.data.student_name,
      schoolId: response.data.school_id,
      feeId: response.data.fee_id,
      feeType: response.data.fee_type,
      dueDate: response.data.due_date,
      paidDate: response.data.paid_date,
      paidAmount: response.data.paid_amount,
      installmentCount: response.data.installment_count,
      installmentNumber: response.data.installment_number,
      installmentMonth: response.data.installment_month,
      paymentMethod: response.data.payment_method,
      paymentNote: response.data.payment_note,
      checkNumber: response.data.check_number,
      checkDate: response.data.check_date,
      bankNameArabic: response.data.bank_name_arabic,
      bankNameEnglish: response.data.bank_name_english,
      discount: response.data.discount,
      receiptNumber: response.data.receipt_number, // CRITICAL: Map receipt_number to receiptNumber
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
      // Keep snake_case versions for backward compatibility
      student_id: response.data.student_id,
      student_name: response.data.student_name,
      school_id: response.data.school_id,
      fee_id: response.data.fee_id,
      fee_type: response.data.fee_type,
      due_date: response.data.due_date,
      paid_date: response.data.paid_date,
      paid_amount: response.data.paid_amount,
      installment_count: response.data.installment_count,
      installment_number: response.data.installment_number,
      installment_month: response.data.installment_month,
      payment_method: response.data.payment_method,
      payment_note: response.data.payment_note,
      check_number: response.data.check_number,
      check_date: response.data.check_date,
      bank_name_arabic: response.data.bank_name_arabic,
      bank_name_english: response.data.bank_name_english,
      receipt_number: response.data.receipt_number, // Keep snake_case for backward compatibility
      created_at: response.data.created_at,
      updated_at: response.data.updated_at
    };
    
    // Update status based on current date (restore original date-based logic)
    if (response.data.paidDate || response.data.paid_date) {
      // If paidAmount is less than amount and is defined, mark as partial
      if (response.data.paidAmount !== undefined && 
          response.data.amount !== undefined && 
          response.data.paidAmount < response.data.amount && 
          response.data.paidAmount > 0) {
        response.data.status = 'partial';
      } else {
        response.data.status = 'paid';
      }
    } else {
      const dueDate = new Date(response.data.dueDate || response.data.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        response.data.status = 'overdue';
      } else {
        response.data.status = 'upcoming';
      }
    }
  }
  
  return response;
};

// Alias for backward compatibility
export const getInstallmentById = getInstallment;

export const createInstallment = async (installmentData: any): Promise<ApiResponse> => {
  // FIX #7: Enhanced validation with better error messages
  const requiredUUIDs = {
    studentId: installmentData.studentId || installmentData.student_id,
    schoolId: installmentData.schoolId || installmentData.school_id,
    feeId: installmentData.feeId || installmentData.fee_id
  };
  
  for (const [field, value] of Object.entries(requiredUUIDs)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      const errorMsg = `Invalid ${field}: "${value}". Installment data: ${JSON.stringify({
        studentName: installmentData.studentName,
        feeType: installmentData.feeType,
        amount: installmentData.amount
      })}`;
      console.error(`createInstallment - ${errorMsg}`);
      return {
        success: false,
        error: errorMsg
      };
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      const errorMsg = `Invalid ${field} format: "${value}" is not a valid UUID`;
      console.error(`createInstallment - ${errorMsg}`);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
  
  // Calculate status based on date logic before saving
  let status = installmentData.status;
  if (installmentData.paidDate || installmentData.paid_date) {
    // If paidAmount is less than amount and is defined, mark as partial
    if (installmentData.paidAmount !== undefined && 
        installmentData.amount !== undefined && 
        installmentData.paidAmount < installmentData.amount && 
        installmentData.paidAmount > 0) {
      status = 'partial';
    } else {
      status = 'paid';
    }
  } else {
    const dueDate = new Date(installmentData.dueDate || installmentData.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      status = 'overdue';
    } else {
      status = 'upcoming';
    }
  }
  
  // Ensure installmentMonth is set based on due date if not provided
  let installmentMonth = installmentData.installmentMonth;
  if (!installmentMonth && (installmentData.dueDate || installmentData.due_date)) {
    try {
      const dueDate = new Date(installmentData.dueDate || installmentData.due_date);
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      installmentMonth = monthNames[dueDate.getMonth()];
    } catch (e) {
      console.error('Error getting month name from date:', e);
    }
  }
  
  // Calculate balance (amount - paid_amount)
  const amount = installmentData.amount || 0;
  const paidAmount = installmentData.paidAmount || installmentData.paid_amount || 0;
  const balance = Math.max(0, amount - paidAmount);

  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    // Start with base data but exclude camelCase fields that will be mapped
    ...Object.fromEntries(
      Object.entries(installmentData).filter(([key]) => 
        !['studentId', 'studentName', 'schoolId', 'feeId', 'feeType', 'dueDate', 'paidDate', 'paidAmount', 
          'installmentCount', 'installmentNumber', 'installmentMonth', 'paymentMethod', 'paymentNote', 
          'receiptNumber', 'checkNumber', 'checkDate', 'bankNameArabic', 'bankNameEnglish', 'createdAt', 'updatedAt', 'paymentDate'].includes(key)
      )
    ),
    // Add calculated fields
    status, // Use calculated status
    balance, // Include calculated balance for database storage
    // Map camelCase to snake_case
    student_id: installmentData.studentId,
    student_name: installmentData.studentName,
    school_id: installmentData.schoolId,
    fee_id: installmentData.feeId,
    fee_type: installmentData.feeType,
    due_date: installmentData.dueDate,
    paid_date: installmentData.paidDate,
    paid_amount: installmentData.paidAmount,
    installment_count: installmentData.installmentCount,
    installment_number: installmentData.installmentNumber,
    installment_month: installmentMonth, // Use calculated installmentMonth
    payment_method: installmentData.paymentMethod,
    payment_note: installmentData.paymentNote,
    receipt_number: installmentData.receiptNumber,
    check_number: installmentData.checkNumber,
    check_date: installmentData.checkDate,
    bank_name_arabic: installmentData.bankNameArabic,
    bank_name_english: installmentData.bankNameEnglish,
    discount: installmentData.discount,
    // Handle timestamp fields
    created_at: installmentData.createdAt,
    updated_at: installmentData.updatedAt
  };
  
  return create(STORAGE_KEYS.INSTALLMENTS, mappedData);
};

export const updateInstallment = async (id: string, installmentData: any): Promise<ApiResponse> => {
  // Validate required UUID fields before processing (only if they are provided)
  const uuidFields = ['studentId', 'schoolId', 'feeId'];
  for (const field of uuidFields) {
    const value = installmentData[field];
    if (value !== undefined && (!value || typeof value !== 'string' || value.trim() === '')) {
      console.error(`updateInstallment - Invalid ${field}:`, value);
      return {
        success: false,
        error: `Invalid ${field}: cannot be empty or null`
      };
    }
  }
  
  // FIXED: Calculate status based on payment amount FIRST, then date
  let status = installmentData.status;
  const paidAmount = installmentData.paidAmount || installmentData.paid_amount || 0;
  const amount = installmentData.amount || 0;
  
  // Priority 1: Check payment status
  if (paidAmount >= amount && paidAmount > 0) {
    status = 'paid';
  } else if (paidAmount > 0 && paidAmount < amount) {
    status = 'partial';
  } else {
    // Priority 2: Check due date only if completely unpaid
    const dueDate = new Date(installmentData.dueDate || installmentData.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      status = 'overdue';
    } else {
      status = 'upcoming';
    }
  }
  
  // Ensure installmentMonth is set based on due date if not provided
  let installmentMonth = installmentData.installmentMonth;
  if (!installmentMonth && (installmentData.dueDate || installmentData.due_date)) {
    try {
      const dueDate = new Date(installmentData.dueDate || installmentData.due_date);
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      installmentMonth = monthNames[dueDate.getMonth()];
    } catch (e) {
      console.error('Error getting month name from date:', e);
    }
  }
  
  // Calculate balance using variables already declared above
  const balance = Math.max(0, amount - paidAmount);

  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData: Record<string, any> = {
    // Start with base data but exclude camelCase fields that will be mapped
    ...Object.fromEntries(
      Object.entries(installmentData).filter(([key]) => 
        !['studentId', 'studentName', 'schoolId', 'feeId', 'feeType', 'dueDate', 'paidDate', 'paidAmount', 
          'installmentCount', 'installmentNumber', 'installmentMonth', 'paymentMethod', 'paymentNote', 
          'receiptNumber', 'checkNumber', 'checkDate', 'bankNameArabic', 'bankNameEnglish', 'createdAt', 'updatedAt', 'paymentDate'].includes(key)
      )
    ),
    // Add calculated fields
    status, // Use calculated status
    balance, // Store calculated balance in database for triggers to work
    // Map camelCase to snake_case
    student_id: installmentData.studentId,
    student_name: installmentData.studentName,
    school_id: installmentData.schoolId,
    fee_id: installmentData.feeId,
    fee_type: installmentData.feeType,
    due_date: installmentData.dueDate,
    paid_date: installmentData.paidDate,
    paid_amount: installmentData.paidAmount,
    installment_count: installmentData.installmentCount,
    installment_number: installmentData.installmentNumber,
    installment_month: installmentMonth, // Use calculated installmentMonth
    payment_method: installmentData.paymentMethod,
    payment_note: installmentData.paymentNote,
    receipt_number: installmentData.receiptNumber,
    check_number: installmentData.checkNumber,
    check_date: installmentData.checkDate,
    bank_name_arabic: installmentData.bankNameArabic,
    bank_name_english: installmentData.bankNameEnglish,
    discount: installmentData.discount,
    // Handle timestamp fields
    created_at: installmentData.createdAt,
    updated_at: installmentData.updatedAt
  };
  
  // Remove any payment_date field that might have been included
  delete mappedData.payment_date;
  
  return update(STORAGE_KEYS.INSTALLMENTS, id, mappedData);
};

export const deleteInstallment = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.INSTALLMENTS, id);
};

// Save installment function (create or update based on whether ID exists)
export const saveInstallment = async (installmentData: any): Promise<ApiResponse> => {
  if (installmentData.id) {
    // Update existing installment
    const { id, ...updateData } = installmentData;
    return updateInstallment(id, updateData);
  } else {
    // Create new installment
    return createInstallment(installmentData);
  }
};

// Messages API
export const getMessages = async (schoolId?: string, studentId?: string, grades?: string | string[]): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  if (studentId) filters.student_id = studentId;
  if (grades && (Array.isArray(grades) ? grades.length > 0 : true)) {
    filters.grade = Array.isArray(grades) ? grades : [grades];
  }
  
  const response = await getAll(STORAGE_KEYS.MESSAGES, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((message: any) => ({
      ...message,
      studentId: message.student_id,
      studentName: message.student_name,
      parentName: message.parent_name,
      schoolId: message.school_id,
      sentAt: message.sent_at,
      // Map sender tracking fields
      sentBy: message.sent_by,
      sentByRole: message.sent_by_role,
      sentByEmail: message.sent_by_email,
      sentByGradeLevels: message.sent_by_grade_levels,
      sentById: message.sent_by_id,
      // Keep snake_case versions for backward compatibility
      student_id: message.student_id,
      student_name: message.student_name,
      parent_name: message.parent_name,
      school_id: message.school_id,
      sent_at: message.sent_at,
      sent_by: message.sent_by,
      sent_by_role: message.sent_by_role,
      sent_by_email: message.sent_by_email,
      sent_by_grade_levels: message.sent_by_grade_levels,
      sent_by_id: message.sent_by_id
    }));
  }
  
  return response;
};

export const getMessage = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.MESSAGES, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      studentId: response.data.student_id,
      studentName: response.data.student_name,
      parentName: response.data.parent_name,
      schoolId: response.data.school_id,
      sentAt: response.data.sent_at,
      // Keep snake_case versions for backward compatibility
      student_id: response.data.student_id,
      student_name: response.data.student_name,
      parent_name: response.data.parent_name,
      school_id: response.data.school_id,
      sent_at: response.data.sent_at
    };
  }
  
  return response;
};

export const createMessage = async (messageData: any): Promise<ApiResponse> => {
  // Build a whitelist payload for Supabase to avoid PGRST204 on unknown columns
  // Map camelCase fields to snake_case and avoid sending unrecognized fields like 'recipient'
  const payload: any = {
    student_id: messageData.studentId,
    student_name: messageData.studentName,
    grade: messageData.grade,
    parent_name: messageData.parentName,
    // Prefer explicit phone; fall back to recipient if provided
    phone: messageData.phone || messageData.recipient,
    template: messageData.template,
    message: messageData.message,
    sent_at: messageData.sentAt || new Date().toISOString(),
    status: messageData.status || 'pending',
    school_id: messageData.schoolId,
    // Add sender tracking fields
    sent_by: messageData.sentBy,
    sent_by_role: messageData.sentByRole,
    sent_by_email: messageData.sentByEmail,
    sent_by_grade_levels: messageData.sentByGradeLevels,
    sent_by_id: messageData.sentById
  };

  return create(STORAGE_KEYS.MESSAGES, payload);
};

export const updateMessage = async (id: string, messageData: any): Promise<ApiResponse> => {
  // Build a whitelist payload for Supabase updates
  const payload: any = {
    student_id: messageData.studentId,
    student_name: messageData.studentName,
    grade: messageData.grade,
    parent_name: messageData.parentName,
    phone: messageData.phone || messageData.recipient,
    template: messageData.template,
    message: messageData.message,
    sent_at: messageData.sentAt,
    status: messageData.status,
    school_id: messageData.schoolId
  };

  return update(STORAGE_KEYS.MESSAGES, id, payload);
};

export const deleteMessage = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.MESSAGES, id);
};

// Accounts API
export const getAccounts = async (schoolId?: string): Promise<ApiResponse> => {
  try {
    // Try to fetch from backend API first (without requiring token)
    if (isOnline()) {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const authHeaders = await getAuthHeaders();
        headers = { ...headers, ...authHeaders };
      } catch {}
      const response = await fetch(`${API_BASE_URL}/api/users`, { method: 'GET', headers });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          let accounts = result.data;
          if (schoolId) {
            accounts = accounts.filter((account: any) => account.school_id === schoolId);
          }
          accounts = accounts.map((account: any) => ({
            ...account,
            schoolId: account.school_id ?? account.schoolId,
            gradeLevels: account.grade_levels ?? account.gradeLevels,
            school_id: account.school_id,
            grade_levels: account.grade_levels
          }));
          return { success: true, data: accounts, message: 'Accounts retrieved from backend' };
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch accounts from backend API, falling back to local storage:', error);
  }
  
  // Fallback to existing logic
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  
  const response = await getAll(STORAGE_KEYS.ACCOUNTS, filters);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((account: any) => ({
      ...account,
      schoolId: account.school_id,
      gradeLevels: account.grade_levels,
      // Keep snake_case versions for backward compatibility
      school_id: account.school_id,
      grade_levels: account.grade_levels
    }));
  }
  
  return response;
};

export const getAccount = async (id: string): Promise<ApiResponse> => {
  const response = await getById(STORAGE_KEYS.ACCOUNTS, id);
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = {
      ...response.data,
      schoolId: response.data.school_id,
      gradeLevels: response.data.grade_levels,
      // Keep snake_case versions for backward compatibility
      school_id: response.data.school_id,
      grade_levels: response.data.grade_levels
    };
  }
  
  return response;
};

export const createAccount = async (accountData: any): Promise<ApiResponse> => {
  try {
    // Check connectivity and backend availability separately
    const isOnline = await checkOnlineStatus();
    console.log('createAccount - Online status:', isOnline);
    
    let backendAvailable = false;
    if (isOnline) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const ping = await fetch(API_BASE_URL + '/', { method: 'GET', signal: controller.signal });
        backendAvailable = ping.ok;
      } catch (e) {
        backendAvailable = false;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    
    if (backendAvailable) {
      console.log('createAccount - Backend available, trying API');
      try {
        const authHeaders = await getAuthHeaders();
        console.log('createAccount - Auth headers:', authHeaders);
        
        const response = await fetch(API_BASE_URL + '/api/users/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: accountData.name,
            email: accountData.email,
            username: accountData.username,
            password: accountData.password,
            role: accountData.role,
            school_id: accountData.school_id || accountData.schoolId,
            grade_levels: accountData.grade_levels || accountData.gradeLevels
          })
        });
        
        console.log('createAccount - Backend response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          
          // Update local cache with the created account (normalize keys)
          if (result.data) {
            const normalized = {
              ...result.data,
              schoolId: result.data.school_id ?? result.data.schoolId,
              gradeLevels: result.data.grade_levels ?? result.data.gradeLevels,
            };
            const cached = getCachedCollection(STORAGE_KEYS.ACCOUNTS);
            const cachedAccounts = cached?.data || [];
            cachedAccounts.push(normalized);
            saveCachedCollection(STORAGE_KEYS.ACCOUNTS, cachedAccounts);
          }
          
          return {
            success: true,
            message: result.message || 'Account created successfully via backend',
            data: result.data
          };
        } else {
          console.log('createAccount - Backend API returned non-OK');
        }
      } catch (backendError) {
        console.log('createAccount - Backend API error:', backendError);
      }
      // If backend path failed, continue to fallback below
    } else {
      console.log('createAccount - Backend unavailable, skipping API and using fallback');
    }
    
    // Final fallback to local storage (for offline scenarios or when both backend and Supabase fail)
    console.log('createAccount - Using local storage fallback');
    const mappedData = {
      id: accountData.id || uuidv4(),
      ...accountData,
      school_id: accountData.schoolId,
      grade_levels: accountData.gradeLevels,
      created_at: accountData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Remove camelCase versions to avoid conflicts
      schoolId: undefined,
      gradeLevels: undefined,
      // Remove password field if present (should be stored only in Auth)
      password: undefined
    };
    
    // Save directly to localStorage without any Supabase calls
    const accounts = getCollection(STORAGE_KEYS.ACCOUNTS);
    accounts.push(mappedData);
    saveCollection(STORAGE_KEYS.ACCOUNTS, accounts);
    
    // Update cache
    const cached = getCachedCollection(STORAGE_KEYS.ACCOUNTS);
    let updatedData;
    if (cached && cached.data) {
      updatedData = [...cached.data, mappedData];
    } else {
      updatedData = [...accounts];
    }
    saveCachedCollection(STORAGE_KEYS.ACCOUNTS, updatedData);
    
    // Add to sync queue for later when online
    addToSyncQueue(STORAGE_KEYS.ACCOUNTS, 'insert', mappedData);
    
    return { success: true, data: mappedData };
  } catch (error: any) {
    console.error('Error creating account:', error);
    return {
      success: false,
      message: 'Failed to create account',
      error: error.message
    };
  }
};

export const updateAccount = async (id: string, accountData: any): Promise<ApiResponse> => {
  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    ...accountData,
    school_id: accountData.schoolId,
    grade_levels: accountData.gradeLevels,
    // Remove camelCase versions to avoid conflicts
    schoolId: undefined,
    gradeLevels: undefined
  };
  
  return update(STORAGE_KEYS.ACCOUNTS, id, mappedData);
};

export const deleteAccount = async (id: string): Promise<ApiResponse> => {
  return remove(STORAGE_KEYS.ACCOUNTS, id);
};

// Settings API
export const getSettings = async (schoolId: string): Promise<ApiResponse> => {
  const response = await getAll('settings', { school_id: schoolId });
  
  // Map snake_case fields back to camelCase for application compatibility
  if (response.success && response.data) {
    response.data = response.data.map((setting: any) => ({
      ...setting,
      schoolId: setting.school_id,
      englishName: setting.english_name,
      phone: setting.phone,
      phoneWhatsapp: setting.phone_whatsapp,
      phoneCall: setting.phone_call,
      email: setting.email,
      address: setting.address,
      logo: setting.logo,
      defaultInstallments: setting.default_installments,
      tuitionFeeCategory: setting.tuition_fee_category,
      transportationFeeOneWay: setting.transportation_fee_one_way,
      transportationFeeTwoWay: setting.transportation_fee_two_way,
      receiptNumberPrefix: setting.receipt_number_prefix,
      receiptNumberSuffix: setting.receipt_number_suffix,
      receiptNumberStart: setting.receipt_number_start,
      receiptNumberCurrent: setting.receipt_number_current,
      receiptNumberCounter: setting.receipt_number_counter,
      receiptNumberFormat: setting.receipt_number_format,
      receiptNumberYear: setting.receipt_number_year,
      installmentReceiptNumberPrefix: setting.installment_receipt_number_prefix,
      installmentReceiptNumberSuffix: setting.installment_receipt_number_suffix,
      installmentReceiptNumberStart: setting.installment_receipt_number_start,
      installmentReceiptNumberCurrent: setting.installment_receipt_number_current,
      installmentReceiptNumberCounter: setting.installment_receipt_number_counter,
      installmentReceiptNumberFormat: setting.installment_receipt_number_format,
      installmentReceiptNumberYear: setting.installment_receipt_number_year,
      showWatermark: setting.show_watermark,
      showLogoBackground: setting.show_logo_background,
      showStamp: setting.show_stamp,
      showSignature: setting.show_signature,
      showFooter: setting.show_footer,
      stamp: setting.stamp,
      signature: setting.signature,
      footer: setting.footer,
      // Keep snake_case versions for backward compatibility
      school_id: setting.school_id,
      english_name: setting.english_name,
      phone_whatsapp: setting.phone_whatsapp,
      phone_call: setting.phone_call,
      default_installments: setting.default_installments,
      tuition_fee_category: setting.tuition_fee_category,
      transportation_fee_one_way: setting.transportation_fee_one_way,
      transportation_fee_two_way: setting.transportation_fee_two_way,
      receipt_number_prefix: setting.receipt_number_prefix,
      receipt_number_suffix: setting.receipt_number_suffix,
      receipt_number_start: setting.receipt_number_start,
      receipt_number_current: setting.receipt_number_current,
      receipt_number_counter: setting.receipt_number_counter,
      receipt_number_format: setting.receipt_number_format,
      receipt_number_year: setting.receipt_number_year,
      installment_receipt_number_prefix: setting.installment_receipt_number_prefix,
      installment_receipt_number_suffix: setting.installment_receipt_number_suffix,
      installment_receipt_number_start: setting.installment_receipt_number_start,
      installment_receipt_number_current: setting.installment_receipt_number_current,
      installment_receipt_number_counter: setting.installment_receipt_number_counter,
      installment_receipt_number_format: setting.installment_receipt_number_format,
      installment_receipt_number_year: setting.installment_receipt_number_year,
      show_watermark: setting.show_watermark,
      show_logo_background: setting.show_logo_background,
      show_stamp: setting.show_stamp,
      show_signature: setting.show_signature,
      show_footer: setting.show_footer
    }));
  }
  
  return response;
};

export const getSchoolSettings = async (schoolId: string): Promise<ApiResponse> => {
  return getSettings(schoolId);
};

export const updateSettings = async (schoolId: string, settingsData: any): Promise<ApiResponse> => {
  // Map camelCase fields to snake_case for Supabase compatibility
  const mappedData = {
    school_id: schoolId,
    name: settingsData.name,
    english_name: settingsData.englishName,
    phone: settingsData.phone,
    phone_whatsapp: settingsData.phoneWhatsapp,
    phone_call: settingsData.phoneCall,
    email: settingsData.email,
    address: settingsData.address,
    logo: settingsData.logo,
    default_installments: settingsData.defaultInstallments,
    tuition_fee_category: settingsData.tuitionFeeCategory,
    transportation_fee_one_way: settingsData.transportationFeeOneWay,
    transportation_fee_two_way: settingsData.transportationFeeTwoWay,
    receipt_number_prefix: settingsData.receiptNumberPrefix,
    receipt_number_suffix: settingsData.receiptNumberSuffix,
    receipt_number_start: settingsData.receiptNumberStart,
    receipt_number_current: settingsData.receiptNumberCurrent,
    receipt_number_counter: settingsData.receiptNumberCounter,
    receipt_number_format: settingsData.receiptNumberFormat,
    receipt_number_year: settingsData.receiptNumberYear,
    installment_receipt_number_prefix: settingsData.installmentReceiptNumberPrefix,
    installment_receipt_number_suffix: settingsData.installmentReceiptNumberSuffix,
    installment_receipt_number_start: settingsData.installmentReceiptNumberStart,
    installment_receipt_number_current: settingsData.installmentReceiptNumberCurrent,
    installment_receipt_number_counter: settingsData.installmentReceiptNumberCounter,
    installment_receipt_number_format: settingsData.installmentReceiptNumberFormat,
    installment_receipt_number_year: settingsData.installmentReceiptNumberYear,
    show_watermark: settingsData.showWatermark,
    show_logo_background: settingsData.showLogoBackground,
    show_stamp: settingsData.showStamp,
    show_signature: settingsData.showSignature,
    show_footer: settingsData.showFooter,
    stamp: settingsData.stamp,
    signature: settingsData.signature,
    footer: settingsData.footer
  };
  
  // First check if settings exist
  const { data: existingSettings } = await getAll('settings', { school_id: schoolId });
  
  if (existingSettings && existingSettings.length > 0) {
    return update('settings', existingSettings[0].id, mappedData);
  } else {
    return create('settings', mappedData);
  }
};

// Templates API
export const getTemplates = async (schoolId?: string, type?: string): Promise<ApiResponse> => {
  const filters: Record<string, any> = {};
  if (schoolId) filters.school_id = schoolId;
  if (type) filters.type = type;
  return getAll('templates', filters);
};

export const getTemplate = async (id: string): Promise<ApiResponse> => {
  return getById('templates', id);
};

export const createTemplate = async (templateData: any): Promise<ApiResponse> => {
  return create('templates', templateData);
};

export const updateTemplate = async (id: string, templateData: any): Promise<ApiResponse> => {
  return update('templates', id, templateData);
};

export const deleteTemplate = async (id: string): Promise<ApiResponse> => {
  return remove('templates', id);
};

// Clean up database - for admin reset functionality
export const cleanupDatabase = async (): Promise<ApiResponse> => {
  try {
    console.log('Database cleanup completed');
    return { success: true, message: 'تم تنظيف قاعدة البيانات بنجاح' };
  } catch (error: unknown) {
    console.error('Error cleaning up database:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Ensure data consistency across storage keys.
 * This function ensures all data is stored under the correct keys.
 */
export const ensureStorageConsistency = () => {
  try {
    console.log('Ensuring storage consistency...');
    
    // Check and fix accounts
    const oldAccounts = localStorage.getItem('accounts');
    if (oldAccounts) {
      const accounts = JSON.parse(oldAccounts);
      if (Array.isArray(accounts) && accounts.length > 0) {
        const targetAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        const targetParsed = targetAccounts ? JSON.parse(targetAccounts) : [];
        
        if (targetParsed.length === 0) {
          // Move accounts to the correct key
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, oldAccounts);
          localStorage.removeItem('accounts');
          console.log(`Moved ${accounts.length} accounts to correct storage key`);
        }
      }
    }
    
    // Check and fix schools
    const oldSchools = localStorage.getItem('schools');
    if (oldSchools) {
      const schools = JSON.parse(oldSchools);
      if (Array.isArray(schools) && schools.length > 0) {
        const targetSchools = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
        const targetParsed = targetSchools ? JSON.parse(targetSchools) : [];
        
        if (targetParsed.length === 0) {
          // Move schools to the correct key
          localStorage.setItem(STORAGE_KEYS.SCHOOLS, oldSchools);
          localStorage.removeItem('schools');
          console.log(`Moved ${schools.length} schools to correct storage key`);
        }
      }
    }
    
    // Check and fix students
    const oldStudents = localStorage.getItem('students');
    if (oldStudents) {
      const students = JSON.parse(oldStudents);
      if (Array.isArray(students) && students.length > 0) {
        const targetStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        const targetParsed = targetStudents ? JSON.parse(targetStudents) : [];
        
        if (targetParsed.length === 0) {
          // Move students to the correct key
          localStorage.setItem(STORAGE_KEYS.STUDENTS, oldStudents);
          console.log(`Moved ${students.length} students to correct storage key`);
        }
      }
    }
    
    console.log('Storage consistency check completed');
  } catch (error) {
    console.error('Error ensuring storage consistency:', error);
  }
};

// Aliases for backward compatibility
export const removeFee = deleteFee;
export const saveMessage = createMessage;

// Enhanced data pre-loading for offline support
const preloadEssentialData = async (): Promise<void> => {
  try {
    console.log('🔄 Starting essential data pre-loading...');
    
    // Get current user session for context
    const session = await getCachedUserSession();
    if (!session?.user?.schoolId) {
      console.warn('⚠️ No school context available for data pre-loading');
      return;
    }
    
    const schoolId = session.user.schoolId;
    console.log(`📚 Pre-loading data for school: ${schoolId}`);
    
    // Pre-load all essential data in parallel
    const preloadPromises = [
      getStudents(schoolId).catch(err => console.warn('Students pre-load failed:', err)),
      getFees(schoolId).catch(err => console.warn('Fees pre-load failed:', err)),
      getInstallments(schoolId).catch(err => console.warn('Installments pre-load failed:', err)),
      getMessages(schoolId).catch(err => console.warn('Messages pre-load failed:', err))
    ];
    
    // Wait for all pre-loading to complete
    await Promise.allSettled(preloadPromises);
    
    console.log('✅ Essential data pre-loading completed');
  } catch (error) {
    console.error('❌ Essential data pre-loading failed:', error);
  }
};

// Enhanced cache warming function
const warmCache = async (): Promise<void> => {
  try {
    console.log('🔥 Warming cache for better offline performance...');
    
    // Trigger syncAllData to ensure fresh cache
    await syncAllData();
    
    // Pre-load essential data
    await preloadEssentialData();
    
    console.log('✅ Cache warming completed');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
};

// Setup realtime sync function
export const setupRealtimeSync = () => {
  if (!shouldUseSupabase()) {
    console.log('⚠️ Supabase not configured, skipping realtime sync setup');
    return;
  }

  try {
    console.log('🔄 Setting up realtime sync...');
    
    // Clean up existing channels
    realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    realtimeChannels = [];

    // Setup realtime subscriptions for all tables
    const tables = ['schools', 'accounts', 'subscriptions', 'fees', 'installments'];
    
    tables.forEach(table => {
      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload) => {
            console.log(`📡 Realtime change in ${table}:`, payload);
            
            // Invalidate cache for this table
            invalidateCache(table);
            
            // Trigger callbacks
            if (realtimeCallbacks[table]) {
              realtimeCallbacks[table].forEach(callback => {
                try {
                  callback(payload);
                } catch (error) {
                  console.error(`Error in realtime callback for ${table}:`, error);
                }
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime subscription status for ${table}:`, status);
        });
      
      realtimeChannels.push(channel);
    });
    
    console.log('✅ Realtime sync setup completed');
  } catch (error) {
    console.error('❌ Failed to setup realtime sync:', error);
  }
};

// Subscribe to realtime changes
export const subscribeToRealtimeChanges = (table: string, callback: Function) => {
  if (!realtimeCallbacks[table]) {
    realtimeCallbacks[table] = [];
  }
  realtimeCallbacks[table].push(callback);
  
  // Return unsubscribe function
  return () => {
    if (realtimeCallbacks[table]) {
      const index = realtimeCallbacks[table].indexOf(callback);
      if (index > -1) {
        realtimeCallbacks[table].splice(index, 1);
      }
    }
  };
};

// Export the API
const hybridApi = {
  // Generic CRUD
  getAll,
  getById,
  create,
  update,
  remove,
  
  // Cache Management
  invalidateCache,
  invalidateAllCaches,
  clearCache,
  getCacheInfo,
  refreshDashboardCaches,
  
  // Schools
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  saveSchool,
  
  // Students
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  saveStudent,
  
  // Fees
  getFees,
  getFee,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  saveFee,
  batchUpdateFees,
  
  // Installments
  getInstallments,
  getInstallment,
  getInstallmentById,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  saveInstallment,
  batchUpdateInstallments,
  
  // Messages
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  
  // Accounts
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  
  // Settings
  getSettings,
  getSchoolSettings,
  updateSettings,
  
  // Templates
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Subscriptions
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  
  // Sync
  processSyncQueue,
  
  // Status and Connection Management
  isOnline: () => navigator.onLine,
  isSupabaseConfigured: shouldUseSupabase,
  isSupabaseAvailable,
  getCurrentConnectionStatus,
  
  // Enhanced Sync Management
  syncAllData,
  getSyncQueueStatus: () => ({
    pendingOperations: syncQueue.length,
    operations: syncQueue.map(op => ({
      table: op.table,
      operation: op.operation,
      timestamp: op.timestamp,
      id: op.data?.id || 'unknown'
    }))
  }),
  
  // Clear sync queue (for testing/admin purposes)
  clearSyncQueue: () => {
    syncQueue.length = 0;
    localStorage.removeItem('syncQueue');
    console.log('🧹 Sync queue cleared');
  },
  
  // Force sync now
  forceSyncNow: async () => {
    if (await isSupabaseAvailable()) {
      console.log('🔄 Force syncing all data...');
      await processSyncQueue();
      await syncAllData();
      return { success: true, message: 'Sync completed successfully' };
    } else {
      return { success: false, error: 'Cannot sync - Supabase not available' };
    }
  },
  
  // Enhanced offline support
  preloadEssentialData,
  warmCache,
  setupRealtimeSync,
  subscribeToRealtimeChanges
};

// Export functions for external use
export { preloadEssentialData, warmCache };

// Enhanced offline-first utilities
export const offlineUtils = {
  // Get comprehensive offline status
  getOfflineStatus: async () => {
    const isOnline = await isSupabaseAvailable();
    const pendingOps = syncQueue.length;
    const cacheStats = {
      fees: getCachedCollection('fees')?.data?.length || 0,
      installments: getCachedCollection('installments')?.data?.length || 0,
      students: getCachedCollection('students')?.data?.length || 0,
      schools: getCachedCollection('schools')?.data?.length || 0
    };
    
    return {
      online: isOnline,
      pendingOperations: pendingOps,
      cacheStats,
      lastSyncAttempt: lastConnectionCheck,
      autoSyncEnabled: true
    };
  },
  
  // Preload essential data for offline use
  preloadOfflineData: async (schoolId?: string) => {
    if (!await isSupabaseAvailable()) {
      console.log('📱 Cannot preload - offline mode');
      return { success: false, error: 'Cannot preload while offline' };
    }
    
    try {
      console.log('📦 Preloading data for offline use...');
      
      // Preload schools
      await getAll('schools');
      
      if (schoolId) {
        // Preload school-specific data
        await getAll('students', { school_id: schoolId });
        await getAll('fees', { school_id: schoolId });
        await getAll('installments', { school_id: schoolId });
        console.log(`✅ Preloaded data for school ${schoolId}`);
      } else {
        // Preload all data
        await getAll('students');
        await getAll('fees');
        await getAll('installments');
        console.log('✅ Preloaded all data');
      }
      
      return { success: true, message: 'Data preloaded successfully' };
    } catch (error: any) {
      console.error('❌ Error preloading data:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get data freshness info
  getDataFreshness: () => {
    const tables = ['fees', 'installments', 'students', 'schools'];
    const freshness: Record<string, any> = {};
    
    tables.forEach(table => {
      const cached = getCachedCollection(table);
      if (cached) {
        const ageMinutes = Math.round((Date.now() - cached.timestamp) / 1000 / 60);
        freshness[table] = {
          lastUpdated: new Date(cached.timestamp).toISOString(),
          ageMinutes,
          itemCount: cached.data?.length || 0,
          isStale: ageMinutes > 30 // Consider stale after 30 minutes
        };
      } else {
        freshness[table] = {
          lastUpdated: null,
          ageMinutes: null,
          itemCount: 0,
          isStale: true
        };
      }
    });
    
    return freshness;
  }
};

export default hybridApi;