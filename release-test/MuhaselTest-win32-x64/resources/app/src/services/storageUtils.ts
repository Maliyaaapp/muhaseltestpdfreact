/**
  * Helper functions for localStorage with error handling and fallbacks
 */

/**
 * Safely get an item from localStorage with error handling
 * @param key The key to retrieve
 * @param defaultValue Default value if key doesn't exist or error occurs
 * @returns The retrieved value or default value
 */
export const safeGetItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Safely set an item in localStorage with error handling
 * @param key The key to set
 * @param value The value to store
 * @returns true if successful, false if error occurred
 */
export const safeSetItem = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Error saving ${key} to localStorage:`, error);
    
    // Try to clear some space by removing old items
    try {
      // Remove items that might not be critical
      for (let i = 0; i < localStorage.length; i++) {
        const itemKey = localStorage.key(i);
        if (itemKey && (
          itemKey.includes('temp_') || 
          itemKey.includes('cache_') ||
          itemKey.includes('log_')
        )) {
          localStorage.removeItem(itemKey);
        }
      }
      
      // Try again after clearing space
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (retryError) {
      console.error(`Failed to save ${key} after clearing space:`, retryError);
      return false;
    }
  }
};

/**
 * Safely remove an item from localStorage with error handling
 * @param key The key to remove
 * @returns true if successful, false if error occurred
 */
export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

export default {
  safeGetItem,
  safeSetItem,
  safeRemoveItem
};
 