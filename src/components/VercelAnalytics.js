'use client';

import { Analytics } from '@vercel/analytics/react';
import { ANALYTICS_CONFIG, isVercelAnalyticsEnabled } from '../config/analytics';

export default function VercelAnalytics() {
  if (isVercelAnalyticsEnabled()) {
    return <Analytics />;
  }
  return null;
}
