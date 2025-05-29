import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="font-montserrat">
      <head>
        <title>Riskon - Blockchain Tabanlı Risk Skorları ve DeFi Önerileri</title>
        <meta name="description" content="Blockchain işlem geçmişinizi analiz ederek size özel risk skorları hesaplayın ve Blend DeFi protokolü ile en uygun stratejileri keşfedin." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Google Fonts - Montserrat, Roboto, Open Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Riskon Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Meta tags for better SEO */}
        <meta name="keywords" content="DeFi, Blockchain, Risk Skoru, Stellar, Blend Protocol, Kişiselleştirilmiş Finans" />
        <meta name="author" content="Riskon Team" />
        <meta property="og:title" content="Riskon - Blockchain Tabanlı Risk Skorları" />
        <meta property="og:description" content="AI destekli DeFi risk analizi ve kişiselleştirilmiş öneriler" />
        <meta property="og:type" content="website" />
      </head>
      <body className="bg-riskon-bg text-riskon-text font-montserrat antialiased">
        <div className="min-h-screen bg-gradient-to-br from-riskon-bg via-purple-900 to-riskon-primary">
          {children}
        </div>
      </body>
    </html>
  );
}
