'use client';

import { useLocale } from 'next-intl';
import { isRtlLanguage, getTextDirection } from './rtl-utils';

/**
 * Hook to check if current language is RTL
 * Usage:
 * const isRtl = useIsRtl();
 * const dir = useTextDirection();
 */
export function useIsRtl(): boolean {
  const locale = useLocale();
  return isRtlLanguage(locale);
}

export function useTextDirection(): 'rtl' | 'ltr' {
  const locale = useLocale();
  return getTextDirection(locale);
}
