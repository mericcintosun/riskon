# Cache System Testing Guide

## Quick Start

### 1. Access the Test Page
Navigate to: `http://localhost:3000/cache-test`

### 2. Run Tests
- **Quick Test**: Click "Run Test" in the blue box for a 2-second TTL test
- **Full Suite**: Click "Run All Tests" for comprehensive validation
- **Individual Tests**: Click on specific test buttons for targeted testing

## Test Scenarios

### 🔹 Test 1: TTL Expiration (5 seconds)
**What it does:**
1. Stores test data with 5-second TTL
2. Retrieves immediately → ✅ should return data
3. Waits 6 seconds
4. Retrieves again → ✅ should return null (expired)

**Expected Console Output:**
```
🔹 Test 1: TTL Expiration
  ✓ Immediate retrieval: SUCCESS
  ⏱️ Waiting 6 seconds for TTL expiration...
  ✓ Expired retrieval: SUCCESS (returned null)
  ✓ Cache cleanup confirmed. Current entries: X
```

### 🔹 Test 2: Version Invalidation
**What it does:**
1. Creates cache entry with fake old version "0.9.0"
2. Current system uses version "1.0.0"
3. Old version should be rejected (return null)
4. Current version should work normally

**Manual Test:**
1. Change `CACHE_VERSION` in `src/config/cacheConfig.ts` to "2.0.0"
2. Reload the app
3. All existing cache should be cleared automatically

### 🔹 Test 3: Manual Invalidation
**What it does:**
1. Stores risk score and horizon data
2. Simulates risk score update event
3. Manually invalidates caches
4. Verifies cache returns null afterward

**Real-world trigger:**
When you use any risk calculation feature in the app, cache should auto-invalidate.

### 🔹 Test 4: IndexedDB Fallback
**What it does:**
1. Generates large dataset (50,000 entries, ~5MB)
2. Forces IndexedDB storage
3. Retrieves and validates data integrity
4. Cleans up test data

**Check IndexedDB:**
1. Open DevTools → Application → Storage → IndexedDB
2. Look for "riskonCache" database
3. Should see large dataset entries

### 🔹 Test 5: Service Worker (Manual Steps Required)
**Automated part:**
1. Registers service worker
2. Checks activation status
3. Tests cache management

**Manual verification:**
1. Run the test to register SW
2. Open DevTools → Network tab
3. Check "Offline" checkbox
4. Reload the page
5. Static assets should still load from SW cache

## Console Testing

For quick console-based testing, load the manual test utils:

```javascript
// In browser console:
await cacheTestUtils.testTTL()           // 5-second TTL test
await cacheTestUtils.testLargeData()     // IndexedDB fallback
await cacheTestUtils.runAll()            // All tests
await cacheTestUtils.cleanup()           // Clear test data
```

## Performance Expectations

### Before Caching:
- Horizon API call: 2-3 seconds
- Risk calculation: 2-3 seconds  
- App reload: 3-5 seconds

### After Caching:
- Cached Horizon data: ~50ms
- Cached risk score: ~10ms
- App reload: ~500ms

## Troubleshooting

### Test Failures

**TTL Test Fails:**
- Check console for timing issues
- Ensure system clock is accurate
- Verify cache manager is loaded

**Version Test Fails:**
- Check `CACHE_VERSION` in config
- Clear browser data and retry
- Verify cache entry structure

**IndexedDB Test Fails:**
- Check if IndexedDB is enabled in browser
- Look for console errors about storage quotas
- Try in incognito mode

**Service Worker Test Fails:**
- Check if running on localhost or HTTPS
- Verify `/sw.js` is accessible
- Look for registration errors in console

### Cache Not Working
1. Open DevTools → Console
2. Look for cache-related errors
3. Check `localStorage` and `IndexedDB` availability
4. Verify cache version matches

### Performance Not Improved
1. Run performance test: `await cacheTestUtils.testPerformance()`
2. Check cache hit rates in dashboard
3. Verify cache isn't being invalidated too frequently
4. Check network throttling isn't enabled

## Debug Information

### Key Files:
- **Config**: `src/config/cacheConfig.ts`
- **Cache Manager**: `src/lib/cacheManager.ts`
- **Service Worker**: `public/sw.js`  
- **Tests**: `src/tests/cacheTestSuite.ts`

### Cache Keys Pattern:
```
{data_type}_{identifier}

Examples:
- horizon_data_GXXXXX...
- risk_score_GXXXXX...
- user_risk_tier_GXXXXX...
- rate_limit_GXXXXX...
```

### Browser DevTools:
- **Application → Storage → Local Storage**: Application cache entries
- **Application → Storage → IndexedDB → riskonCache**: Large data fallback
- **Application → Service Workers**: SW registration status
- **Network**: Check cache hits (304 responses)

## Expected Test Results

All 5 tests should pass (100% success rate):
- ✅ TTL Expiration: Data expires correctly after TTL
- ✅ Version Invalidation: Rejects mismatched cache versions  
- ✅ Manual Invalidation: Auto-invalidates on updates
- ✅ IndexedDB Fallback: Large datasets use IndexedDB
- ✅ Service Worker: Offline functionality works

If any test fails, check the detailed error message and follow the troubleshooting steps above.