/**
 * Generate a receipt number based on settings and type
 * @param settings - School settings
 * @param studentId - Student ID for student-specific receipt numbers
 * @param existingReceiptNumber - Optional parameter to use an existing receipt number
 * @param type - 'fee' or 'installment' (default: 'fee')
 */
export const generateReceiptNumber = (settings: any, studentId: string, existingReceiptNumber?: string, type: 'fee' | 'installment' = 'fee'): string => {
  try {
    if (existingReceiptNumber && existingReceiptNumber.trim() !== '') {
      return existingReceiptNumber;
    }

    // Handle null, undefined, or empty settings
    if (!settings || (typeof settings === 'object' && Object.keys(settings).length === 0)) {
      const defaultPrefix = type === 'installment' ? 'INST-' : 'R-';
      // Use timestamp + counter to ensure uniqueness instead of random
      const timestamp = Date.now().toString().slice(-6);
      return `${defaultPrefix}${timestamp}`;
    }

    let receiptNumber = '';
    let counter = 1;
    let format = settings.receiptNumberFormat || 'auto';
    let prefix = settings.receiptNumberPrefix || '';

    if (type === 'installment') {
      counter = settings.installmentReceiptNumberCounter || 1;
      format = settings.installmentReceiptNumberFormat || 'auto';
      prefix = settings.installmentReceiptNumberPrefix || '';
    } else {
      counter = settings.receiptNumberCounter || 1;
      format = settings.receiptNumberFormat || 'auto';
      prefix = settings.receiptNumberPrefix || '';
    }

    // Always use the current year for formats that include the year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentShortYear = currentYear.toString().slice(-2);

    // Use the year from settings if provided, otherwise use the current year
    let year = currentYear;
    let shortYear = currentShortYear;
    if (type === 'installment') {
      if (settings.installmentReceiptNumberYear) {
        year = settings.installmentReceiptNumberYear;
        shortYear = year.toString().slice(-2);
      }
    } else {
      if (settings.receiptNumberYear) {
        year = settings.receiptNumberYear;
        shortYear = year.toString().slice(-2);
      }
    }

    if (format === 'sequential') {
      // For sequential, do not pad with zeros, just use the number as is
      receiptNumber = counter.toString();
    } else if (format === 'year') {
      // Use the selected year
      receiptNumber = `${counter}/${year}`;
    } else if (format === 'short-year') {
      // Use the selected short year
      receiptNumber = `${counter}/${shortYear}`;
    } else if (format === 'student-sequential') {
      // Change to just use a sequential number without student ID for both fee and installment receipts
      receiptNumber = counter.toString();
    } else if (format === 'custom') {
      // For custom format, use the prefix and counter exactly as entered, no padding
      receiptNumber = `${prefix}${counter}`;
    } else {
      // 'auto' or fallback - use timestamp-based approach for uniqueness
      if (type === 'installment') {
        // Use the prefix from settings as-is (do not force a default)
        const prefixToUse = prefix || '';
        // Use timestamp + counter to ensure uniqueness
        const timestamp = Date.now().toString().slice(-8);
        receiptNumber = `${prefixToUse}${timestamp}`;
      } else {
        // For regular fee receipts
        const prefixToUse = prefix || 'R-';
        // Use timestamp + counter to ensure uniqueness
        const timestamp = Date.now().toString().slice(-8);
        receiptNumber = `${prefixToUse}${timestamp}`;
      }
    }

    // Debug removed
    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Even in error case, try to respect user settings for prefix and ensure uniqueness
    if (type === 'installment') {
      const prefixToUse = (settings && settings.installmentReceiptNumberPrefix) || '';
      const timestamp = Date.now().toString().slice(-6);
      return `${prefixToUse}${timestamp}`;
    } else {
      const prefixToUse = (settings && settings.receiptNumberPrefix) || 'R-';
      const timestamp = Date.now().toString().slice(-6);
      return `${prefixToUse}${timestamp}`;
    }
  }
}; 

/**
 * Convert Arabic numerals to English numerals
 * @param str - String containing Arabic numerals
 * @returns String with Arabic numerals converted to English numerals
 */
export const arToEnNumber = (str: string): string => {
  if (!str) return '';
  
  // Map of Arabic numerals to English numerals
  const arabicToEnglishMap: Record<string, string> = {
    'Ù ': '0', 'Ù¡': '1', 'Ù¢': '2', 'Ù£': '3', 'Ù¤': '4',
    'Ù¥': '5', 'Ù¦': '6', 'Ù§': '7', 'Ù¨': '8', 'Ù©': '9',
  };
  
  // Replace each Arabic numeral with its English equivalent
  return str.replace(/[Ù -Ù©]/g, match => arabicToEnglishMap[match] || match);
};
