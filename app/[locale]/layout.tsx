import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Navigation } from '@/components/Navigation';
import { getTextDirection } from '@/utils/rtl-utils';
import '@/styles/globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: Props) {
  // Validate the locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client side
  const messages = await getMessages();
  
  // Get text direction for RTL support
  const textDirection = getTextDirection(locale);

  return (
    <html lang={locale} dir={textDirection} suppressHydrationWarning>
      <body className="bg-slate-900 text-white">
        <NextIntlClientProvider messages={messages}>
          <Navigation />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
