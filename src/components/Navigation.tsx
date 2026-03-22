'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navigation() {
  const t = useTranslations('navigation');
  const locale = useLocale();

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link
            href={`/${locale}`}
            className="text-2xl font-bold text-blue-500 hover:text-blue-400 transition-colors"
          >
            RiskOn
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href={`/${locale}`}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {t('dashboard')}
            </Link>
            <Link
              href={`/${locale}/risk`}
              className="text-gray-300 hover:text-white transition-colors"
            >
              {t('riskAnalysis')}
            </Link>
          </div>
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
