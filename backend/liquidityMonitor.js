const redis = require("redis");
const fetch = require("node-fetch");

// Redis client setup
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// Horizon API configuration
const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const MONITORING_INTERVAL = process.env.MONITORING_INTERVAL || 300000; // 5 minutes

// TVL Tier thresholds (in USD)
const TIER_THRESHOLDS = {
  TIER_1: 1000000, // ≥1M USD
  TIER_2: 250000, // 250k-1M USD
  TIER_3: 0, // <250k USD
};

/**
 * Fetch liquidity pools from Horizon API
 */
async function fetchLiquidityPools() {
  try {

    const response = await fetch(
      `${HORIZON_URL}/liquidity_pools?limit=200&order=desc`
    );

    if (!response.ok) {
      throw new Error(`Horizon API error: ${response.status}`);
    }

    const data = await response.json();


    return data._embedded.records;
  } catch (error) {
    console.error("❌ Error fetching liquidity pools:", error);
    throw error;
  }
}

/**
 * Calculate TVL and assign tier based on USD value
 */
function calculatePoolTier(pool) {
  try {
    // Extract TVL from pool reserves
    const reserves = pool.reserves || [];
    let totalTVL = 0;

    // Calculate approximate USD TVL
    // Note: In production, you'd need price feeds for accurate USD conversion
    reserves.forEach((reserve) => {
      const amount = parseFloat(reserve.amount) || 0;

      // Simple USD approximation (in production, use real price feeds)
      if (reserve.asset === "native") {
        totalTVL += amount * 0.12; // Approximate XLM price
      } else if (reserve.asset.includes("USDC")) {
        totalTVL += amount; // USDC ≈ 1 USD
      } else {
        totalTVL += amount * 0.1; // Conservative estimate for other assets
      }
    });

    // Assign tier based on TVL
    let tier;
    if (totalTVL >= TIER_THRESHOLDS.TIER_1) {
      tier = "TIER_1";
    } else if (totalTVL >= TIER_THRESHOLDS.TIER_2) {
      tier = "TIER_2";
    } else {
      tier = "TIER_3";
    }

    return {
      poolId: pool.id,
      tvl: totalTVL,
      tier: tier,
      reserves: reserves,
      totalAccounts: pool.total_accounts || 0,
      totalShares: pool.total_shares || "0",
      lastModified: pool.last_modified_time,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error calculating tier for pool ${pool.id}:`, error);
    return {
      poolId: pool.id,
      tvl: 0,
      tier: "TIER_3",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Store pool tier data in Redis
 */
async function storePoolTierData(poolTierData) {
  try {
    const pipeline = redisClient.multi();

    poolTierData.forEach((pool) => {
      // Store individual pool data
      const poolKey = `liquidity_pool:${pool.poolId}`;
      pipeline.hSet(poolKey, {
        tier: pool.tier,
        tvl: pool.tvl.toString(),
        timestamp: pool.timestamp,
        totalAccounts: pool.totalAccounts.toString(),
        totalShares: pool.totalShares,
        lastModified: pool.lastModified || "",
        reserves: JSON.stringify(pool.reserves || []),
      });

      // Set expiration (24 hours)
      pipeline.expire(poolKey, 86400);

      // Add to tier-based sets for quick filtering
      pipeline.sAdd(`tier:${pool.tier}:pools`, pool.poolId);
      pipeline.expire(`tier:${pool.tier}:pools`, 86400);
    });

    // Store global statistics
    const tierStats = {
      TIER_1: poolTierData.filter((p) => p.tier === "TIER_1").length,
      TIER_2: poolTierData.filter((p) => p.tier === "TIER_2").length,
      TIER_3: poolTierData.filter((p) => p.tier === "TIER_3").length,
      total: poolTierData.length,
      lastUpdate: new Date().toISOString(),
    };

    pipeline.hSet("liquidity_pool_stats", tierStats);
    pipeline.expire("liquidity_pool_stats", 86400);

    await pipeline.exec();



    return tierStats;
  } catch (error) {
    console.error("❌ Error storing pool tier data:", error);
    throw error;
  }
}

/**
 * Get pool tier information from Redis
 */
async function getPoolTier(poolId) {
  try {
    const poolData = await redisClient.hGetAll(`liquidity_pool:${poolId}`);

    if (!poolData || !Object.keys(poolData).length) {
      return null;
    }

    return {
      poolId: poolId,
      tier: poolData.tier,
      tvl: parseFloat(poolData.tvl) || 0,
      timestamp: poolData.timestamp,
      totalAccounts: parseInt(poolData.totalAccounts) || 0,
      totalShares: poolData.totalShares || "0",
      reserves: JSON.parse(poolData.reserves || "[]"),
    };
  } catch (error) {
    console.error(`❌ Error retrieving pool tier for ${poolId}:`, error);
    return null;
  }
}

/**
 * Get pools by tier
 */
async function getPoolsByTier(tier) {
  try {
    const poolIds = await redisClient.sMembers(`tier:${tier}:pools`);
    const pools = [];

    for (const poolId of poolIds) {
      const poolData = await getPoolTier(poolId);
      if (poolData) {
        pools.push(poolData);
      }
    }

    return pools.sort((a, b) => b.tvl - a.tvl); // Sort by TVL descending
  } catch (error) {
    console.error(`❌ Error retrieving pools for tier ${tier}:`, error);
    return [];
  }
}

/**
 * Main monitoring loop
 */
async function monitorLiquidityPools() {
  try {

    // Fetch pools from Horizon
    const pools = await fetchLiquidityPools();

    // Calculate tiers for all pools
    const poolTierData = pools.map(calculatePoolTier);

    // Store in Redis
    const stats = await storePoolTierData(poolTierData);

    return stats;
  } catch (error) {
    console.error("❌ Error in monitoring cycle:", error);
    throw error;
  }
}

/**
 * Start periodic monitoring
 */
async function startMonitoring() {
  try {
    await redisClient.connect();

    // Initial monitoring
    await monitorLiquidityPools();

    // Set up periodic monitoring
    setInterval(async () => {
      try {
        await monitorLiquidityPools();
      } catch (error) {
        console.error("❌ Monitoring cycle failed:", error);
      }
    }, MONITORING_INTERVAL);

   
  } catch (error) {
    console.error("❌ Failed to start monitoring:", error);
    process.exit(1);
  }
}

// API endpoints for frontend integration
const express = require("express");
const app = express();

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "✅ Enhanced Stellar Liquidity Monitor",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      stats: "/api/liquidity-stats",
      tierPools: "/api/pools/tier/:tier",
      poolTier: "/api/pool/:poolId/tier",
    },
  });
});

// Detailed health check
app.get("/health", async (req, res) => {
  try {
    const stats = await redisClient.hGetAll("liquidity_pool_stats");
    res.json({
      status: "healthy",
      redis: "connected",
      pools: stats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Get pool tier information
app.get("/api/pool/:poolId/tier", async (req, res) => {
  try {
    const { poolId } = req.params;
    const tierData = await getPoolTier(poolId);

    if (!tierData) {
      return res.status(404).json({ error: "Pool not found" });
    }

    res.json(tierData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pools by tier
app.get("/api/pools/tier/:tier", async (req, res) => {
  try {
    const { tier } = req.params;

    if (!["TIER_1", "TIER_2", "TIER_3"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }

    const pools = await getPoolsByTier(tier);
    res.json(pools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tier statistics
app.get("/api/liquidity-stats", async (req, res) => {
  try {
    const stats = await redisClient.hGetAll("liquidity_pool_stats");
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  startMonitoring,
  getPoolTier,
  getPoolsByTier,
  monitorLiquidityPools,
  app,
};

// Start monitoring if this file is run directly
if (require.main === module) {
  startMonitoring();

  const PORT = process.env.LIQUIDITY_API_PORT || 3002;
  app.listen(PORT, () => {
  });
}
