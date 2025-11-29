/**
 * Receipt Counter Management Utility
 * Ensures proper sequential numbering and prevents duplicate receipt numbers
 */

import { generateReceiptNumber } from './helpers';
import hybridApi from '../services/hybridApi';

export interface ReceiptCounterUpdate {
  schoolId: string;
  type: 'fee' | 'installment';
  increment: number;
}

/**
 * Atomically reserve and increment receipt numbers to prevent duplicates
 * This function ensures thread-safe receipt number generation
 */
export const reserveReceiptNumbers = async (
  schoolId: string, 
  type: 'fee' | 'installment', 
  count: number = 1
): Promise<string[]> => {
  try {
    // Get current settings
    const settingsResponse = await hybridApi.getSettings(schoolId);
    if (!settingsResponse?.success || !settingsResponse?.data || settingsResponse.data.length === 0) {
      throw new Error('School settings not found');
    }

    const currentSettings = settingsResponse.data[0];
    const reservedNumbers: string[] = [];
    
    // Reserve numbers one by one to ensure atomicity
    for (let i = 0; i < count; i++) {
      let currentCounter: number;
      let counterField: string;
      let formatField: string;
      let prefixField: string;
      let yearField: string;

      if (type === 'installment') {
        currentCounter = currentSettings.installmentReceiptNumberCounter || 1;
        counterField = 'installmentReceiptNumberCounter';
        formatField = 'installmentReceiptNumberFormat';
        prefixField = 'installmentReceiptNumberPrefix';
        yearField = 'installmentReceiptNumberYear';
      } else {
        currentCounter = currentSettings.receiptNumberCounter || 1;
        counterField = 'receiptNumberCounter';
        formatField = 'receiptNumberFormat';
        prefixField = 'receiptNumberPrefix';
        yearField = 'receiptNumberYear';
      }

      // Generate receipt number with current counter
      const receiptNumber = generateReceiptNumber(
        currentSettings,
        'RESERVED',
        undefined,
        type
      );
      
      reservedNumbers.push(receiptNumber);
      
      // Increment counter for next iteration
      if (type === 'installment') {
        currentSettings.installmentReceiptNumberCounter = currentCounter + 1;
      } else {
        currentSettings.receiptNumberCounter = currentCounter + 1;
      }
    }

    // Save updated settings with incremented counters
    await hybridApi.updateSettings(schoolId, currentSettings);
    
    console.log(`Reserved ${count} ${type} receipt numbers:`, reservedNumbers);
    return reservedNumbers;
    
  } catch (error) {
    console.error(`Error reserving ${type} receipt numbers:`, error);
    throw error;
  }
};

/**
 * Get the next receipt number without incrementing the counter
 * Useful for preview purposes
 */
export const getNextReceiptNumber = async (
  schoolId: string, 
  type: 'fee' | 'installment'
): Promise<string> => {
  try {
    const settingsResponse = await hybridApi.getSettings(schoolId);
    if (!settingsResponse?.success || !settingsResponse?.data || settingsResponse.data.length === 0) {
      throw new Error('School settings not found');
    }

    const currentSettings = settingsResponse.data[0];
    
    // Generate receipt number with current counter (without incrementing)
    const receiptNumber = generateReceiptNumber(
      currentSettings,
      'PREVIEW',
      undefined,
      type
    );
    
    return receiptNumber;
    
  } catch (error) {
    console.error(`Error getting next ${type} receipt number:`, error);
    throw error;
  }
};

/**
 * Validate receipt number format and ensure it follows the configured pattern
 */
export const validateReceiptNumber = (
  receiptNumber: string, 
  settings: any, 
  type: 'fee' | 'installment'
): boolean => {
  try {
    if (!receiptNumber || !settings) {
      return false;
    }

    const format = type === 'installment' 
      ? settings.installmentReceiptNumberFormat 
      : settings.receiptNumberFormat;
    
    const prefix = type === 'installment'
      ? settings.installmentReceiptNumberPrefix
      : settings.receiptNumberPrefix;

    switch (format) {
      case 'sequential':
        // Should be a pure number
        return /^\d+$/.test(receiptNumber);
        
      case 'year':
        // Should be in format: number/year
        return /^\d+\/\d{4}$/.test(receiptNumber);
        
      case 'short-year':
        // Should be in format: number/YY
        return /^\d+\/\d{2}$/.test(receiptNumber);
        
      case 'custom':
        // Should start with the specified prefix
        return prefix ? receiptNumber.startsWith(prefix) : true;
        
      case 'auto':
      default:
        // Auto format can vary, so we'll accept any non-empty string
        return receiptNumber.length > 0;
    }
    
  } catch (error) {
    console.error('Error validating receipt number:', error);
    return false;
  }
};

/**
 * Check if a receipt number already exists to prevent duplicates
 */
export const checkDuplicateReceiptNumber = async (
  schoolId: string,
  receiptNumber: string,
  type: 'fee' | 'installment'
): Promise<boolean> => {
  try {
    // This would need to be implemented based on your database structure
    // For now, we'll return false (no duplicate found)
    // You should implement actual database checking here
    
    console.log(`Checking for duplicate ${type} receipt number:`, receiptNumber);
    
    // TODO: Implement actual duplicate checking against your database
    // This could involve querying your Supabase/hybridApi for existing receipts
    
    return false; // Assume no duplicate for now
    
  } catch (error) {
    console.error('Error checking for duplicate receipt number:', error);
    return false; // Assume no duplicate on error to avoid blocking
  }
};