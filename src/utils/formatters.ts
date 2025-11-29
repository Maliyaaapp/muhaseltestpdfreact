/**
 * Utility functions for formatting values like dates, numbers, and currency
 */

/**
 * Format a date in Gregorian calendar format (DD/MM/YYYY)
 * @param dateString ISO date string or any valid date string
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    // Format using Intl.DateTimeFormat to ensure consistency
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return original on error
  }
};

/**
 * Format a date in Gregorian calendar format with full month name
 * @param dateString ISO date string or any valid date string
 * @returns Formatted date string with full month name (DD Month YYYY)
 */
export const formatDateLong = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    // Format using Intl.DateTimeFormat with long month
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting date long:', error);
    return dateString; // Return original on error
  }
};

/**
 * Format a currency value in Omani Rial format
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-OM', {
    style: 'decimal',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(amount);
};

/**
 * Format a phone number for display
 * @param phone Phone number to format
 * @returns Formatted phone number
 */
export const formatPhone = (phone: string): string => {
  // Clean the phone number first by removing excess spaces
  let cleaned = phone.replace(/\s+/g, ' ').trim();
  
  // Return the cleaned phone number as is, without adding any prefix
  return cleaned;
};

export default {
  formatDate,
  formatDateLong,
  formatCurrency,
  formatPhone
}; 