# Analytics and Monitoring Setup Guide

This document explains how to set up and use the comprehensive analytics and monitoring system implemented in Riskon.

## Overview

The analytics system provides:
- **Google Analytics** - For comprehensive user analytics and behavior tracking
- **Sentry** - For error tracking and performance monitoring
- **Plausible Analytics** - Privacy-friendly analytics alternative
- **Vercel Analytics** - Built-in analytics for Vercel deployments
- **Custom Performance Monitoring** - Web Vitals and custom metrics
- **Privacy-Friendly User Behavior Tracking** - Clicks, scrolls, and page views

## Environment Configuration

### 1. Copy the environment template

```bash
cp .env.local.example .env.local
```

### 2. Configure your analytics services

Edit `.env.local` with your actual analytics service credentials:

```env
# Google Analytics
NEXT_PUBLIC_GA_ENABLED=true
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_ENABLED=true
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1

# Plausible Analytics (Privacy-friendly)
NEXT_PUBLIC_PLAUSIBLE_ENABLED=true
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL=https://plausible.io/js/script.js

# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED=true

# Performance Monitoring
NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED=true
NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE=0.1

# User Behavior Tracking (Privacy-friendly)
NEXT_PUBLIC_BEHAVIOR_TRACKING_ENABLED=true
NEXT_PUBLIC_TRACK_CLICKS=true
NEXT_PUBLIC_TRACK_SCROLLS=true
NEXT_PUBLIC_TRACK_PAGE_VIEWS=true
NEXT_PUBLIC_ANONYMIZE_DATA=true
```

## Service Setup Instructions

### Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property for your application
3. Set up a web data stream
4. Copy the Measurement ID (format: `G-XXXXXXXXXX`)
5. Add it to your `.env.local` file

### Sentry Error Tracking

1. Go to [Sentry.io](https://sentry.io/)
2. Create a new organization and project
3. Select "Next.js" as the platform
4. Copy the DSN (Data Source Name)
5. Add it to your `.env.local` file

### Plausible Analytics

1. Sign up at [Plausible.io](https://plausible.io/)
2. Add your domain
3. Copy the domain name and script URL
4. Add them to your `.env.local` file

### Vercel Analytics

Vercel Analytics is automatically available if you're deploying to Vercel. Just enable it in your Vercel dashboard.

## Usage

### Using the Analytics Hook

Import and use the `useAnalytics` hook in your components:

```javascript
import useAnalytics from '../hooks/useAnalytics';

function MyComponent() {
  const { trackEvent, trackStellar, trackWalletEvent } = useAnalytics();

  const handleButtonClick = () => {
    trackEvent('button_clicked', { button_name: 'submit_form' });
  };

  const handleWalletConnect = (walletType) => {
    trackWalletEvent('connected', walletType);
  };

  return (
    <button onClick={handleButtonClick}>
      Click me
    </button>
  );
}
```

### Available Tracking Methods

#### Basic Tracking
- `trackEvent(eventName, parameters)` - Track custom events
- `trackPageView(path)` - Track page views
- `trackStellar(eventName, parameters)` - Track Stellar-specific events

#### User Interactions
- `trackInteraction(action, context)` - Track user interactions
- `trackWalletEvent(eventName, walletType, context)` - Track wallet events
- `trackTransaction(status, transactionType, context)` - Track transactions
- `trackFormSubmission(formName, success, context)` - Track form submissions

#### Feature Tracking
- `trackFeatureUsage(featureName, context)` - Track feature usage
- `trackNavigation(from, to, method)` - Track navigation
- `trackSearch(query, resultCount, context)` - Track search queries
- `trackEngagement(contentType, contentId, action)` - Track content engagement

#### Performance and Error Tracking
- `trackPerformanceMetric(metricName, value, tags)` - Track performance metrics
- `trackCustomError(error, context)` - Track custom errors

### Automatic Tracking

The system automatically tracks:
- Page views and navigation
- JavaScript errors
- Performance metrics (Web Vitals)
- User clicks and scrolls (if enabled)
- App load events

## Privacy Considerations

### Data Anonymization

The system includes built-in privacy protections:
- User data is anonymized by default
- Sensitive URL parameters are stripped
- User agents are truncated
- Personal information is filtered out

### Opt-out Options

Users can opt out by:
- Adding `data-no-track` attribute to elements they don't want tracked
- Using browser privacy settings
- Enabling ad blockers

### GDPR Compliance

- No personal data is collected without consent
- All data is anonymized
- Users can request data deletion
- Clear data retention policies

## Performance Impact

The analytics system is designed to have minimal performance impact:
- Scripts are loaded asynchronously
- Tracking is non-blocking
- Sample rates can be configured
- Lazy loading of analytics libraries

## Debugging

### Development Mode

In development mode, analytics events are logged to the console:
```javascript
console.log('Analytics event:', { eventName, parameters });
```

### Testing Analytics

You can test analytics by:
1. Opening browser dev tools
2. Checking the Network tab for analytics requests
3. Looking at console logs for debugging information
4. Using analytics service dashboards

## Troubleshooting

### Common Issues

1. **Analytics not working**
   - Check environment variables are set correctly
   - Verify CSP headers allow analytics domains
   - Check browser console for errors

2. **Sentry not capturing errors**
   - Verify DSN is correct
   - Check Sentry dashboard for incoming events
   - Ensure sentry.client.config.js is properly configured

3. **Performance tracking not working**
   - Ensure performance monitoring is enabled
   - Check browser compatibility
   - Verify sample rate settings

### CSP Headers

The system includes updated Content Security Policy headers for:
- `https://www.googletagmanager.com` - Google Analytics
- `https://plausible.io` - Plausible Analytics
- `https://*.sentry.io` - Sentry error tracking
- `https://browser.sentry-cdn.com` - Sentry CDN

## Monitoring and Alerts

### Sentry Alerts

Set up alerts in Sentry for:
- Error rate spikes
- Performance degradation
- New error types
- Specific user issues

### Analytics Dashboards

Monitor key metrics:
- Page views and unique visitors
- User engagement and retention
- Error rates and performance
- Feature adoption rates

## Best Practices

1. **Track meaningful events** - Focus on user journey and key actions
2. **Use consistent naming** - Follow a clear naming convention
3. **Respect privacy** - Only collect necessary data
4. **Monitor performance** - Keep an eye on analytics impact
5. **Regular review** - Periodically review and clean up tracking

## Integration Examples

### Stellar Wallet Events
```javascript
const { trackWalletEvent } = useAnalytics();

// Track wallet connection
trackWalletEvent('connected', walletType, { network: 'testnet' });

// Track wallet disconnection
trackWalletEvent('disconnected', walletType);
```

### Transaction Tracking
```javascript
const { trackTransaction } = useAnalytics();

// Track successful transaction
trackTransaction('success', 'payment', { amount: '100 XLM' });

// Track failed transaction
trackTransaction('failed', 'payment', { error: 'insufficient_funds' });
```

### Feature Usage
```javascript
const { trackFeatureUsage } = useAnalytics();

// Track risk calculation feature
trackFeatureUsage('risk_calculator', { 
  risk_score: result.score,
  calculation_time: duration 
});
```

This comprehensive analytics system provides deep insights into user behavior, application performance, and error tracking while maintaining strong privacy protections and minimal performance impact.
