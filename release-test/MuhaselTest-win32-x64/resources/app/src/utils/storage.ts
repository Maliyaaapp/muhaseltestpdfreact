// Safe import system for Electron compatibility
let Store: any = null;
let electronStore: any = null;

// Check if we're in Electron environment
const isElectron = () => {
  try {
    return window && window.process && window.process.type;
  } catch (e) {
    return false;
  }
};

// Only attempt to import electron-store in an electron environment
if (isElectron()) {
  try {
    // Using dynamic require to avoid webpack/vite bundling it for web
    const electron = window.require ? window.require('electron') : null;
    if (electron) {
      // Only import if we confirmed we're in Electron
      Store = window.require('electron-store');
      if (Store) {
        electronStore = new Store();
        console.log('Electron Store initialized');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Electron Store:', error);
  }
}

// Define persistent data keys that should never be removed by clear functions
// This helps prevent accidental deletion of important application data
const PERSISTENT_DATA_KEYS = [
  'accounts',
  'schools',
  'students',
  'fees',
  'installments',
  'messages',
  'subscriptions',
  'user',
  'schoolData',
  'offlineData',
  'app_version',
  'syncStatus'
];

// Define any keys that start with these prefixes as persistent
const PERSISTENT_KEY_PREFIXES = [
  'school_settings_',
  'student_',
  'fee_',
  'installment_',
  'account_'
];

// Define session-only keys that are safe to clear during logout/reset
const SESSION_KEYS = [
  'authToken', 
  'session',
  'currentUser',
  'currentSchool', 
  'temporaryCache',
  'notifications',
  'theme',
  'lastVisited',
  'recovered_from_crash',
  'prevent_reload_loops',
  'firebase:authUser:AIzaSyA5xFSJtKRizitssb2dtmNOiKLkg8iwLG8:[DEFAULT]'
];

// Check if a key should be preserved as persistent data
const isPersistentKey = (key: string): boolean => {
  // Direct match with persistent keys
  if (PERSISTENT_DATA_KEYS.includes(key)) return true;
  
  // Check if key starts with any persistent prefix
  return PERSISTENT_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
};

// Safely clear storage without losing important data
export const safeClearStorage = () => {
  console.log('Safe clear storage: preserving persistent data while clearing session data');
  
  try {
    // 1. First handle localStorage
    // Back up persistent data from localStorage
    const persistentData: Record<string, any> = {};
    
    // Get all keys from localStorage
    const allLocalStorageKeys = Object.keys(localStorage);
    
    // Identify persistent keys and save their values
    allLocalStorageKeys.forEach(key => {
      if (isPersistentKey(key)) {
        try {
          const value = localStorage.getItem(key);
          if (value !== null) {
            persistentData[key] = value;
          }
        } catch (e) {
          console.error(`Error backing up localStorage key ${key}:`, e);
        }
      }
    });
    
    // Remove session-specific keys
    SESSION_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Error removing localStorage key ${key}:`, e);
      }
    });
    
    // Also clear sessionStorage items
    sessionStorage.removeItem('login_attempts');
    sessionStorage.removeItem('last_login_attempt');
    sessionStorage.removeItem('recovered_from_crash');
    sessionStorage.removeItem('prevent_reload_loops');
    
    console.log(`Safe clear preserved ${Object.keys(persistentData).length} persistent keys`);
    
    // 2. If in Electron, handle electronStore
    if (isElectron() && electronStore) {
      // Back up persistent data from electronStore
      const persistentElectronData: Record<string, any> = {};
      
      // Get all keys from electronStore
      try {
        const allElectronStoreKeys = electronStore.store ? Object.keys(electronStore.store) : [];
        
        // Identify persistent keys and save their values
        allElectronStoreKeys.forEach((key: string) => {
          if (isPersistentKey(key)) {
            try {
              const value = electronStore.get(key);
              if (value !== undefined) {
                persistentElectronData[key] = value;
              }
            } catch (e) {
              console.error(`Error backing up electronStore key ${key}:`, e);
            }
          }
        });
        
        // Remove session keys from electronStore
        SESSION_KEYS.forEach(key => {
          try {
            electronStore.delete(key);
          } catch (e) {
            console.error(`Error removing electronStore key ${key}:`, e);
          }
        });
        
        console.log(`Safe clear preserved ${Object.keys(persistentElectronData).length} persistent electronStore keys`);
      } catch (error) {
        console.error('Error handling electronStore during safe clear:', error);
      }
    }
  } catch (error) {
    console.error('Error in safeClearStorage:', error);
  }
};

export const storage = {
  get: (key: string): any => {
    try {
      // Try Electron store first if available
      if (isElectron() && electronStore) {
        const value = electronStore.get(key);
        if (value !== undefined) return value;
      }
      
      // Fall back to localStorage
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item from storage (${key}):`, error);
      return null;
    }
  },
  set: (key: string, value: any): void => {
    try {
      // Save to Electron store if available
      if (isElectron() && electronStore) {
        electronStore.set(key, value);
      }
      
      // Always save to localStorage as fallback
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item in storage (${key}):`, error);
    }
  },
  remove: (key: string): void => {
    try {
      // Remove from Electron store if available
      if (isElectron() && electronStore) {
        electronStore.delete(key);
      }
      
      // Always remove from localStorage as fallback
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item from storage (${key}):`, error);
    }
  },
  // Safely clear only session-related data without removing persistent data
  safeSessionClear: (): void => {
    // Use the improved safeClearStorage function to avoid duplication
    safeClearStorage();
  },
  // DANGER: This will clear everything - use safeSessionClear instead unless you really need to
  clear: (): void => {
    try {
      console.warn('⚠️ DANGER: Using safer storage clear that preserves accounts and schools');
      
      // Use safer implementation that preserves critical data
      safeClearStorage();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
};

export default storage; 