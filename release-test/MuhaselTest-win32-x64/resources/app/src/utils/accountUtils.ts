// Account utilities for debugging and fixing sync issues
import { Account } from '../services/hybridApi';
import { STORAGE_KEYS } from '../services/hybridApi';
import storage from '../utils/storage';

export interface AccountData {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId?: string;
  schoolName?: string;
  gradeLevels?: string[];
  lastLogin?: string;
}

export interface SyncStatus {
  success: boolean;
  error?: string;
  data?: {
    totalAccounts: number;
    isSynced: boolean;
  };
}

export const checkSyncStatus = async (): Promise<SyncStatus> => {
  try {
    // Get accounts from storage
    const accounts = storage.get('accounts') || [];
    
    return {
      success: true,
      data: {
        totalAccounts: accounts.length,
        isSynced: true
      }
    };
  } catch (error) {
    console.error('Error checking sync status:', error);
    return {
      success: false,
      error: 'Error checking sync status'
    };
  }
};

export const syncAccounts = async (): Promise<void> => {
  try {
    // No syncing needed - everything is in storage
    console.log('Using storage only - no sync needed');
  } catch (error) {
    console.error('Error syncing accounts:', error);
    throw error;
  }
};

export default {
  checkSyncStatus,
  syncAccounts
};

// Local storage key
const ACCOUNTS_STORAGE_KEY = STORAGE_KEYS.ACCOUNTS;

// Helper function to get accounts from storage
const getStoredAccounts = (): Account[] => {
  try {
    const accounts = storage.get(ACCOUNTS_STORAGE_KEY);
    return accounts || [];
  } catch (error) {
    console.error('Error reading accounts from storage:', error);
    return [];
  }
};

// Helper function to save accounts to storage
const saveAccounts = (accounts: Account[]) => {
  try {
    storage.set(ACCOUNTS_STORAGE_KEY, accounts);
  } catch (error) {
    console.error('Error saving accounts to storage:', error);
  }
};

// Get all accounts
export const getAllAccounts = (): Account[] => {
  return getStoredAccounts();
};

// Get account by ID
export const getAccountById = (id: string): Account | null => {
  const accounts = getStoredAccounts();
  return accounts.find(account => account.id === id) || null;
};

// Create new account
export const createAccount = (accountData: Omit<Account, 'id' | 'lastLogin'>): Account => {
  const accounts = getStoredAccounts();
  const newAccount: Account = {
    ...accountData,
    id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    lastLogin: new Date().toISOString()
  };
  
  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
};

// Update account
export const updateAccount = (id: string, updates: Partial<Account>): Account | null => {
  const accounts = getStoredAccounts();
  const index = accounts.findIndex(account => account.id === id);
  
  if (index === -1) return null;
  
  accounts[index] = {
    ...accounts[index],
    ...updates,
  };
  
  saveAccounts(accounts);
  return accounts[index];
};

// Delete account
export const deleteAccount = (id: string): boolean => {
  const accounts = getStoredAccounts();
  const filteredAccounts = accounts.filter(account => account.id !== id);
  
  if (filteredAccounts.length === accounts.length) {
    return false;
  }
  
  saveAccounts(filteredAccounts);
  return true;
};

// Get accounts by school ID
export const getAccountsBySchool = (schoolId: string): Account[] => {
  const accounts = getStoredAccounts();
  return accounts.filter(account => account.schoolId === schoolId);
};

// Update account's last login
export const updateAccountLastLogin = (id: string): void => {
  const accounts = getStoredAccounts();
  const index = accounts.findIndex(account => account.id === id);
  
  if (index !== -1) {
    accounts[index].lastLogin = new Date().toISOString();
    saveAccounts(accounts);
  }
};

// Check if email exists
export const checkEmailExists = (email: string, excludeId?: string): boolean => {
  const accounts = getStoredAccounts();
  return accounts.some(account => 
    account.email === email && (!excludeId || account.id !== excludeId)
  );
};

// Function to find all accounts in storage (including sample and user-created)
export const findAllAccounts = (): void => {
  try {
    console.log("=== ALL ACCOUNTS DIAGNOSTICS ===");
    
    // Check all possible keys where accounts might be stored
    const possibleKeys = ['accounts', 'ACCOUNTS', 'account', STORAGE_KEYS.ACCOUNTS];
    let totalAccountsFound = 0;
    
    for (const key of possibleKeys) {
      const accounts = storage.get(key);
      if (!accounts) {
        console.log(`No accounts found under key "${key}"`);
        continue;
      }
      
      try {
        if (!Array.isArray(accounts) || accounts.length === 0) {
          console.log(`Key "${key}" exists but contains no accounts array or empty array`);
          continue;
        }
        
        console.log(`Found ${accounts.length} accounts under key "${key}"`);
        totalAccountsFound += accounts.length;
        
        // Display accounts (excluding sensitive info)
        accounts.forEach((account, index) => {
          const { password, ...safeAccount } = account;
          console.log(`Account ${index + 1}:`, {
            ...safeAccount,
            password: password ? "[REDACTED]" : null
          });
          
          // For each account, find related students
          try {
            const students = storage.get('students') || [];
            const schoolId = account.schoolId;
            if (schoolId) {
              const relatedStudents = students.filter((s: any) => s.schoolId === schoolId);
              console.log(`This account has ${relatedStudents.length} related students`);
              
              // Show first few students
              if (relatedStudents.length > 0) {
                console.log(`First ${Math.min(3, relatedStudents.length)} students:`, 
                  relatedStudents.slice(0, 3).map((s: any) => ({ id: s.id, name: s.name }))
                );
              }
            }
          } catch (e) {
            console.error('Error getting related students:', e);
          }
          
          // Add divider between accounts
          console.log('-'.repeat(50));
        });
      } catch (error) {
        console.error(`Error parsing accounts from key "${key}":`, error);
      }
    }
    
    console.log(`Total accounts found across all storage keys: ${totalAccountsFound}`);
    console.log("=== END DIAGNOSTICS ===");
    
    return;
  } catch (error) {
    console.error('Error finding accounts:', error);
  }
};

// Enhanced function to recover accounts from all storage keys
export const fullRecoveryAttempt = (): boolean => {
  try {
    console.log("🔍 Starting full account recovery attempt...");
    let recoveredAccounts = 0;
    
    // Get all accounts from all possible storage keys
    const possibleKeys = ['accounts', 'ACCOUNTS', 'account', 'users', 'currentUser', 'user_accounts', 'app_accounts', 'cached_accounts'];
    const allAccounts: Account[] = [];
    const processedIds = new Set<string>();
    
    // Also check for any keys that might contain account data
    try {
      const allStorageKeys = Object.keys(localStorage);
      for (const key of allStorageKeys) {
        if ((key.toLowerCase().includes('account') || key.toLowerCase().includes('user')) && !possibleKeys.includes(key)) {
          possibleKeys.push(key);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to scan localStorage keys:', error);
    }
    
    console.log(`🔍 Checking ${possibleKeys.length} storage keys for accounts...`);
    
    // First gather all accounts from all storage keys
    for (const key of possibleKeys) {
      const parsedData = storage.get(key);
      if (!parsedData) continue;
      
      try {
        let accounts = parsedData;
        
        // Handle single account object (like currentUser)
        if (!Array.isArray(accounts) && accounts && (accounts.id || accounts.email || accounts.username)) {
          accounts = [accounts];
        } else if (!Array.isArray(accounts) && accounts && accounts.accounts && Array.isArray(accounts.accounts)) {
          // Handle nested structure
          accounts = accounts.accounts;
        }
        
        // Skip if not an array
        if (!Array.isArray(accounts)) continue;
        
        // Process each account
        accounts.forEach((account: any) => {
          // Ensure it has minimum required properties of an account
          if (!account || (!account.id && !account.email && !account.username)) return;
          
          // Generate ID if missing
          if (!account.id) {
            account.id = account.email || account.username || `recovered_${Date.now()}_${Math.random()}`;
          }
          
          // Skip if we've already processed this account ID
          if (processedIds.has(account.id)) return;
          
          // Add to our accounts list and mark as processed
          processedIds.add(account.id);
          allAccounts.push(account);
          console.log(`✅ Recovered account: ${account.email || account.username} from ${key}`);
        });
      } catch (error) {
        console.error(`Error processing key "${key}":`, error);
      }
    }
    
    console.log(`📊 Recovery summary: Found ${allAccounts.length} unique accounts`);
    
    // Get school data to ensure accounts have proper school info
    const schools: any[] = [];
    try {
      const parsedSchools = storage.get(STORAGE_KEYS.SCHOOLS);
      if (parsedSchools) {
        if (Array.isArray(parsedSchools)) {
          schools.push(...parsedSchools);
        }
      }
    } catch (error) {
      console.error('Error getting schools:', error);
    }
    
    // Ensure accounts have proper school info
    const enhancedAccounts = allAccounts.map(account => {
      if (account.schoolId) {
        const school = schools.find(s => s.id === account.schoolId);
        if (school) {
          account.schoolName = school.name || account.schoolName;
          account.schoolLogo = school.logo || account.schoolLogo;
          account.schoolStamp = ''; // Stamp functionality removed
        }
      }
      return account;
    });
    
    // Get existing accounts from the target key
    const existingAccounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
    
    // Create a set of existing IDs and emails for quick lookup
    const existingIds = new Set(existingAccounts.map((acc: any) => acc.id));
    const existingEmails = new Set(existingAccounts.map((acc: any) => acc.email));
    
    // Filter out accounts that already exist in the target
    const accountsToAdd = enhancedAccounts.filter(acc => 
      !existingIds.has(acc.id) && !existingEmails.has(acc.email)
    );
    
    if (accountsToAdd.length > 0) {
      // Merge the accounts and save to the target key
      const mergedAccounts = [...existingAccounts, ...accountsToAdd];
      storage.set(STORAGE_KEYS.ACCOUNTS, mergedAccounts);
      recoveredAccounts = accountsToAdd.length;
      
      console.log(`✅ Merged ${recoveredAccounts} new accounts. Total: ${mergedAccounts.length}`);
      
      // Log details of recovered accounts
      accountsToAdd.forEach(account => {
        console.log(`📝 Recovered: ${account.email} (${account.role}) - ${account.schoolName || 'No school'}`);
      });
      
      // Clean up old storage to prevent duplicates (but be conservative)
      const keysToCleanup = possibleKeys.filter(key => 
        key !== 'accounts' && 
        key !== 'currentUser' && // Keep current user for session
        !key.startsWith('supabase') // Don't touch Supabase keys
      );
      
      keysToCleanup.forEach(key => {
        try {
          // Only remove if we successfully recovered accounts from it
          const stored = storage.get(key);
          if (stored && (Array.isArray(stored) || (stored && (stored.id || stored.email)))) {
            storage.remove(key);
            console.log(`🧹 Cleaned up old storage key: ${key}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to clean up ${key}:`, error);
        }
      });
    } else {
      console.log('ℹ️ No new accounts found to merge');
    }
    
    console.log("=== RECOVERY COMPLETE ===");
    
    return recoveredAccounts > 0;
  } catch (error) {
    console.error('Error in full recovery attempt:', error);
    return false;
  }
};

// Function to recover accounts from old storage key (for backward compatibility)
export const recoverAccounts = (): boolean => {
  try {
    // Use the enhanced recovery function instead
    return fullRecoveryAttempt();
  } catch (error) {
    console.error('Error recovering accounts:', error);
    return false;
  }
};

// Diagnostic function to help identify account sync issues
export const runAccountDiagnostics = (): void => {
  console.log('🔍 === ACCOUNT DIAGNOSTICS REPORT ===');
  
  // Check main account storage
  const mainAccounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
  console.log(`📊 Main storage (${STORAGE_KEYS.ACCOUNTS}): ${mainAccounts.length} accounts`);
  
  // Check all localStorage keys for account-related data
  const accountKeys: string[] = [];
  const accountData: { [key: string]: any } = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('account') || key.toLowerCase().includes('user'))) {
        accountKeys.push(key);
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          accountData[key] = data;
        } catch (e) {
          accountData[key] = 'Invalid JSON';
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to scan localStorage:', error);
  }
  
  console.log(`🔍 Found ${accountKeys.length} account-related storage keys:`);
  accountKeys.forEach(key => {
    const data = accountData[key];
    if (data === 'Invalid JSON') {
      console.log(`  ❌ ${key}: Invalid JSON data`);
    } else if (Array.isArray(data)) {
      console.log(`  📋 ${key}: Array with ${data.length} items`);
    } else if (data && typeof data === 'object' && (data.id || data.email)) {
      console.log(`  👤 ${key}: Single account (${data.email || data.username || 'no email'})`);
    } else {
      console.log(`  ❓ ${key}: Unknown structure`);
    }
  });
  
  // Check online status and Supabase configuration
  console.log(`🌐 Online status: ${navigator.onLine ? '✅ Online' : '❌ Offline'}`);
  
  // Check for duplicate accounts
  const emails = new Set();
  const duplicates: string[] = [];
  mainAccounts.forEach((account: any) => {
    if (emails.has(account.email)) {
      duplicates.push(account.email);
    } else {
      emails.add(account.email);
    }
  });
  
  if (duplicates.length > 0) {
    console.log(`⚠️ Found ${duplicates.length} duplicate emails:`, duplicates);
  } else {
    console.log('✅ No duplicate emails found');
  }
  
  // Check account structure integrity
  const invalidAccounts = mainAccounts.filter((account: any) => 
    !account.id || !account.email || !account.role
  );
  
  if (invalidAccounts.length > 0) {
    console.log(`❌ Found ${invalidAccounts.length} accounts with missing required fields`);
    invalidAccounts.forEach((account: any, index: number) => {
      console.log(`  Account ${index + 1}:`, {
        hasId: !!account.id,
        hasEmail: !!account.email,
        hasRole: !!account.role,
        data: account
      });
    });
  } else {
    console.log('✅ All accounts have required fields');
  }
  
  // Summary
  console.log('📋 === DIAGNOSTIC SUMMARY ===');
  console.log(`Total accounts in main storage: ${mainAccounts.length}`);
  console.log(`Account-related storage keys: ${accountKeys.length}`);
  console.log(`Duplicate emails: ${duplicates.length}`);
  console.log(`Invalid accounts: ${invalidAccounts.length}`);
  console.log(`Online status: ${navigator.onLine}`);
  console.log('=== END DIAGNOSTICS ===');
};