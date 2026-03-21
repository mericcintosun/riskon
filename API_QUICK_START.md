# Quick Start Guide: Using the Riskon API Routes

## 🚀 For Frontend Developers

### Fetching Liquidity Pools

```typescript
// src/hooks/useLiquidityPools.ts
import { LiquidityPool } from '@/types/api';

export function useLiquidityPools() {
  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/liquidity/pools/all?sort=tvl&limit=50')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ success, data }) => {
        if (success) setPools(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { pools, loading, error };
}
```

### Getting Tier-Specific Pools

```typescript
async function getTierPools(tier: 'TIER_1' | 'TIER_2' | 'TIER_3') {
  const response = await fetch(`/api/liquidity/pools/tier/${tier}`);
  const { data, meta } = await response.json();
  
  console.log(`Found ${meta.count} ${tier} pools`);
  return data;
}
```

### Getting Pool Statistics

```typescript
import { ExtendedLiquidityStats } from '@/types/api';

async function getStats() {
  const response = await fetch('/api/liquidity/stats');
  const { data } = await response.json();
  
  const stats: ExtendedLiquidityStats = data;
  console.log(`Total TVL: $${stats.tvl_breakdown.grand_total}`);
  return stats;
}
```

### Handling Errors

```typescript
async function safeFetch<T>(path: string) {
  try {
    const response = await fetch(path);
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`API Error [${error.code}]:`, error.error);
      return null;
    }
    
    const { data } = await response.json();
    return data as T;
  } catch (err) {
    console.error('Network error:', err);
    return null;
  }
}

// Usage
const pools = await safeFetch<LiquidityPool[]>('/api/liquidity/pools/all');
```

---

## 🔧 For Backend Developers

### Replacing Mock Data with Real Backend

Current implementation uses mock data. To connect to real backend:

**File:** `src/app/api/liquidity/pools/all/route.ts`

```typescript
// Replace generateMockPools() with:
async function getLiquidityPools() {
  try {
    const backendUrl = process.env.BACKEND_LIQUIDITY_SERVICE_URL;
    if (!backendUrl) throw new Error('Backend URL not configured');
    
    const response = await fetch(`${backendUrl}/liquidity-pools`, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    throw new Error('Failed to retrieve liquidity pools');
  }
}
```

### Configuring Environment Variables

**.env.local**
```bash
# Backend Service Configuration
BACKEND_LIQUIDITY_SERVICE_URL=http://localhost:3002
BACKEND_API_KEY=your-api-key-here
BACKEND_TIMEOUT=5000
```

### Adding New Endpoints

**Step 1: Define types in `src/types/api.ts`**

```typescript
export const MyResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type MyResource = z.infer<typeof MyResourceSchema>;
```

**Step 2: Create route handler**

```typescript
// src/app/api/my-resource/route.ts
import { MyResourceSchema, MyResource } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchMyResourceData();
    const validated = z.array(MyResourceSchema).parse(data);
    
    return NextResponse.json({
      success: true,
      data: validated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // ... error handling
  }
}
```

**Step 3: Update `/api/docs`**

Add endpoint documentation to `src/app/api/docs/route.ts`

---

## 📡 API Response Types

### Success Response

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;  // ISO-8601
}
```

### Error Response

```typescript
interface ApiError {
  error: string;
  code: 'INVALID_INPUT' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE';
  details?: Record<string, any>;
  timestamp: string;  // ISO-8601
}
```

---

## 🧪 Testing API Endpoints

### Using curl

```bash
# Health check
curl http://localhost:3001/api/health

# Get all pools (with sorting)
curl "http://localhost:3001/api/liquidity/pools/all?sort=tvl&order=desc"

# Get specific tier
curl http://localhost:3001/api/liquidity/pools/tier/TIER_1

# Get pool details
curl http://localhost:3001/api/liquidity/pool/pool-xlm-usdc

# Get statistics
curl http://localhost:3001/api/liquidity/stats

# Invalidate cache (POST)
curl -X POST http://localhost:3001/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
```

### Using JavaScript/Fetch

```typescript
const response = await fetch('/api/liquidity/pools/all');
const { success, data, timestamp } = await response.json();

console.log(`Fetched ${data.length} pools at ${timestamp}`);
```

### Using TypeScript with Type Safety

```typescript
import { LiquidityStats } from '@/types/api';

async function getStats(): Promise<LiquidityStats | null> {
  try {
    const response = await fetch('/api/liquidity/stats');
    const { success, data } = await response.json();
    return success ? data : null;
  } catch (error) {
    console.error('Failed to get stats:', error);
    return null;
  }
}
```

---

## 📊 Monitoring & Debugging

### Health Check

```bash
curl http://localhost:3001/api/health | jq '.uptime_seconds'
```

### API Documentation

```bash
curl http://localhost:3001/api/docs | jq '.endpoints | length'
```

### Check If Pool Exists

```bash
curl http://localhost:3001/api/liquidity/pool/pool-xlm-usdc | jq '.data.tvl'
```

### View All Available Pools

```bash
curl http://localhost:3001/api/liquidity/pools/all | jq '.data[].poolId'
```

---

## 🚨 Common Issues

### "Cannot find module '@/types/api'"

**Solution:** Ensure `tsconfig.json` has proper path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

### API Returns "Pool not found"

**Check:** The pool ID might have different casing. IDs are case-sensitive:

```bash
# This works (correct case)
curl http://localhost:3001/api/liquidity/pool/pool-xlm-usdc

# This fails
curl http://localhost:3001/api/liquidity/pool/Pool-XLM-USDC
```

### Type errors in components

**Ensure:** You're importing types from the correct location:

```typescript
// ✅ Correct
import { LiquidityPool } from '@/types/api';

// ❌ Wrong - types not exported from this location
import { LiquidityPool } from '@/lib/types';
```

---

## 🔐 Security Reminders

- ✅ All endpoints validate input with Zod
- ✅ Error messages don't leak sensitive data
- ✅ Type system prevents injection attacks
- ⚠️ Consider adding authentication for write operations
- ⚠️ Implement rate limiting in production

---

## 📚 Additional Resources

- **Full API Documentation:** [API_ROUTES.md](./API_ROUTES.md)
- **PR Summary:** [PR_SUMMARY.md](./PR_SUMMARY.md)
- **Type Definitions:** [src/types/api.ts](./src/types/api.ts)
- **Route Handlers:** `src/app/api/`

---

## 💡 Pro Tips

1. **Always await/handle promises** in your fetch calls
2. **Check response.ok** before parsing JSON
3. **Use the types** from `@/types/api` for autocomplete
4. **Use `/api/docs`** when you forget endpoint paths
5. **Cache responses** in localStorage to prevent redundant calls
6. **Use `/cache/invalidate`** to refresh data without reloading

---

**Last Updated:** March 21, 2026  
**Current API Version:** 1.0.0
