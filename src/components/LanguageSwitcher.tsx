'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const languageNames: Record<string, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = (newLocale: string) => {
    // Remove the current locale from pathname and add the new one
    const pathWithoutLocale = pathname.replace(`/${locale}`, '');
    const newPath = `/${newLocale}${pathWithoutLocale || ''}`;
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        aria-label="Switch language"
      >
        <Globe size={18} />
        <span className="font-medium">{languageNames[locale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-700">
          {locales.map((lang) => (
            <button
              key={lang}
              onClick={() => switchLanguage(lang)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors ${
                locale === lang ? 'bg-blue-600 font-semibold' : 'text-gray-300'
              } ${lang === 'en' ? 'rounded-t-lg' : ''} ${
                lang === 'de' ? 'rounded-b-lg' : ''
              }`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
