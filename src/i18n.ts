import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'tr', 'de'];
export const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale parameter is valid
  if (!locales.includes(locale as any))
    throw new Error(`Invalid locale: ${locale}`);

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
