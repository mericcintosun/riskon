"use client";

/**
 * Rate Limiter for Risk Score Updates
 * Prevents spam by limiting one risk score update per wallet per 24 hours
 */

const RATE_LIMIT_HOURS = 24;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;

/**
 * Check if user can update their risk score
 * @param {string} walletAddress - User's Stellar address
 * @returns {Object} Rate limit status
 */
export function checkRateLimit(walletAddress) {
  try {
    const lastUpdateKey = `risk_score_last_update_${walletAddress}`;
    const lastUpdate = localStorage.getItem(lastUpdateKey);

    if (!lastUpdate) {
      return {
        canUpdate: true,
        remainingTime: 0,
        lastUpdate: null,
        nextUpdateTime: null,
      };
    }

    const lastUpdateTime = parseInt(lastUpdate);
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTime;

    if (timeSinceLastUpdate >= RATE_LIMIT_MS) {
      return {
        canUpdate: true,
        remainingTime: 0,
        lastUpdate: new Date(lastUpdateTime),
        nextUpdateTime: null,
      };
    }

    const remainingTime = RATE_LIMIT_MS - timeSinceLastUpdate;
    const nextUpdateTime = new Date(lastUpdateTime + RATE_LIMIT_MS);

    return {
      canUpdate: false,
      remainingTime,
      lastUpdate: new Date(lastUpdateTime),
      nextUpdateTime,
      remainingHours: Math.ceil(remainingTime / (60 * 60 * 1000)),
      remainingMinutes: Math.ceil(
        (remainingTime % (60 * 60 * 1000)) / (60 * 1000)
      ),
    };
  } catch (error) {
    console.warn("⚠️ Error checking rate limit:", error);
    // If there's an error, allow the update
    return {
      canUpdate: true,
      remainingTime: 0,
      error: error.message,
    };
  }
}

/**
 * Record a risk score update
 * @param {string} walletAddress - User's Stellar address
 */
export function recordUpdate(walletAddress) {
  try {
    const updateKey = `risk_score_last_update_${walletAddress}`;
    const currentTime = Date.now();

    localStorage.setItem(updateKey, currentTime.toString());


    return {
      success: true,
      timestamp: currentTime,
      nextUpdateTime: new Date(currentTime + RATE_LIMIT_MS),
    };
  } catch (error) {
    console.error("❌ Error recording update:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get formatted remaining time string
 * @param {number} remainingTime - Remaining time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatRemainingTime(remainingTime) {
  if (remainingTime <= 0) return "Update now";

  const hours = Math.floor(remainingTime / (60 * 60 * 1000));
  const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours} hours ${minutes} minutes`;
  } else {
    return `${minutes} minutes`;
  }
}

/**
 * Clear rate limit for a wallet (admin/debug function)
 * @param {string} walletAddress - User's Stellar address
 */
export function clearRateLimit(walletAddress) {
  try {
    const updateKey = `risk_score_last_update_${walletAddress}`;
    localStorage.removeItem(updateKey);

    return { success: true };
  } catch (error) {
    console.error("❌ Error clearing rate limit:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all rate limited wallets (for debugging)
 */
export function getAllRateLimits() {
  try {
    const rateLimits = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("risk_score_last_update_")) {
        const walletAddress = key.replace("risk_score_last_update_", "");
        const lastUpdate = parseInt(localStorage.getItem(key));
        const status = checkRateLimit(walletAddress);

        rateLimits.push({
          walletAddress,
          lastUpdate: new Date(lastUpdate),
          status,
        });
      }
    }

    return rateLimits;
  } catch (error) {
    console.error("❌ Error getting rate limits:", error);
    return [];
  }
}

/**
 * Check if user has made any risk score updates before
 * @param {string} walletAddress - User's Stellar address
 * @returns {boolean} Whether user has updated before
 */
export function hasUpdatedBefore(walletAddress) {
  try {
    const updateKey = `risk_score_last_update_${walletAddress}`;
    return localStorage.getItem(updateKey) !== null;
  } catch (error) {
    console.warn("⚠️ Error checking update history:", error);
    return false;
  }
}

/**
 * Get user's update history summary
 * @param {string} walletAddress - User's Stellar address
 * @returns {Object} Update history summary
 */
export function getUpdateHistory(walletAddress) {
  try {
    const updateKey = `risk_score_last_update_${walletAddress}`;
    const lastUpdate = localStorage.getItem(updateKey);

    if (!lastUpdate) {
      return {
        hasUpdated: false,
        totalUpdates: 0,
        lastUpdate: null,
        daysSinceLastUpdate: 0,
      };
    }

    const lastUpdateTime = parseInt(lastUpdate);
    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUpdateTime) / (24 * 60 * 60 * 1000)
    );

    return {
      hasUpdated: true,
      totalUpdates: 1, // For now, we only track the last update
      lastUpdate: new Date(lastUpdateTime),
      daysSinceLastUpdate,
      canUpdateAgain: daysSinceLastUpdate >= 1,
    };
  } catch (error) {
    console.error("❌ Error getting update history:", error);
    return {
      hasUpdated: false,
      error: error.message,
    };
  }
}
