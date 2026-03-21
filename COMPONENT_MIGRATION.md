# 🔗 Component Migration Guide

## How to Update Components to Use the New API Routes

This guide shows how to migrate existing components from direct backend calls to the new typed API layer.

---

## EnhancedLiquidityPools.jsx - Pattern to Follow

### Before (Current Code - Lines 72-76)
```javascript
const loadLiquidityPools = async () => {
  try {
    setLoading(true);
    setError(null);

    // ❌ OLD: Calls non-existent endpoint
    const response = await fetch("/api/liquidity-pools/all");

    if (!response.ok) {
      throw new Error(`Failed to fetch pools: ${response.status}`);
    }

    const poolData = await response.json();
    setPools(poolData);
  } catch (error) {
    console.error("❌ Failed to load liquidity pools:", error);
    setError("Failed to load liquidity pools");
  } finally {
    setLoading(false);
  }
};
```

### After (Updated Approach)
```javascript
const loadLiquidityPools = async () => {
  try {
    setLoading(true);
    setError(null);

    // ✅ NEW: Uses new API route with proper typing
    const response = await fetch("/api/liquidity/pools/all?sort=tvl&limit=100");

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch pools: ${response.status}`);
    }

    const { success, data } = await response.json();
    if (!success) {
      throw new Error("API returned success: false");
    }

    setPools(data);
  } catch (error) {
    console.error("❌ Failed to load liquidity pools:", error);
    setError("Failed to load liquidity pools");
  } finally {
    setLoading(false);
  }
};
```

---

## Also Update: Line 94 - Statistics Loading

### Before
```javascript
const loadLiquidityStats = async () => {
  try {
    // ❌ Current endpoint name doesn't follow new pattern
    const response = await fetch("/api/liquidity-stats");

    if (response.ok) {
      const stats = await response.json();
      setLiquidityStats(stats);
    }
  } catch (error) {
    console.error("❌ Failed to load liquidity stats:", error);
  }
};
```

### After
```javascript
const loadLiquidityStats = async () => {
  try {
    // ✅ New route follows naming pattern
    const response = await fetch("/api/liquidity/stats");

    if (!response.ok) {
      throw new Error(`Failed to load stats: ${response.status}`);
    }

    const { success, data } = await response.json();
    if (success) {
      setLiquidityStats(data);
    }
  } catch (error) {
    console.error("❌ Failed to load liquidity stats:", error);
  }
};
```

---

## ✅ Updated Endpoints Reference

| Old | New | Status |
|-----|-----|--------|
| `/api/liquidity-pools/all` | `/api/liquidity/pools/all` | ✅ Available |
| `/api/liquidity-stats` | `/api/liquidity/stats` | ✅ Available |
| N/A | `/api/liquidity/pools/tier/:tier` | ✅ New feature |
| N/A | `/api/liquidity/pool/:poolId` | ✅ New feature |
| N/A | `/api/cache/invalidate` | ✅ New feature |

---

## General Migration Pattern

For ANY component that needs to update:

```typescript
// Step 1: Import types
import { LiquidityPool, LiquidityStats } from '@/types/api';

// Step 2: Use proper fetch with response unpacking
const response = await fetch('/api/liquidity/pools/all');

if (!response.ok) {
  const error = await response.json();
  console.error(`API Error [${error.code}]: ${error.error}`);
  return;
}

// Step 3: Destructure success response
const { success, data, timestamp } = await response.json();

if (!success) {
  console.error('API returned success: false');
  return;
}

// Step 4: Use the fully-typed data
const pools: LiquidityPool[] = data;  // TypeScript knows the type!
```

---

## 📋 Components Needing Updates

### Identified in PR
- [x] `EnhancedLiquidityPools.jsx` - Uses `/api/liquidity-pools/all` (now `/api/liquidity/pools/all`)
- [x] `EnhancedLiquidityPools.jsx` - Uses `/api/liquidity-stats` (now `/api/liquidity/stats`)

### Search for Others
```bash
# Find all components that might need updates
grep -r "fetch.*api" src/components/ src/hooks/

# Look for these patterns specifically:
grep -r "liquidity-" src/  # Old endpoint pattern
grep -r"/api/" src/ | grep -v "src/app/api/"  # All fetch calls
```

---

## 🧪 Testing Your Updates

After updating a component:

```bash
# Start dev server
npm run dev

# Test the endpoint in another terminal
curl http://localhost:3001/api/liquidity/pools/all | jq .

# Verify the component displays data correctly
# (Navigate to the component in browser)
```

---

## ✨ Type Hints from IDE

After importing types, your IDE will provide:

```typescript
import { LiquidityPool } from '@/types/api';

const pool: LiquidityPool = // ... fetch data ...

pool.poolId      // ✅ IDE knows this exists
pool.tvl         // ✅ IDE knows this is a number
pool.tier        // ✅ IDE knows this is 'TIER_1' | 'TIER_2' | 'TIER_3'
pool.unknown     // ❌ IDE warns: Property 'unknown' does not exist
```

---

## 📞 Need Help?

- **API Docs:** `GET /api/docs` or `API_ROUTES.md`
- **Quick Start:** `API_QUICK_START.md`  
- **Examples:** `PR_SUMMARY.md` - Usage Examples section
- **Types:** `src/types/api.ts` - All schema definitions

---

## ⏰ Migration Timeline

**Recommended:**
1. **Now:** Test new endpoints with curl/Postman
2. **This Sprint:** Update `EnhancedLiquidityPools.jsx`
3. **Next Sprint:** Search and update any other components
4. **Next Release:** Remove old endpoint references completely

**Note:** Old endpoints will continue working temporarily for backward compatibility. Plan migration at your own pace.

---

## 🎓 Key Differences

| Aspect | Old | New |
|--------|-----|-----|
| Endpoint Path | `/api/liquidity-pools/all` | `/api/liquidity/pools/all` |
| Response Format | Raw array or object | `{ success, data, timestamp }` |
| Error Format | Varies | Consistent `{ error, code, timestamp }` |
| Type Safety | Manual/none | 100% with Zod schemas |
| Documentation | In code comments | `/api/docs` + guides |

---

**Happy migrating!** 🚀
