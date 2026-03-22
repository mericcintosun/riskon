/**
 * RTL (Right-to-Left) Language Support Configuration
 * 
 * This module provides utilities for handling RTL languages in the application.
 * Currently configured for Arabic (ar) and potentially other RTL languages.
 */

export const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

export function isRtlLanguage(locale: string): boolean {
  return rtlLanguages.includes(locale);
}

/**
 * Get the text direction for a given locale
 * @param locale - The locale code (e.g., 'en', 'ar', 'tr')
 * @returns 'rtl' or 'ltr'
 */
export function getTextDirection(locale: string): 'rtl' | 'ltr' {
  return isRtlLanguage(locale) ? 'rtl' : 'ltr';
}

/**
 * Get margin/padding utilities for RTL support
 * Usage in components:
 * const { ml, mr, pl, pr } = getRtlUtilities(locale);
 * className={`${ml('4')} ${pr('2')}`}  // Will adapt based on RTL/LTR
 */
export function getRtlUtilities(locale: string) {
  const isRtl = isRtlLanguage(locale);

  return {
    ml: (value: string) => isRtl ? `mr-${value}` : `ml-${value}`,
    mr: (value: string) => isRtl ? `ml-${value}` : `mr-${value}`,
    pl: (value: string) => isRtl ? `pr-${value}` : `pl-${value}`,
    pr: (value: string) => isRtl ? `pl-${value}` : `pr-${value}`,
    textAlign: (alignment: 'start' | 'end') =>
      isRtl ? (alignment === 'start' ? 'text-right' : 'text-left') : 
             (alignment === 'start' ? 'text-left' : 'text-right'),
  };
}
