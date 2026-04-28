"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, ChevronDown } from "lucide-react";
import { locales, localeNames, localeDirections } from "../../i18n/config";

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('header');

  const handleLanguageChange = (newLocale: string): void => {
    // Remove the current locale from pathname
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    
    // Add the new locale to the pathname
    const newPath = newLocale === 'en' 
      ? pathWithoutLocale 
      : `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
    setIsOpen(false);
  };

  const currentLanguageName = localeNames[locale] || locale;
  const isRTL = localeDirections[locale] === 'rtl';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
        aria-label={t('language')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLanguageName}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 ${
            isRTL ? 'right-0' : 'left-0'
          }`}
          role="menu"
        >
          <div className="py-1">
            {locales.map((loc: string) => (
              <button
                key={loc}
                onClick={() => handleLanguageChange(loc)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                  loc === locale ? 'bg-gray-700 text-blue-400' : 'text-white'
                } ${localeDirections[loc] === 'rtl' ? 'flex-row-reverse text-right' : ''}`}
                role="menuitem"
                dir={localeDirections[loc]}
              >
                <span className="font-medium">
                  {localeNames[loc]}
                </span>
                {loc === locale && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
