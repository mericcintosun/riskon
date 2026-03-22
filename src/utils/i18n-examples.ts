/**
 * Utility functions and hooks for i18n usage in RiskOn application
 * 
 * Usage:
 * - Server Components: Use getTranslations() from 'next-intl'
 * - Client Components: Use useTranslations() from 'next-intl'
 */

// Example: Server Component
// ===========================
// import { getTranslations } from 'next-intl';
//
// export async function ServerComponent() {
//   const t = getTranslations('navigation');
//   return <h1>{t('home')}</h1>;
// }

// Example: Client Component
// ===========================
// 'use client';
// import { useTranslations } from 'next-intl';
//
// export function ClientComponent() {
//   const t = useTranslations('dashboard');
//   return <h1>{t('title')}</h1>;
// }

// Example: Using multiple namespaces
// ====================================
// 'use client';
// import { useTranslations } from 'next-intl';
//
// export function MultiNamespaceComponent() {
//   const tNav = useTranslations('navigation');
//   const tCommon = useTranslations('common');
//   
//   return (
//     <>
//       <nav>{tNav('home')}</nav>
//       <button>{tCommon('save')}</button>
//     </>
//   );
// }

// Example: Using with useLocale() to get current locale
// ======================================================
// 'use client';
// import { useLocale } from 'next-intl';
//
// export function LocaleAwareComponent() {
//   const locale = useLocale();
//   return <p>Current locale: {locale}</p>;
// }

export const i18nNamespaces = {
  NAVIGATION: 'navigation',
  DASHBOARD: 'dashboard',
  AUTH: 'auth',
  RISK: 'risk',
  COMMON: 'common',
} as const;
