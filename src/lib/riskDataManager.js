/**
 * Risk Data Manager - High-level utilities for managing risk data
 * Handles retrieval, caching, and migration from localStorage to IndexedDB
 */

import { 
  getRiskData, 
  saveRiskData, 
  deleteRiskData, 
  migrateFromLocalStorage, 
  checkMigrationNeeded,
  exportRiskData,
  importRiskData,
  testIndexedDB
} from './storage/db.js';

// Cache for recently accessed risk data to improve performance
const riskDataCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Get risk data for a user address with automatic migration and caching
 */
export const getUserRiskData = async (address) => {
  if (!address) {
    throw new Error('Address is required');
  }

  try {
    // Check cache first
    const cacheKey = `risk_data_${address}`;
    const cached = riskDataCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return cached.data;
    }

    // Migration from localStorage to IndexedDB is handled during app initialization.

    // Get data from IndexedDB
    let riskData = await getRiskData(address);

    // If not found in IndexedDB, try localStorage as fallback
    if (!riskData) {
      const localStorageKey = `risk_score_${address}`;
      const localData = localStorage.getItem(localStorageKey);
      
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          
          // Convert localStorage format to IndexedDB format
          riskData = {
            address: parsedData.address || address,
            score: parsedData.score || 0,
            tier: parsedData.tier || 'TIER_1',
            timestamp: parsedData.timestamp || Date.now(),
            chosenTier: parsedData.chosenTier || parsedData.tier || 'TIER_1'
          };

          // Save to IndexedDB and remove from localStorage
          await saveRiskData(riskData);
          localStorage.removeItem(localStorageKey);
          
          console.log(`✅ Migrated individual record for ${address}`);
        } catch (parseError) {
          console.error('Failed to parse localStorage data:', parseError);
        }
      }
    }

    // Update cache
    if (riskData) {
      riskDataCache.set(cacheKey, {
        data: riskData,
        timestamp: Date.now()
      });
    }

    return riskData;
    
  } catch (error) {
    console.error('Failed to get user risk data:', error);
    
    // Fallback to localStorage if IndexedDB fails completely
    try {
      const localData = localStorage.getItem(`risk_score_${address}`);
      if (localData) {
        const parsedData = JSON.parse(localData);
        return {
          address: parsedData.address || address,
          score: parsedData.score || 0,
          tier: parsedData.tier || 'TIER_1',
          timestamp: parsedData.timestamp || Date.now(),
          chosenTier: parsedData.chosenTier || parsedData.tier || 'TIER_1'
        };
      }
    } catch (fallbackError) {
      console.error('Fallback to localStorage also failed:', fallbackError);
    }

    return null;
  }
};

/**
 * Update user's chosen tier
 */
export const updateUserChosenTier = async (address, chosenTier) => {
  if (!address || !chosenTier) {
    throw new Error('Address and chosen tier are required');
  }

  try {
    // Get existing data
    const existingData = await getUserRiskData(address);
    
    if (!existingData) {
      throw new Error('No risk data found for this address');
    }

    // Update chosen tier
    const updatedData = {
      ...existingData,
      chosenTier,
      // Preserve original risk calculation timestamp; track preference change separately
      lastModified: Date.now()
    };

    // Save updated data
    await saveRiskData(updatedData);

    // Update cache
    const cacheKey = `risk_data_${address}`;
    riskDataCache.set(cacheKey, {
      data: updatedData,
      timestamp: Date.now()
    });

    console.log(`✅ Updated chosen tier for ${address} to ${chosenTier}`);
    return updatedData;
    
  } catch (error) {
    console.error('Failed to update chosen tier:', error);
    throw error;
  }
};

/**
 * Save new risk data (used by the risk calculation system)
 */
export const saveUserRiskData = async (riskData) => {
  try {
    await saveRiskData(riskData);

    // Update cache
    const cacheKey = `risk_data_${riskData.address}`;
    riskDataCache.set(cacheKey, {
      data: riskData,
      timestamp: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Failed to save risk data:', error);
    throw error;
  }
};

/**
 * Delete user risk data
 */
export const deleteUserRiskData = async (address) => {
  try {
    await deleteRiskData(address);

    // Remove from cache
    const cacheKey = `risk_data_${address}`;
    riskDataCache.delete(cacheKey);

    // Also remove from localStorage as cleanup
    try {
      localStorage.removeItem(`risk_score_${address}`);
    } catch (localError) {
      // Ignore localStorage errors
    }

    return true;
  } catch (error) {
    console.error('Failed to delete risk data:', error);
    throw error;
  }
};

/**
 * Clear all cached data (useful for testing or memory management)
 */
export const clearRiskDataCache = () => {
  riskDataCache.clear();
};

/**
 * Get cache size (for debugging)
 */
export const getCacheSize = () => {
  return riskDataCache.size;
};

/**
 * Initialize the risk data system (call this early in app lifecycle)
 */
export const initializeRiskDataSystem = async () => {
  try {
    console.log('🚀 Initializing Risk Data System...');
    
    // Test IndexedDB functionality
    const testResult = await testIndexedDB();
    if (!testResult.success) {
      console.error('⚠️ IndexedDB test failed:', testResult.message);
      return { success: false, message: testResult.message };
    }

    // Check for migration
    if (checkMigrationNeeded()) {
      console.log('📦 Found localStorage data, performing migration...');
      const migrationResult = await migrateFromLocalStorage();
      console.log(`✅ Migration completed: ${migrationResult.migrated} records migrated, ${migrationResult.errors} errors`);
      
      if (migrationResult.errors > 0) {
        console.warn(`⚠️ ${migrationResult.errors} records failed to migrate, please check console for details`);
      }
    }

    console.log('✅ Risk Data System initialized successfully');
    return { success: true, message: 'Risk Data System initialized successfully' };
    
  } catch (error) {
    console.error('❌ Failed to initialize Risk Data System:', error);
    return { success: false, message: `Initialization failed: ${error.message}` };
  }
};

// Export the main functions from db.ts for direct access if needed
export {
  exportRiskData,
  importRiskData,
  testIndexedDB,
  checkMigrationNeeded,
  migrateFromLocalStorage
};

// Utility function to format risk data for display
export const formatRiskDataForDisplay = (riskData) => {
  if (!riskData) return null;

  return {
    address: riskData.address,
    score: riskData.score,
    tier: riskData.tier,
    chosenTier: riskData.chosenTier,
    createdAt: new Date(riskData.timestamp).toLocaleString(),
    daysAgo: Math.floor((Date.now() - riskData.timestamp) / (1000 * 60 * 60 * 24))
  };
};

export default {
  getUserRiskData,
  updateUserChosenTier,
  saveUserRiskData,
  deleteUserRiskData,
  clearRiskDataCache,
  getCacheSize,
  initializeRiskDataSystem,
  formatRiskDataForDisplay,
  exportRiskData,
  importRiskData
};