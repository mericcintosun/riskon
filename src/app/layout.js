import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <title>Stellar Risk Scoring - DeFi Risk Assessment</title>
        <meta name="description" content="AI-powered DeFi risk scoring on Stellar blockchain" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
