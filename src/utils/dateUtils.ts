/**
 * Date utility functions for the application
 */

/**
 * Returns the first day of the month for a given date string
 * @param dateString ISO date string
 * @returns ISO date string for first day of the month
 */
export const getFirstDayOfMonth = (dateString: string): string => {
  const date = new Date(dateString);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
};

/**
 * Formats a date string to localized format
 * @param dateString ISO date string
 * @param locale Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, locale = 'en-US'): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale);
};

/**
 * Gets the month name from a date string
 * @param dateString ISO date string
 * @param locale Locale for month name (default: 'ar')
 * @returns Month name
 */
export const getMonthName = (dateString: string, locale = 'ar'): string => {
  const date = new Date(dateString);
  return date.toLocaleString(locale, { month: 'long' });
}; 