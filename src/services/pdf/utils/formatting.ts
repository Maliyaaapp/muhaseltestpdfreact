/**
 * Formatting utilities for PDF generation
 */

// Import constants
import { CURRENCY, CURRENCY_EN, FEE_TYPES, PAYMENT_METHODS } from '../../../utils/constants';

/**
 * Function to get the appropriate currency symbol based on language
 */
export const getCurrencySymbol = (language?: string): string => {
  return language === 'english' ? CURRENCY_EN : CURRENCY;
};

/**
 * Function to translate payment method to Arabic using constants
 */
export const getArabicPaymentMethod = (paymentMethod?: string): string => {
  if (!paymentMethod) return '';
  
  // Clean up the payment method string
  const methodLower = paymentMethod.toString().toLowerCase().trim();
  
  // Try to find the matching payment method in constants
  const method = PAYMENT_METHODS.find(p => p.id === methodLower);
  if (method) {
    return method.name;
  }
  
  // Fallback mappings if not found directly
  if (methodLower.includes('cash') || methodLower.includes('نقد')) {
    return 'نقداً';
  } else if (methodLower.includes('visa') || methodLower.includes('بطاق') || methodLower.includes('ائتمان')) {
    return 'بطاقة ائتمان';
  } else if (methodLower.includes('check') || methodLower.includes('cheque') || methodLower.includes('شيك')) {
    return 'شيك';
  } else if (methodLower.includes('bank') || methodLower.includes('transfer') || methodLower.includes('تحويل')) {
    return 'تحويل بنكي';
  } else if (methodLower.includes('other') || methodLower.includes('أخر')) {
    return 'طريقة أخرى';
  }
  
  // If no match found, return the original value
  return paymentMethod;
};

/**
 * Translate fee types to Arabic
 */
export const translateFeeType = (feeType: string): string => {
  if (!feeType) return '';

  // Prioritize combined fees mapping
  if (feeType.toLowerCase() === 'transportation_and_tuition') {
    // Match constants: رسوم مدمجة
    return 'رسوم مدمجة';
  }

  // Handle common variations of transportation fees
  const transportationTerms = [
    'transportation', 'نقل', 'نقل مدرسي', 'رسوم نقل', 
    'رسوم النقل', 'رسوم التقل', 'رسوم النقل المدرسي'
  ];
  
  if (transportationTerms.some(term => 
    feeType.toLowerCase().includes(term.toLowerCase())
  )) {
    return 'نقل مدرسي';
  }
  
  // Standard lookup from constants
  const feeTypeObj = FEE_TYPES.find(type => type.id.toLowerCase() === feeType.toLowerCase());
  return feeTypeObj ? feeTypeObj.name : feeType;
};

/**
 * Helper function to format dates in Arabic format
 */
export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return '';
    
    // Parse the date safely
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return dateString;
    }
    
    // Format in Georgian format (DD/MM/YYYY) with English numerals
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Return date in English format
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString || '';
  }
};

/**
 * Helper function to format date for headers in all reports - consistent English format
 */
export const formatHeaderDate = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format phone number - preserve as entered without adding any automatic prefix
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Just clean up spaces and return as is without adding any prefix
  return phone.trim();
};