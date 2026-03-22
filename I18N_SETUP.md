# Internationalization (i18n) Setup Documentation

## Overview
This project uses `next-intl` for comprehensive internationalization support. Currently supports 3 languages:
- **English** (en) - Default language
- **Turkish** (tr)
- **Deutsch/German** (de)

## Project Structure

```
├── app/[locale]/                    # Main app directory with locale routing
│   ├── layout.tsx                   # Root layout with i18n setup
│   ├── page.tsx                     # Home page
│   ├── dashboard/page.tsx           # Dashboard page
│   ├── risk/page.tsx               # Risk analysis page
│   └── auth/page.tsx               # Authentication page
├── messages/                        # Translation files
│   ├── en.json                      # English translations
│   ├── tr.json                      # Turkish translations
│   └── de.json                      # German translations
├── src/
│   ├── components/
│   │   ├── Navigation.tsx           # Navigation with language switcher
│   │   ├── LanguageSwitcher.tsx     # Language selection dropdown
│   │   └── LoginForm.tsx            # Example client component using i18n
│   ├── hooks/
│   │   └── useRtl.ts               # RTL language detection hooks
│   ├── utils/
│   │   ├── i18n-examples.ts        # Usage examples and namespace constants
│   │   └── rtl-utils.ts            # RTL support utilities
│   ├── i18n.ts                     # i18n configuration
│   └── styles/
│       └── globals.css             # Global styles
├── middleware.ts                    # Locale routing middleware
└── next.config.mjs                 # Next.js configuration
```

## How to Use Translations

### In Client Components

Use the `useTranslations` hook to access translations:

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('dashboard'); // Use 'dashboard' namespace
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
    </div>
  );
}
```

### In Server Components

Use the `getTranslations` function (works the same way):

```typescript
import { getTranslations } from 'next-intl';

export async function MyServerComponent() {
  const t = getTranslations('navigation');
  
  return <h1>{t('home')}</h1>;
}
```

### Using Multiple Namespaces

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const tNav = useTranslations('navigation');
  const tCommon = useTranslations('common');
  
  return (
    <>
      <div>{tNav('home')}</div>
      <button>{tCommon('save')}</button>
    </>
  );
}
```

### Getting Current Locale

```typescript
'use client';

import { useLocale } from 'next-intl';

export function CurrentLocaleComponent() {
  const locale = useLocale();
  
  return <p>Current language: {locale}</p>;
}
```

## Translation Namespaces

The following namespaces are available in the translation files:
- **`navigation`** - Navigation menu items (home, dashboard, logout, etc.)
- **`dashboard`** - Dashboard-specific text (title, welcome, overview, etc.)
- **`auth`** - Authentication-related text (login, signup, email, password, etc.)
- **`risk`** - Risk analysis page text (score, level, metrics, etc.)
- **`common`** - Common UI elements (loading, error, save, cancel, etc.)

## Adding New Languages

To add a new language (e.g., French - 'fr'):

1. **Create translation file**: `messages/fr.json`
   ```json
   {
     "navigation": {
       "home": "Accueil",
       "dashboard": "Tableau de bord",
       ...
     },
     ...
   }
   ```

2. **Update i18n config**: `src/i18n.ts`
   ```typescript
   export const locales = ['en', 'tr', 'de', 'fr']; // Add 'fr'
   ```

3. **Update Language Switcher**: `src/components/LanguageSwitcher.tsx`
   ```typescript
   const languageNames: Record<string, string> = {
     en: 'English',
     tr: 'Türkçe',
     de: 'Deutsch',
     fr: 'Français', // Add French
   };
   ```

## Adding New Translation Keys

1. Add your key to all translation files:

   **messages/en.json:**
   ```json
   {
     "mySection": {
       "myKey": "My English text"
     }
   }
   ```

   **messages/tr.json:**
   ```json
   {
     "mySection": {
       "myKey": "Benim Türkçe metnim"
     }
   }
   ```

   **messages/de.json:**
   ```json
   {
     "mySection": {
       "myKey": "Mein deutscher Text"
     }
   }
   ```

2. Use in your component:
   ```typescript
   const t = useTranslations('mySection');
   return <p>{t('myKey')}</p>;
   ```

## Locale Routing

The middleware automatically handles locale routing:
- URLs always include the locale prefix: `/en`, `/tr`, `/de`
- User is redirected to default locale (`/en`) if no locale is specified
- All navigation links include the current locale

## Language Switcher

The `<LanguageSwitcher />` component (available in Navigation) allows users to:
- See current language
- Click to open language dropdown
- Select a new language
- Automatically update the route to the new locale

Example usage:
```typescript
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  return (
    <header>
      <nav>
        {/* Other nav items */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

## RTL (Right-to-Left) Language Support

The application includes structure for RTL language support:

### RTL Utilities

Use the RTL utilities to build RTL-compatible components:

```typescript
import { useTextDirection } from '@/hooks/useRtl';

export function MyComponent() {
  const dir = useTextDirection(); // Returns 'rtl' or 'ltr'
  
  return <div dir={dir}>Content</div>;
}
```

### Check if Language is RTL

```typescript
'use client';

import { useIsRtl } from '@/hooks/useRtl';

export function MyComponent() {
  const isRtl = useIsRtl();
  
  return (
    <div className={isRtl ? 'text-right' : 'text-left'}>
      Content
    </div>
  );
}
```

### Adding RTL Languages

To support RTL languages like Arabic:

1. **Update RTL configuration**: `src/utils/rtl-utils.ts`
   ```typescript
   export const rtlLanguages = ['ar', 'he', 'fa', 'ur']; // Add 'ar' for Arabic
   ```

2. **Create translation file**: `messages/ar.json` with Arabic translations

3. **Update locales**: Add 'ar' to `locales` array in `src/i18n.ts`

## Smart Contract Logic

⚠️ **IMPORTANT**: The i18n setup does NOT modify smart contract logic. All blockchain interactions remain unchanged:
- Smart contract calls are not affected
- Contract ABIs and addresses remain the same
- Risk calculation algorithms are not translated
- Only UI text and labels are internationalized

## Testing Locale Routes

Test the following URLs to verify i18n is working:

```
http://localhost:3000/en          # English home
http://localhost:3000/en/dashboard # English dashboard
http://localhost:3000/tr          # Turkish home
http://localhost:3000/tr/dashboard # Turkish dashboard
http://localhost:3000/de          # German home
http://localhost:3000/de/dashboard # German dashboard
```

## Environment Setup

Make sure `next-intl` is installed:
```bash
npm install next-intl
```

Or with other package managers:
```bash
yarn add next-intl
bun add next-intl
pnpm add next-intl
```

## Common Patterns

### Form with Translations
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyForm() {
  const t = useTranslations('auth');
  
  return (
    <form>
      <label>{t('email')}</label>
      <input placeholder={t('email')} />
      <button>{t('login')}</button>
    </form>
  );
}
```

### Dynamic Content with Translations
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function RiskLevel({ level }: { level: 'high' | 'medium' | 'low' }) {
  const t = useTranslations('risk');
  
  return <span>{t(level)}</span>;
}
```

### Locale-Aware Links
```typescript
'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

export function NavLink({ href, children }: any) {
  const locale = useLocale();
  
  return <Link href={`/${locale}${href}`}>{children}</Link>;
}
```

## Troubleshooting

### Issue: Translations not updating
- Ensure the correct namespace is used in `useTranslations()`
- Check that translation keys exist in all language files
- Restart the dev server

### Issue: Missing translations
- Add the key to all translation files (en.json, tr.json, de.json)
- Follow the existing structure and naming conventions

### Issue: Locale not being applied
- Ensure middleware.ts is in the root directory
- Check that routes use the `[locale]` parameter
- Verify `localePrefix: 'always'` in middleware configuration

## Additional Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Pluralization](https://next-intl-docs.vercel.app/docs/features/pluralization)
- [Date & Time Formatting](https://next-intl-docs.vercel.app/docs/features/formatting)
- [Navigation](https://next-intl-docs.vercel.app/docs/usage/navigation)
