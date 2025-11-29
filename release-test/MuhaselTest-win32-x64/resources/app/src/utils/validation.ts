import { PHONE_REGEX } from './constants';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Phone number validation (Oman format)
export const isValidOmanPhone = (phone: string): boolean => {
  return PHONE_REGEX.test(phone);
};

// Format phone number to keep as entered
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Just trim and return as is without any automatic formatting
  return phone.trim();
};

// Student ID validation
export const isValidStudentId = (id: string): boolean => {
  return id.length >= 4 && id.length <= 10;
};

// Amount validation
export const isValidAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0;
};

// Date validation
export const isValidDate = (date: string): boolean => {
  return !isNaN(Date.parse(date));
};

// Form validation helper
export const validateForm = (form: Record<string, any>, rules: Record<string, (value: any) => boolean>): {
  isValid: boolean;
  errors: Record<string, boolean>;
} => {
  const errors: Record<string, boolean> = {};
  let isValid = true;
  
  Object.keys(rules).forEach(field => {
    const isFieldValid = rules[field](form[field]);
    errors[field] = !isFieldValid;
    
    if (!isFieldValid) {
      isValid = false;
    }
  });
  
  return { isValid, errors };
};

export default {
  isValidEmail,
  isValidOmanPhone,
  formatPhoneNumber,
  isValidStudentId,
  isValidAmount,
  isValidDate,
  validateForm
};
 