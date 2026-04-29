# Internationalization (i18n) Implementation

This document describes the internationalization implementation for the Riskon application, which provides multi-language support for users worldwide.

## Overview

The Riskon application now supports 7 languages:
- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- Arabic (ar) - With RTL support

## Architecture

### Core Components

1. **next-intl Library**: Used for internationalization in Next.js
2. **Locale-based Routing**: URLs include locale prefixes (e.g., `/es/features`)
3. **Dynamic Language Switcher**: Component for changing languages
4. **RTL Support**: Right-to-left layout for Arabic

### File Structure

```
riskon/
├── i18n.js                    # Main i18n configuration
├── i18n/
│   └── config.ts             # Locale definitions and routing
├── messages/                  # Translation files
│   ├── en.json               # English translations
│   ├── es.json               # Spanish translations
│   ├── fr.json               # French translations
│   ├── de.json               # German translations
│   ├── zh.json               # Chinese translations
│   ├── ja.json               # Japanese translations
│   └── ar.json               # Arabic translations
├── src/
│   ├── app/[locale]/         # Locale-specific app structure
│   │   ├── layout.js         # Locale-aware layout
│   │   └── page.js          # Locale-aware page
│   └── components/
│       └── LanguageSwitcher.jsx # Language selection component
└── middleware.ts             # Updated middleware for i18n routing
```

## Implementation Details

### 1. Configuration

**i18n.js**: Main configuration file that loads messages based on locale
```javascript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
```

**i18n/config.ts**: Defines supported locales and their properties
```typescript
export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ar'] as const;
export const defaultLocale = 'en' as const;

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
  ar: 'العربية'
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr', es: 'ltr', fr: 'ltr', de: 'ltr', zh: 'ltr', ja: 'ltr',
  ar: 'rtl'
};
```

### 2. Middleware

Updated `middleware.ts` to handle both security features and i18n routing:
```javascript
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return intlMiddleware(request);
  }
  // ... existing security middleware logic
}
```

### 3. Next.js Configuration

Updated `next.config.mjs` to include next-intl plugin:
```javascript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.js');

export default withNextIntl(nextConfig);
```

### 4. App Structure

Created locale-aware app structure under `src/app/[locale]/`:
- `layout.js`: Handles locale-specific layout with RTL support
- `page.js`: Main application page with translations

### 5. Language Switcher Component

**LanguageSwitcher.jsx**: Dropdown component for language selection
- Shows current language name
- Displays all available languages
- Handles locale routing updates
- Supports RTL layout for Arabic

### 6. Translation Usage

Components use the `useTranslations` hook:
```javascript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations();
  
  return <h1>{t('header.title')}</h1>;
}
```

## Translation Keys Structure

Translation files are organized by feature areas:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "home": "Home",
    "about": "About"
  },
  "header": {
    "title": "Riskon",
    "connectWallet": "Connect Wallet"
  },
  "landing": {
    "heroTitle": "AI-Powered Risk Scoring for Stellar DeFi"
  },
  "riskAnalyzer": {
    "title": "Risk Analyzer",
    "riskScore": "Risk Score"
  }
}
```

## RTL Support

Arabic language includes RTL (Right-to-Left) support:
- HTML `dir` attribute set to `rtl` for Arabic locale
- CSS classes and components adapt to RTL layout
- Language switcher adjusts positioning for RTL

## URL Structure

- English (default): `/features`
- Other languages: `/es/features`, `/fr/features`, etc.
- Automatic locale detection from browser settings
- Language preference persisted in cookies

## Features Implemented

### ✅ Completed Features

1. **Library Integration**: next-intl properly configured
2. **Translation Files**: Complete translations for 7 languages
3. **Locale Routing**: URL-based locale switching
4. **Language Switcher**: Interactive dropdown component
5. **Component Updates**: Header, Footer, and main components updated
6. **RTL Support**: Arabic language with right-to-left layout
7. **Middleware Integration**: Combined security and i18n middleware
8. **App Structure**: Locale-aware Next.js app directory structure

### 🔄 Translation Coverage

All major UI elements are translated:
- Navigation menus
- Header and footer
- Risk analyzer interface
- Error messages
- Loading states
- Form labels and buttons
- Dashboard components

## Usage Instructions

### For Developers

1. **Adding New Translations**:
   - Add keys to all `messages/*.json` files
   - Use consistent key structure
   - Test with all locales

2. **Adding New Languages**:
   - Create new `messages/[locale].json` file
   - Add locale to `i18n/config.ts`
   - Update `localeNames` and `localeDirections`

3. **Using Translations in Components**:
   ```javascript
   import { useTranslations } from 'next-intl';
   const t = useTranslations();
   const text = t('key.path');
   ```

### For Users

1. **Language Selection**:
   - Click language switcher in header
   - Select preferred language from dropdown
   - Page reloads with new locale

2. **URL Navigation**:
   - Manual locale addition to URLs
   - Browser language auto-detection
   - Persistent language preference

## Benefits

1. **Global Accessibility**: Users can access the app in their native language
2. **Improved UX**: Localized interface enhances user experience
3. **SEO Benefits**: Multi-language content improves search visibility
4. **Scalability**: Easy to add new languages
5. **Cultural Adaptation**: RTL support for Arabic-speaking users

## Future Enhancements

1. **Dynamic Loading**: Load translations on demand
2. **Currency Localization**: Format numbers and currencies by locale
3. **Date/Time Localization**: Locale-specific date formatting
4. **Content Translation**: Translate user-generated content
5. **A/B Testing**: Test translations for effectiveness

## Testing

To test internationalization:

1. **Language Switching**:
   - Navigate to different locales
   - Verify content updates
   - Check URL structure

2. **RTL Testing**:
   - Switch to Arabic locale
   - Verify layout direction
   - Test component alignment

3. **Translation Completeness**:
   - Check all UI elements are translated
   - Verify no hardcoded strings remain
   - Test error states and loading messages

## Conclusion

The internationalization implementation provides a robust foundation for serving global users. With support for 7 languages including RTL layout, the Riskon application is now accessible to a much broader audience while maintaining the same functionality and user experience across all locales.
