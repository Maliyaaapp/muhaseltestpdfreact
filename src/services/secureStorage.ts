/**
 * Secure Storage Service
 * 
 * This service provides encrypted storage for sensitive information
 * using electron-store with basic encryption.
 */
import storage from '../utils/storage';

// Check if we're in Electron environment
const isElectron = () => {
  try {
    return window && window.process && window.process.type;
  } catch (e) {
    return false;
  }
};

// Simple encoding/decoding functions for basic security using browser-compatible methods
// This is not true encryption but obfuscation to avoid plaintext storage
const encode = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str));
  } catch (e) {
    console.error('Encoding error:', e);
    return str; // Fallback to original string if encoding fails
  }
};

const decode = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch (e) {
    console.error('Decoding error:', e);
    return str; // Fallback to original string if decoding fails
  }
};

// Storage keys - use direct strings to avoid any reference issues
const REMEMBER_ME_KEY = 'muhasel_remember_me';
const REMEMBER_PASSWORD_KEY = 'muhasel_remember_password';
const STAY_SIGNED_IN_KEY = 'muhasel_stay_signed_in';
const CREDENTIALS_KEY = 'muhasel_credentials';

// Types
interface Credentials {
  emailOrUsername: string;
  password: string;
}

// Initialize storage
let electronStore: any = null;

if (isElectron()) {
  try {
    // Dynamically import electron-store (only in Electron environment)
    const Store = window.require('electron-store');
    electronStore = new Store({
      name: 'secure-storage',
      encryptionKey: 'muhasel-app-secure-storage', // Simple encryption key
    });
    console.log('Electron Store initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Electron Store:', error);
  }
}

// Storage service
const secureStorage = {
  // Set remember me status
  setRememberMe: (enabled: boolean): void => {
    try {
      console.log('Setting Remember Me:', enabled);
      storage.set(REMEMBER_ME_KEY, enabled);
      
      if (isElectron() && electronStore) {
        electronStore.set(REMEMBER_ME_KEY, enabled);
      }
      
      // Verify it was set correctly
      const savedValue = storage.get(REMEMBER_ME_KEY);
      console.log('Verified Remember Me saved as:', savedValue);
    } catch (error) {
      console.error('Error setting remember me:', error);
    }
  },

  // Get remember me status
  getRememberMe: (): boolean => {
    try {
      // Always check storage first
      const localStorageValue = storage.get(REMEMBER_ME_KEY) || false;
      
      if (isElectron() && electronStore) {
        const electronValue = electronStore.get(REMEMBER_ME_KEY, localStorageValue);
        console.log('Getting Remember Me from Electron Store:', electronValue);
        return electronValue;
      }
      
      console.log('Getting Remember Me from storage:', localStorageValue);
      return localStorageValue;
    } catch (error) {
      console.error('Error getting remember me:', error);
      return false;
    }
  },

  // Set stay signed in status
  setStaySignedIn: (enabled: boolean): void => {
    try {
      console.log('Setting Stay Signed In:', enabled);
      storage.set(STAY_SIGNED_IN_KEY, enabled);
      
      if (isElectron() && electronStore) {
        electronStore.set(STAY_SIGNED_IN_KEY, enabled);
      }
      
      // Verify it was set correctly
      const savedValue = storage.get(STAY_SIGNED_IN_KEY);
      console.log('Verified Stay Signed In saved as:', savedValue);
    } catch (error) {
      console.error('Error setting stay signed in:', error);
    }
  },

  // Get stay signed in status
  getStaySignedIn: (): boolean => {
    try {
      // Always check storage first
      const localStorageValue = storage.get(STAY_SIGNED_IN_KEY) || false;
      
      if (isElectron() && electronStore) {
        const electronValue = electronStore.get(STAY_SIGNED_IN_KEY, localStorageValue);
        console.log('Getting Stay Signed In from Electron Store:', electronValue);
        return electronValue;
      }
      
      console.log('Getting Stay Signed In from storage:', localStorageValue);
      return localStorageValue;
    } catch (error) {
      console.error('Error getting stay signed in:', error);
      return false;
    }
  },

  // Save credentials (with basic encoding)
  saveCredentials: (credentials: Credentials): void => {
    try {
      console.log('Saving credentials for user:', credentials.emailOrUsername);
      
      if (!credentials.emailOrUsername || !credentials.password) {
        console.error('Invalid credentials provided - cannot save empty values');
        return;
      }
      
      const encoded = {
        emailOrUsername: encode(credentials.emailOrUsername),
        password: encode(credentials.password)
      };

      // Always save to storage
      storage.set(CREDENTIALS_KEY, encoded);
      console.log('Credentials saved to storage');
      
      // Verify it was saved correctly
      const savedValue = storage.get(CREDENTIALS_KEY);
      console.log('Verified credentials saved:', savedValue ? 'Yes' : 'No');
      
      if (isElectron() && electronStore) {
        electronStore.set(CREDENTIALS_KEY, encoded);
        console.log('Credentials saved to Electron Store');
      }
      
      // Test immediately if we can retrieve what we just saved
      secureStorage.testCredentialRetrieval();
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  },

  // Test if we can retrieve credentials that were just saved
  testCredentialRetrieval: function(): void {
    try {
      console.log('Testing credential retrieval');
      const value = storage.get(CREDENTIALS_KEY);
      console.log('Raw stored credentials:', value);
      
      if (!value) {
        console.error('No credentials found in storage during test');
        return;
      }
      
      const encoded = value;
      console.log('Parsed credentials:', encoded);
      
      if (!encoded || !encoded.emailOrUsername || !encoded.password) {
        console.error('Invalid encoded credentials during test');
        return;
      }
      
      const emailOrUsername = decode(encoded.emailOrUsername);
      const password = decode(encoded.password);
      
      console.log('Test decoded credentials - username:', emailOrUsername);
      console.log('Test decoded credentials - password exists:', !!password);
    } catch (error) {
      console.error('Error in test credential retrieval:', error);
    }
  },

  // Get credentials (with decoding)
  getCredentials: (): Credentials | null => {
    try {
      console.log('Retrieving saved credentials');
      
      // Try storage first
      const value = storage.get(CREDENTIALS_KEY);
      console.log('Raw stored credentials:', value);
      
      if (!value) {
        console.log('No credentials found in storage');
        
        // Try Electron store as fallback
        if (isElectron() && electronStore) {
          const electronValue = electronStore.get(CREDENTIALS_KEY);
          if (electronValue) {
            console.log('Found credentials in Electron store');
            return {
              emailOrUsername: decode(electronValue.emailOrUsername),
              password: electronValue.password ? decode(electronValue.password) : ''
            };
          }
        }
        
        console.log('No saved credentials found anywhere');
        return null;
      }
      
      try {
        const encoded = value;
        
        // Only require emailOrUsername to be present
        if (!encoded || !encoded.emailOrUsername) {
          console.error('Invalid encoded credentials');
          return null;
        }
        
        const credentials = {
          emailOrUsername: decode(encoded.emailOrUsername),
          password: encoded.password ? decode(encoded.password) : ''
        };
        
        console.log('Credentials retrieved successfully for user:', credentials.emailOrUsername);
        return credentials;
      } catch (error) {
        console.error('Error parsing credentials:', error);
        return null;
      }
    } catch (error) {
      console.error('Error getting credentials:', error);
      return null;
    }
  },

  // Clear credentials
  clearCredentials: (): void => {
    try {
      console.log('Clearing saved credentials');
      
      storage.remove(CREDENTIALS_KEY);
      
      if (isElectron() && electronStore) {
        electronStore.delete(CREDENTIALS_KEY);
      }
      
      // Verify it was cleared
      const remainingValue = storage.get(CREDENTIALS_KEY);
      console.log('Verified credentials cleared:', remainingValue ? 'No' : 'Yes');
    } catch (error) {
      console.error('Error clearing credentials:', error);
    }
  },

  // Clear all saved auth data
  clearAll: (): void => {
    try {
      console.log('Safely clearing only authentication data, preserving important app data');
      
      // Only remove auth-related keys, preserving accounts, schools, and other important data
      storage.remove(REMEMBER_ME_KEY);
      storage.remove(STAY_SIGNED_IN_KEY);
      storage.remove(CREDENTIALS_KEY);
      storage.remove('currentUser');
      storage.remove('authToken'); 
      storage.remove('session');
      storage.remove('firebase:authUser:AIzaSyA5xFSJtKRizitssb2dtmNOiKLkg8iwLG8:[DEFAULT]');
      
      if (isElectron() && electronStore) {
        electronStore.delete(REMEMBER_ME_KEY);
        electronStore.delete(STAY_SIGNED_IN_KEY);
        electronStore.delete(CREDENTIALS_KEY);
        electronStore.delete('currentUser');
        electronStore.delete('authToken');
        electronStore.delete('session');
        electronStore.delete('firebase:authUser:AIzaSyA5xFSJtKRizitssb2dtmNOiKLkg8iwLG8:[DEFAULT]');
      }
      
      // Verify auth data was cleared
      console.log('Verified authentication data cleared successfully');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },
  
  // Direct method to force save credentials for testing
  forceSaveTestCredentials: function(username: string, password: string): void {
    this.saveCredentials({
      emailOrUsername: username,
      password: password
    });
    this.setRememberMe(true);
  },

  // Clear only the password, keep the email/username
  clearPasswordOnly: (): void => {
    try {
      const value = storage.get(CREDENTIALS_KEY);
      if (value) {
        const encoded = value;
        encoded.password = '';
        storage.set(CREDENTIALS_KEY, encoded);
      }
      if (isElectron() && electronStore) {
        const encoded = electronStore.get(CREDENTIALS_KEY);
        if (encoded) {
          encoded.password = '';
          electronStore.set(CREDENTIALS_KEY, encoded);
        }
      }
      console.log('Cleared only password, kept email/username');
    } catch (error) {
      console.error('Error clearing only password:', error);
    }
  },

  // Set remember password status
  setRememberPassword: (enabled: boolean): void => {
    try {
      storage.set(REMEMBER_PASSWORD_KEY, enabled);
      if (isElectron() && electronStore) {
        electronStore.set(REMEMBER_PASSWORD_KEY, enabled);
      }
    } catch (error) {
      console.error('Error setting remember password:', error);
    }
  },

  // Get remember password status
  getRememberPassword: (): boolean => {
    try {
      const localStorageValue = storage.get(REMEMBER_PASSWORD_KEY) || false;
      if (isElectron() && electronStore) {
        return electronStore.get(REMEMBER_PASSWORD_KEY, localStorageValue);
      }
      return localStorageValue;
    } catch (error) {
      console.error('Error getting remember password:', error);
      return false;
    }
  }
};

// Run a test to ensure storage is working correctly
try {
  const testKey = 'muhasel_storage_test';
  storage.set(testKey, 'test');
  const testValue = storage.get(testKey);
  console.log('Storage test result:', testValue === 'test' ? 'PASS' : 'FAIL');
  storage.remove(testKey);
} catch (e) {
  console.error('Storage test failed:', e);
}

export default secureStorage; 