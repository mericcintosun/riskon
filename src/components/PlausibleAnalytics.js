'use client';

import { useEffect } from 'react';
import { ANALYTICS_CONFIG, isPlausibleEnabled } from '../config/analytics';

export default function PlausibleAnalytics() {
  useEffect(() => {
    if (isPlausibleEnabled() && typeof window !== 'undefined') {
      // Load Plausible script
      const script = document.createElement('script');
      script.src = ANALYTICS_CONFIG.plausible.scriptUrl;
      script.dataset.domain = ANALYTICS_CONFIG.plausible.domain;
      script.defer = true;
      script.async = true;

      // Add integrity and crossorigin for security
      script.integrity = 'sha384-x0XGdEYqRnRjzJhJgRfVpF7n6QZj6o5k7QZj6o5k7QZj6o5k7QZj6o5k7Q';
      script.crossOrigin = 'anonymous';

      document.head.appendChild(script);

      // Initialize Plausible
      window.plausible = window.plausible || function() {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };

      // Clean up on unmount
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  return null;
}
