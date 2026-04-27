'use client';

import { useEffect } from 'react';
import { GoogleAnalytics as GoogleAnalyticsComponent } from '@next/third-parties/google';
import { ANALYTICS_CONFIG, isGoogleAnalyticsEnabled } from '../config/analytics';

export default function GoogleAnalytics() {
  useEffect(() => {
    // Initialize Google Analytics
    if (isGoogleAnalyticsEnabled() && typeof window !== 'undefined') {
      // Load gtag script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalytics.measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ANALYTICS_CONFIG.googleAnalytics.measurementId, {
        send_page_view: false, // We'll handle page views manually
        cookie_flags: 'SameSite=Lax;Secure',
        anonymize_ip: true,
      });

      // Clean up on unmount
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  // Render the Next.js Google Analytics component
  if (isGoogleAnalyticsEnabled()) {
    return (
      <GoogleAnalyticsComponent
        gaId={ANALYTICS_CONFIG.googleAnalytics.measurementId}
      />
    );
  }

  return null;
}
