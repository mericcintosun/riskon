import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "../contexts/WalletContext";

const inter = Inter({ subsets: ["latin"] });
const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat'
});

export const metadata = {
  title: "Riskon - AI-Powered Blockchain Risk Scoring",
  description: "Calculate personalized blockchain risk scores and access DeFi features through Blend Protocol integration on Stellar network.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.className} ${montserrat.variable}`}>
      <body className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 min-h-screen text-white antialiased">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
