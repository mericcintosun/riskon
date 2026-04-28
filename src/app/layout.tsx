import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../contexts/WalletContext";
import { ToastProvider } from "../contexts/ToastContext";
import ErrorBoundary from "../components/ErrorBoundary";
import Footer from "../components/Footer";
import RiskDataInitializer from "../components/RiskDataInitializer";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import OfflineDetector from "../components/OfflineDetector";
import { pwaUtils } from "../lib/pwaUtils";

interface Metadata {
  title: string;
  description: string;
  icons: {
    icon: Array<{
      url: string;
      sizes?: string;
      type?: string;
    }>;
    shortcut?: string;
    apple?: Array<{
      url: string;
      sizes?: string;
      type?: string;
    }>;
  };
  manifest: string;
}

interface Viewport {
  themeColor: string;
  width: string;
  initialScale: number;
}

interface RootLayoutProps {
  children: React.ReactNode;
}

const inter = Inter({ subsets: ["latin"] });
const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat'
});

export const metadata: Metadata = {
  title: "Riskon - AI-Powered Blockchain Risk Scoring",
  description: "Calculate personalized blockchain risk scores and access DeFi features through Blend Protocol integration on Stellar network.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png' },
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: RootLayoutProps) {
  // Initialize PWA features
  if (typeof window !== 'undefined') {
    pwaUtils.registerServiceWorker().catch(console.error);
  }

  return (
    <html lang="en" className={`${inter.className} ${montserrat.variable}`}>
      <body className="bg-black min-h-screen text-white antialiased flex flex-col">
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
            </WalletProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
