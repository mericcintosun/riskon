import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../contexts/WalletContext";
import { ToastProvider } from "../contexts/ToastContext";
import ErrorBoundary from "../components/ErrorBoundary";
import Footer from "../components/Footer";

const inter = Inter({ subsets: ["latin"] });
const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat'
});

export const metadata = {
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
  themeColor: '#000',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.className} ${montserrat.variable}`}>
      <body className="bg-black min-h-screen text-white antialiased flex flex-col">
        <ErrorBoundary>
          <ToastProvider>
            <WalletProvider>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </WalletProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
