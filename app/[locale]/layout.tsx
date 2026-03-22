import { ReactNode } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Navigation from "@/components/Navigation";
import { getLocaleDirection } from "@/i18n/direction";
import { routing } from "@/i18n/routing";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<LocaleLayoutProps, "children">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "navigation" });

  return {
    title: t("appName"),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} dir={getLocaleDirection(locale)}>
      <body className="bg-gray-50 text-gray-900">
        <NextIntlClientProvider messages={messages}>
          <Navigation />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
