import { supabase, shouldUseSupabase } from '../services/supabase';
import storage from '../utils/storage';
import { STORAGE_KEYS } from '../services/hybridApi';
import { v4 as uuidv4 } from 'uuid';

/**
 * Utility script to migrate data from localStorage to Supabase
 * This should be run once when a user first connects to Supabase
 */

// Helper to format data for Supabase (snake_case keys)
const formatForSupabase = (item: any): any => {
  const formatted: any = {};
  
  // Convert camelCase to snake_case and handle special fields
  Object.entries(item).forEach(([key, value]) => {
    // Skip null or undefined values
    if (value === null || value === undefined) return;
    
    // Handle special field mappings
    if (key === 'gradeLevels') {
      // Map gradeLevels to grades for schools table, grade_levels for accounts table
      formatted['grades'] = value;
      formatted['grade_levels'] = value;
      return;
    }
    
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Handle date fields
    if (key === 'createdAt' || key === 'updatedAt' || key === 'lastLogin' || 
        key === 'dueDate' || key === 'paymentDate' || key === 'sentAt') {
      formatted[snakeKey] = value;
    } 
    // Handle arrays
    else if (Array.isArray(value)) {
      formatted[snakeKey] = value;
    }
    // Handle objects (convert to JSON for jsonb fields)
    else if (typeof value === 'object') {
      formatted[snakeKey] = value;
    }
    // Handle all other fields
    else {
      formatted[snakeKey] = value;
    }
  });
  
  return formatted;
};

// Migrate a single table
const migrateTable = async (tableName: string, items: any[]): Promise<{
  success: boolean;
  inserted: number;
  errors: any[];
}> => {
  try {
    const formattedItems = items.map(formatForSupabase);
    const errors: any[] = [];
    let inserted = 0;
    
    // Insert in batches of 50 to avoid rate limits
    for (let i = 0; i < formattedItems.length; i += 50) {
      const batch = formattedItems.slice(i, i + 50);
      const { data, error } = await supabase.from(tableName).upsert(batch, { 
        onConflict: 'id',
        ignoreDuplicates: false
      });
      
      if (error) {
        console.error(`Error inserting batch in ${tableName}:`, error);
        errors.push(error);
      } else {
        inserted += batch.length;
      }
    }
    
    return { success: errors.length === 0, inserted, errors };
  } catch (error) {
    console.error(`Error migrating ${tableName}:`, error);
    return { success: false, inserted: 0, errors: [error] };
  }
};

// Main migration function
export const migrateToSupabase = async (): Promise<{
  success: boolean;
  results: Record<string, any>;
}> => {
  if (!shouldUseSupabase()) {
    return { 
      success: false, 
      results: { error: 'Supabase is not configured or offline' } 
    };
  }
  
  try {
    const results: Record<string, any> = {};
    
    // Migrate schools
    const schools = storage.get(STORAGE_KEYS.SCHOOLS) || [];
    results.schools = await migrateTable('schools', schools);
    
    // Migrate accounts
    const accounts = storage.get(STORAGE_KEYS.ACCOUNTS) || [];
    results.accounts = await migrateTable('accounts', accounts);
    
    // Migrate students
    const students = storage.get(STORAGE_KEYS.STUDENTS) || [];
    results.students = await migrateTable('students', students);
    
    // Migrate fees
    const fees = storage.get(STORAGE_KEYS.FEES) || [];
    results.fees = await migrateTable('fees', fees);
    
    // Migrate installments
    const installments = storage.get(STORAGE_KEYS.INSTALLMENTS) || [];
    results.installments = await migrateTable('installments', installments);
    
    // Migrate messages
    const messages = storage.get(STORAGE_KEYS.MESSAGES) || [];
    results.messages = await migrateTable('messages', messages);
    
    // Migrate settings
    const settings = storage.get('settings') || [];
    results.settings = await migrateTable('settings', settings);
    
    // Migrate templates
    const templates = storage.get(STORAGE_KEYS.TEMPLATES) || [];
    results.templates = await migrateTable('templates', templates);
    
    // Check if any migrations failed
    const allSuccessful = Object.values(results).every(r => r.success);
    
    // Store migration timestamp
    if (allSuccessful) {
      storage.set('lastMigrationToSupabase', new Date().toISOString());
    }
    
    return { success: allSuccessful, results };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, results: { error } };
  }
};

// Function to check if migration is needed
export const isMigrationNeeded = (): boolean => {
  // Check if we've already migrated
  const lastMigration = storage.get('lastMigrationToSupabase');
  if (lastMigration) return false;
  
  // Check if we have data to migrate
  const hasSchools = (storage.get(STORAGE_KEYS.SCHOOLS) || []).length > 0;
  const hasAccounts = (storage.get(STORAGE_KEYS.ACCOUNTS) || []).length > 0;
  const hasStudents = (storage.get(STORAGE_KEYS.STUDENTS) || []).length > 0;
  
  return hasSchools || hasAccounts || hasStudents;
};

// Export a function to run the migration from a UI component
export const runMigration = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    if (!shouldUseSupabase()) {
      return { 
        success: false, 
        message: 'Cannot migrate: Supabase is not configured or you are offline.'
      };
    }
    
    if (!isMigrationNeeded()) {
      return { 
        success: true, 
        message: 'Migration not needed. Data has already been migrated or no data exists.'
      };
    }
    
    const result = await migrateToSupabase();
    
    if (result.success) {
      return { 
        success: true, 
        message: 'Data successfully migrated to Supabase!',
        details: result.results
      };
    } else {
      return { 
        success: false, 
        message: 'Migration failed. See details for more information.',
        details: result.results
      };
    }
  } catch (error: any) {
    return { 
      success: false, 
      message: `Migration error: ${error.message || 'Unknown error'}`,
      details: error
    };
  }
};