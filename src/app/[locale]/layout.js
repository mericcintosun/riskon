import { Inter, Montserrat } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import "../globals.css";
import { WalletProvider } from "../../contexts/WalletContext";
import { ToastProvider } from "../../contexts/ToastContext";
import ErrorBoundary from "../../components/ErrorBoundary";
import Footer from "../../components/Footer";
import RiskDataInitializer from "../../components/RiskDataInitializer";
import PWAInstallPrompt from "../../components/PWAInstallPrompt";
import OfflineDetector from "../../components/OfflineDetector";
import { pwaUtils } from "../../lib/pwaUtils";

const inter = Inter({ subsets: ["latin"] });
const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat'
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params: { locale } }) {
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Initialize PWA features
  if (typeof window !== 'undefined') {
    pwaUtils.registerServiceWorker().catch(console.error);
  }

  return (
    <html lang={locale} className={`${inter.className} ${montserrat.variable}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className="bg-black min-h-screen text-white antialiased flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ErrorBoundary>
            <ToastProvider>
              <WalletProvider>
                <OfflineDetector>
                  <RiskDataInitializer />
                  <div className="flex-1">
                    {children}
                  </div>
                  <Footer />
                </OfflineDetector>
                <PWAInstallPrompt />
              </WalletProvider>
            </ToastProvider>
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
