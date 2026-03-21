# Riskon API Route Layer

## Overview

This document describes the complete API route layer for Riskon, providing type-safe, validated endpoints for liquidity pool data, statistics, and cache management.

**Status:** ✅ Production-Ready  
**API Version:** 1.0.0  
**Base URL:** `https://riskon.vercel.app/api`

---

## Table of Contents

1. [Architecture](#architecture)
2. [API Endpoints](#api-endpoints)
3. [Request/Response Schemas](#requestresponse-schemas)
4. [Error Handling](#error-handling)
5. [Usage Examples](#usage-examples)
6. [Authentication & Security](#authentication--security)
7. [Caching Strategy](#caching-strategy)
8. [Deployment Checklist](#deployment-checklist)

---

## Architecture

### Design Philosophy

The API layer follows Next.js App Router best practices:

- **Type-Safe Contracts:** All endpoints validate requests and responses with Zod schemas
- **Error Consistency:** Standardized error responses with machine-readable codes
- **Frontend Integration:** Bridges the gap between frontend components and backend services
- **Production-Ready:** Comprehensive validation, error handling, and logging

### File Structure

```
src/
├── app/api/
│   ├── health/
│   │   └── route.ts              # Health check endpoint
│   ├── docs/
│   │   └── route.ts              # API documentation endpoint
│   ├── liquidity/
│   │   ├── pools/
│   │   │   ├── all/
│   │   │   │   └── route.ts      # GET all pools (with sorting/filtering)
│   │   │   └── tier/
│   │   │       └── [tier]/
│   │   │           └── route.ts  # GET pools by risk tier
│   │   ├── pool/
│   │   │   └── [poolId]/
│   │   │       └── route.ts      # GET individual pool details
│   │   └── stats/
│   │       └── route.ts          # GET aggregated statistics
│   └── cache/
│       └── invalidate/
│           └── route.ts          # POST cache invalidation trigger
└── types/
    └── api.ts                     # Zod schemas and TypeScript types
```

---

## API Endpoints

### 1. **GET** `/api/health`

**Purpose:** Monitor API availability and uptime  
**Authentication:** None  
**Rate Limit:** None

#### Request

```bash
curl -X GET https://riskon.vercel.app/api/health
```

#### Response (200 OK)

```json
{
  "status": "healthy",
  "service": "Riskon API Layer",
  "uptime_seconds": 12345,
  "endpoints": {
    "liquidity": {
      "all_pools": "GET /api/liquidity/pools/all",
      "pools_by_tier": "GET /api/liquidity/pools/tier/:tier",
      "pool_details": "GET /api/liquidity/pool/:poolId",
      "statistics": "GET /api/liquidity/stats"
    },
    "cache": {
      "invalidate": "POST /api/cache/invalidate"
    }
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

### 2. **GET** `/api/liquidity/pools/all`

**Purpose:** Fetch all liquidity pools with tier classification and TVL data  
**Authentication:** None  
**Rate Limit:** Recommended 60 requests/min per IP

#### Request

```bash
curl -X GET "https://riskon.vercel.app/api/liquidity/pools/all?sort=tvl&order=desc&limit=50"
```

#### Query Parameters

| Name    | Type   | Default | Required | Description                                    |
| ------- | ------ | ------- | -------- | ---------------------------------------------- |
| `sort`  | enum   | `tvl`   | No       | Sort by: `tvl`, `accounts`, or `newest`       |
| `order` | enum   | `desc`  | No       | Order: `asc` or `desc`                        |
| `limit` | number | `100`   | No       | Result limit (1-200)                          |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "poolId": "pool-xlm-usdc",
      "tvl": 2500000,
      "tier": "TIER_1",
      "reserves": [
        { "asset": "native", "amount": "5000000" },
        { "asset": "USDC", "amount": "2500000" }
      ],
      "totalAccounts": 1250,
      "totalShares": "5623.4521890",
      "lastModified": "2026-03-22T10:25:00Z",
      "timestamp": "2026-03-22T10:30:00Z"
    }
  ],
  "timestamp": "2026-03-22T10:30:00Z"
}
```

#### Error Responses

- **400 Bad Request:** Invalid query parameters (e.g., invalid sort/order)
- **500 Internal Server Error:** Backend service unavailable

---

### 3. **GET** `/api/liquidity/pools/tier/:tier`

**Purpose:** Fetch liquidity pools filtered by risk tier  
**Authentication:** None  
**Rate Limit:** Recommended 60 requests/min per IP

#### Request

```bash
curl -X GET https://riskon.vercel.app/api/liquidity/pools/tier/TIER_1
```

#### Path Parameters

| Name   | Type | Required | Description                                                 |
| ------ | ---- | -------- | ----------------------------------------------------------- |
| `tier` | enum | Yes      | Risk tier: `TIER_1`, `TIER_2`, or `TIER_3`                |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "poolId": "pool-xlm-usdc",
      "tvl": 2500000,
      "tier": "TIER_1",
      "reserves": [...],
      "totalAccounts": 1250,
      "totalShares": "5623.4521890",
      "lastModified": "2026-03-22T10:25:00Z",
      "timestamp": "2026-03-22T10:30:00Z"
    }
  ],
  "meta": {
    "tier": "TIER_1",
    "count": 1
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

#### Error Responses

- **400 Bad Request:** Invalid tier (not TIER_1/2/3)

```json
{
  "error": "Invalid tier. Must be one of: TIER_1, TIER_2, TIER_3",
  "code": "INVALID_INPUT",
  "details": { "received": "TIER_4" },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

### 4. **GET** `/api/liquidity/pool/:poolId`

**Purpose:** Fetch detailed information for a specific pool  
**Authentication:** None  
**Rate Limit:** Recommended 120 requests/min per IP

#### Request

```bash
curl -X GET https://riskon.vercel.app/api/liquidity/pool/pool-xlm-usdc
```

#### Path Parameters

| Name     | Type   | Required | Description           |
| -------- | ------ | -------- | --------------------- |
| `poolId` | string | Yes      | Unique pool identifier |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "poolId": "pool-xlm-usdc",
    "tvl": 2500000,
    "tier": "TIER_1",
    "reserves": [
      { "asset": "native", "amount": "5000000" },
      { "asset": "USDC", "amount": "2500000" }
    ],
    "totalAccounts": 1250,
    "totalShares": "5623.4521890",
    "lastModified": "2026-03-22T10:25:00Z",
    "timestamp": "2026-03-22T10:30:00Z"
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

#### Error Responses

- **404 Not Found:** Pool not found

```json
{
  "error": "Pool with ID \"pool-unknown\" not found",
  "code": "NOT_FOUND",
  "details": {
    "poolId": "pool-unknown",
    "available_pools": ["pool-xlm-usdc", "pool-usdc-eurc"]
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

### 5. **GET** `/api/liquidity/stats`

**Purpose:** Fetch aggregated liquidity statistics (pool counts, TVL breakdown)  
**Authentication:** None  
**Rate Limit:** Recommended 60 requests/min per IP

#### Request

```bash
curl -X GET https://riskon.vercel.app/api/liquidity/stats
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "TIER_1": 1,
    "TIER_2": 2,
    "TIER_3": 1,
    "total": 4,
    "lastUpdate": "2026-03-22T10:30:00Z",
    "tvl_breakdown": {
      "TIER_1": { "count": 1, "totalTvl": 2500000 },
      "TIER_2": { "count": 2, "totalTvl": 1250000 },
      "TIER_3": { "count": 1, "totalTvl": 50000 },
      "grand_total": 3800000
    },
    "average_pool_size": 950000
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

### 6. **POST** `/api/cache/invalidate`

**Purpose:** Trigger cache invalidation for liquidity data  
**Authentication:** None (should require authorization in production)  
**Rate Limit:** Recommended 10 requests/min

#### Request

```bash
curl -X POST https://riskon.vercel.app/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{
    "all": true,
    "reason": "scheduled refresh"
  }'
```

#### Request Body Schema

```json
{
  "paths": ["liquidity-pools-all", "liquidity-stats"],
  "all": false,
  "reason": "scheduled refresh"
}
```

| Field    | Type     | Required | Description                           |
| -------- | -------- | -------- | ------------------------------------- |
| `paths`  | string[] | No       | Specific cache paths to invalidate    |
| `all`    | boolean  | No       | Invalidate all caches (default: false) |
| `reason` | string   | No       | Reason for invalidation (for logging)  |

#### Response (200 OK)

```json
{
  "success": true,
  "invalidated": ["liquidity-pools-all", "liquidity-stats"],
  "meta": {
    "reason": "scheduled refresh",
    "timestamp": "2026-03-22T10:30:00Z",
    "note": "Clients should be notified via WebSocket to refresh their caches"
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

#### Error Responses

- **400 Bad Request:** Invalid request body or cache paths

```json
{
  "error": "No valid cache paths provided. Valid paths: liquidity-pools-all, ...",
  "code": "INVALID_INPUT",
  "details": { "received_paths": ["invalid-path"] },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

## Request/Response Schemas

### TypeScript Types

All types are defined in [`src/types/api.ts`](#) for full type safety:

```typescript
import {
  LiquidityPool,
  LiquidityStats,
  TvlBreakdown,
  Tier,
  ApiError,
} from '@/types/api';
```

### Tier Classification

```typescript
type Tier = 'TIER_1' | 'TIER_2' | 'TIER_3';

// TVL Thresholds (USD)
TIER_1: >= $1,000,000
TIER_2: $250,000 - $999,999
TIER_3: < $250,000
```

### LiquidityPool

```typescript
interface LiquidityPool {
  poolId: string;              // Unique identifier
  tvl: number;                 // Total Value Locked (USD)
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  reserves: {
    asset: string;             // Asset code or "native"
    amount: string;             // Precise decimal amount
  }[];
  totalAccounts: number;       // Participant count
  totalShares: string;         // Issued shares (precise)
  lastModified?: string;       // ISO-8601 timestamp
  timestamp: string;           // Cache timestamp (ISO-8601)
}
```

### LiquidityStats

```typescript
interface LiquidityStats {
  TIER_1: number;             // Pool count
  TIER_2: number;             // Pool count
  TIER_3: number;             // Pool count
  total: number;              // Total pool count
  lastUpdate: string;         // ISO-8601 timestamp
}

interface ExtendedLiquidityStats extends LiquidityStats {
  tvl_breakdown: {
    TIER_1: { count: number; totalTvl: number };
    TIER_2: { count: number; totalTvl: number };
    TIER_3: { count: number; totalTvl: number };
    grand_total: number;
  };
  average_pool_size: number;
}
```

### ApiError

```typescript
interface ApiError {
  error: string;
  code: 'INVALID_INPUT' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE';
  details?: Record<string, any>;
  timestamp: string;           // ISO-8601 timestamp
}
```

---

## Error Handling

### Error Codes

| Code                 | HTTP Status | Description                      |
| -------------------- | ----------- | -------------------------------- |
| `INVALID_INPUT`      | 400         | Malformed request                |
| `NOT_FOUND`          | 404         | Resource not found               |
| `INTERNAL_ERROR`     | 500         | Server error                     |
| `SERVICE_UNAVAILABLE` | 503         | Backend service unreachable      |

### Example Error Response

```json
{
  "error": "Invalid tier. Must be one of: TIER_1, TIER_2, TIER_3",
  "code": "INVALID_INPUT",
  "details": {
    "received": "TIER_4",
    "validation_constraint": "tier must match pattern"
  },
  "timestamp": "2026-03-22T10:30:00Z"
}
```

---

## Usage Examples

### JavaScript/TypeScript (Frontend)

#### Fetch All Pools

```typescript
import { LiquidityPool } from '@/types/api';

async function getAllPools() {
  try {
    const response = await fetch(
      '/api/liquidity/pools/all?sort=tvl&order=desc&limit=50'
    );
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const { success, data } = await response.json();
    return success ? data as LiquidityPool[] : null;
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    return null;
  }
}
```

#### Fetch Pools by Tier

```typescript
async function getPoolsByTier(tier: 'TIER_1' | 'TIER_2' | 'TIER_3') {
  const response = await fetch(`/api/liquidity/pools/tier/${tier}`);
  const { data } = await response.json();
  return data as LiquidityPool[];
}
```

#### Invalidate Cache

```typescript
async function refreshLiquidityData() {
  await fetch('/api/cache/invalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true, reason: 'manual refresh' }),
  });
  
  // Refetch pools
  return await getAllPools();
}
```

### React Hook Integration

```typescript
function useLiquidityPools() {
  const [pools, setPools] = React.useState<LiquidityPool[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/liquidity/pools/all')
      .then(r => r.json())
      .then(({ data }) => setPools(data))
      .finally(() => setLoading(false));
  }, []);

  return { pools, loading };
}
```

---

## Authentication & Security

### Current Implementation

- **No Authentication:** Endpoints are public (suitable for frontend)
- **CORS:** Enabled for same-origin requests
- **Input Validation:** Zod schemas validate all requests
- **Rate Limiting:** Recommended to enforce on reverse proxy/CDN

### Production Recommendations

1. **API Key Authentication:** Add for admin endpoints (`/cache/invalidate`)
2. **CORS:** Restrict to trusted origins
3. **Rate Limiting:** Implement per-IP limits
4. **HTTPS Only:** Enforce TLS 1.2+
5. **Request Logging:** Log all requests for audit trail
6. **Circuit Breaker:** Handle backend service unavailability gracefully

---

## Caching Strategy

### Cache Paths (Valid for `/cache/invalidate`)

- `liquidity-pools-all` - All pools endpoint
- `liquidity-pools-tier-1` - TIER_1 pools
- `liquidity-pools-tier-2` - TIER_2 pools
- `liquidity-pools-tier-3` - TIER_3 pools
- `liquidity-stats` - Statistics endpoint
- `risk-tier-data` - User risk scores
- `user-profile` - User data

### Recommended TTL Values

| Cache Path            | TTL    | Reason                               |
| --------------------- | ------ | ------------------------------------ |
| liquidity-pools-*     | 5 min  | Pool data changes rarely             |
| liquidity-stats       | 5 min  | Computed from pool data              |
| risk-tier-data        | 1 hour | User risk scores update infrequently |
| user-profile          | 30 min | User settings                        |

---

## Deployment Checklist

- [ ] API routes tested locally with `npm run dev`
- [ ] TypeScript types compile without errors (`npm run build`)
- [ ] All edge cases handled in error responses
- [ ] Documentation (`/api/docs`) endpoint verified
- [ ] Health check (`/api/health`) returns correct uptime
- [ ] Rate limiting configured on CDN/reverse proxy
- [ ] CORS headers set appropriately
- [ ] Environment variables validated on startup
- [ ] Monitoring/logging configured for failed requests
- [ ] Staging deployment tested end-to-end
- [ ] PR reviewed by maintainers
- [ ] Production deployment executed

---

## Migration Guide

### For Component Authors

**Old pattern (direct service calls):**

```javascript
// ❌ Before
const response = await fetch('http://localhost:3002/api/liquidity-stats');
```

**New pattern (API route layer):**

```typescript
// ✅ After
const response = await fetch('/api/liquidity/stats');
const { success, data } = await response.json();
```

### Benefits

- ✅ Type-safe requests/responses
- ✅ Centralized validation
- ✅ Better error handling
- ✅ Easier to test
- ✅ Production-ready logging
- ✅ Standardized endpoints

---

## Contributing

To add new endpoints:

1. Define Zod schemas in `src/types/api.ts`
2. Create route handler in `src/app/api/<path>/route.ts`
3. Import types from `src/types/ api.ts`
4. Add documentation to this file
5. Test with `curl` or Postman
6. Update `/api/docs` endpoint

---

**Last Updated:** March 22, 2026  
**Maintained By:** Riskon Contributors
