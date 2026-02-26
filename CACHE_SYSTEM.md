# Riskon Caching System Documentation

## Overview

The Riskon app now includes a sophisticated multi-layer caching system designed to improve performance, reduce API calls to Horizon, and provide a better user experience. The caching system includes:

1. **Structured localStorage caching** with versioning and TTL
2. **IndexedDB fallback** for large datasets  
3. **Automatic cache invalidation** on data updates
4. **Service Worker caching** for static assets and API calls (optional)
5. **TypeScript types** for type safety

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Application       │    │   Cache Manager      │    │   Service Worker    │
│                     │    │                     │    │                     │
│ • Risk calculations │◄──►│ • Version control    │◄──►│ • Static assets     │
│ • Horizon data      │    │ • TTL management     │    │ • API call caching  │
│ • User preferences  │    │ • IndexedDB fallback │    │ • Background sync   │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Cache Layers

### 1. Application Cache (Primary)
- **Storage**: localStorage + IndexedDB fallback
- **Features**: Versioning, TTL expiration, automatic cleanup
- **Use cases**: Risk scores, Horizon data, user settings

### 2. Service Worker Cache (Optional) 
- **Storage**: Browser Cache API
- **Features**: Background caching, offline support
- **Use cases**: Static assets, Horizon API GET requests

## Configuration

All cache settings are centralized in `src/config/cacheConfig.ts`:

```typescript
export const CACHE_TTL = {
  HORIZON_DATA: 5 * 60 * 1000,        // 5 minutes
  RISK_SCORE: 10 * 60 * 1000,         // 10 minutes
  RISK_TIER: 15 * 60 * 1000,          // 15 minutes
  RATE_LIMIT: 24 * 60 * 60 * 1000,    // 24 hours
};
```

## Usage Examples

### Basic Cache Operations

```typescript
import { setCache, getCache, invalidateCache } from '@/lib/cacheManager';

// Store data with custom TTL
await setCache('user_data', userData, { ttl: 10 * 60 * 1000 }); // 10 minutes

// Retrieve cached data
const cachedData = await getCache('user_data');

// Invalidate specific cache entry
await invalidateCache('user_data');
```

### Smart Cache Invalidation

```typescript
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';

const { invalidateRiskCache, invalidateUserCache } = useCacheInvalidation();

// Automatically invalidates related cache after risk score update
await invalidateRiskCache(walletAddress);

// Clears all user-specific cache
await invalidateUserCache(walletAddress);
```

### Service Worker Management

```typescript
import { useServiceWorker } from '@/lib/serviceWorkerManager';

const { status, enable, disable, clearAPICache } = useServiceWorker();

// Enable service worker caching
await enable();

// Clear API cache through service worker
await clearAPICache();
```

## Integration Points

### 1. Horizon Data Collection
The `horizonDataCollector.js` now automatically caches transaction data:

```javascript
// Automatically checks cache first, fetches if expired
const data = await collectTransactionData(walletAddress);
// Result is cached for 5 minutes with IndexedDB fallback
```

### 2. Risk Score Calculation
The `useRiskScore.js` hook includes caching:

```javascript
// Pass walletAddress to enable caching
const { riskScore, loading, error } = useRiskScore(features, walletAddress);
// Scores cached for 10 minutes, auto-invalidated on updates
```

### 3. Smart Contract Integration
The `riskTierClient.ts` includes smart caching:

```typescript
// Gets cached tier data or fetches fresh
const tierData = await riskTierClient.getRiskTier(userAddress);

// Automatically invalidates cache after updates
await riskTierClient.setRiskTier(userAddress, score, tier, chosenTier);
```

## Cache Events & Auto-Invalidation

The system automatically invalidates cache when:

1. **Risk score is recalculated**
   - Clears: risk score cache, tier cache, horizon data cache
   
2. **User risk tier is updated** 
   - Clears: tier cache, score cache
   
3. **Rate limit is recorded**
   - Triggers cache invalidation event

### Custom Event Listeners

```typescript
import { useAutoInvalidation } from '@/hooks/useCacheInvalidation';

// Automatically listens for cache invalidation events
useAutoInvalidation(walletAddress);

// Manual event dispatch
dispatchCacheEvent.riskScoreUpdated(walletAddress, newScore);
```

## Cache Management UI

Use the `CacheManagementDashboard` component for debugging and management:

```tsx
import { CacheManagementDashboard } from '@/components/CacheManagementDashboard';

<CacheManagementDashboard walletAddress={userWallet} />
```

Features:
- View cache statistics
- Enable/disable service worker
- Clear cache manually
- Monitor cache performance

## Performance Benefits

### Before Caching
```
User opens app → API call → 2-3 seconds loading
User refreshes → API call → 2-3 seconds loading
Risk calculation → Fresh API call → 2-3 seconds
```

### After Caching  
```
User opens app → Cache hit → Instant display  
User refreshes → Cache hit → Instant display
Risk calculation → Cached data → Sub-second calculation
Fresh data → Background update → Seamless experience
```

## Cache Keys Structure

All cache keys follow a consistent pattern:
```
{data_type}_{identifier}

Examples:
- horizon_data_GXXXXXXX...
- risk_score_GXXXXXXX... 
- user_risk_tier_GXXXXXXX...
- rate_limit_GXXXXXXX...
```

## Debugging & Monitoring

### Enable Debug Logging
Set `DEBUG_LOGGING: true` in `cacheConfig.ts` for development.

### Cache Hit/Miss Monitoring
```typescript
import { cacheManager } from '@/lib/cacheManager';

const stats = cacheManager.getCacheStats();
console.log('Cache entries:', stats.localStorageEntries);
console.log('Cache version:', stats.version);
```

### Performance Thresholds
The system warns when:
- Cache operations take >100ms
- Cache entries exceed 1000
- Cache hit ratio falls below 70%

## Migration from Legacy localStorage

The system automatically migrates from old localStorage entries:

1. **Rate limiting**: Migrates from `risk_score_last_update_*` to structured cache
2. **Passkey wallets**: Maintains existing localStorage for wallet data
3. **Other data**: Gradually migrates to new cache structure

## Best Practices

### 1. Use Appropriate TTL
```typescript
// Short TTL for dynamic data
setCache(key, data, { ttl: 2 * 60 * 1000 }); // 2 minutes

// Longer TTL for stable data  
setCache(key, data, { ttl: 60 * 60 * 1000 }); // 1 hour
```

### 2. Handle Cache Misses Gracefully
```typescript
const cachedData = await getCache(key);
if (!cachedData) {
  // Fetch fresh data
  const freshData = await fetchData();
  await setCache(key, freshData);
  return freshData;
}
return cachedData;
```

### 3. Invalidate Related Caches
```typescript
// After updating user data, invalidate related caches
await Promise.all([
  invalidateCache(`user_profile_${userId}`),
  invalidateCache(`user_preferences_${userId}`),
  invalidateCache(`user_stats_${userId}`),
]);
```

### 4. Use IndexedDB for Large Data
```typescript
// For large datasets, force IndexedDB usage
await setCache(key, largeDataset, { 
  useIndexedDB: true 
});
```

## Troubleshooting

### Cache Not Working
1. Check console for error messages
2. Verify cache version matches
3. Check TTL hasn't expired
4. Ensure localStorage/IndexedDB is available

### Service Worker Issues
1. Check if service worker is registered: `navigator.serviceWorker.getRegistration()`
2. Verify SW script is accessible at `/sw.js`
3. Check browser dev tools → Application → Service Workers

### Performance Problems
1. Monitor cache hit rates
2. Check for excessive cache invalidation
3. Adjust TTL values if needed
4. Consider using IndexedDB for large data

## Environment Configuration

The cache system adapts to different environments:

- **Development**: Shorter TTL, debug logging enabled
- **Production**: Standard TTL, optimized for performance  
- **Testing**: Very short TTL for reliable tests

## Security Considerations

1. **No sensitive data in cache**: Don't cache private keys or sensitive user data
2. **Cache versioning**: Prevents stale data issues across deployments
3. **TTL expiration**: Ensures data freshness for critical operations
4. **IndexedDB encryption**: Consider encryption for sensitive cached data

## Future Enhancements

Planned improvements:
1. **Cache compression** for large datasets
2. **Background sync** with service workers
3. **Cache warming** strategies
4. **Advanced invalidation** based on data dependencies
5. **Cache analytics** and performance monitoring

---

This caching system provides a robust foundation for improved performance while maintaining data freshness and reliability. The modular design allows for easy customization and future enhancements as the application grows.