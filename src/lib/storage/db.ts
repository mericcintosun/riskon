/**
 * IndexedDB wrapper utility for RiskOn application
 * Provides robust client-side persistence for user risk data
 */

// Type definitions
export interface RiskData {
  address: string;      // Primary key
  score: number;
  tier: string;
  timestamp: number;
  chosenTier: string;
}

export interface ExportData {
  version: string;
  exportDate: number;
  data: RiskData[];
}

// Database configuration
const DB_NAME = 'riskon-db';
const DB_VERSION = 1;
const STORE_NAME = 'userRiskData';

class RiskOnDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'address' 
          });
          
          // Create indices for better querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tier', 'tier', { unique: false });
          store.createIndex('chosenTier', 'chosenTier', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<void> {
    if (this.db) return;
    
    if (!this.initPromise) {
      this.initPromise = this.initDB();
    }
    
    await this.initPromise;
  }

  /**
   * Save risk data for a user
   */
  async saveRiskData(data: RiskData): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save data: ${request.error}`));
    });
  }

  /**
   * Get risk data for a specific address
   */
  async getRiskData(address: string): Promise<RiskData | null> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(address);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get data: ${request.error}`));
      };
    });
  }

  /**
   * Delete risk data for a specific address
   */
  async deleteRiskData(address: string): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(address);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data: ${request.error}`));
    });
  }

  /**
   * Get all risk data (for export functionality)
   */
  async getAllRiskData(): Promise<RiskData[]> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get all data: ${request.error}`));
      };
    });
  }

  /**
   * Clear all risk data
   */
  async clearAllData(): Promise<void> {
    await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear data: ${request.error}`));
    });
  }

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
const dbInstance = new RiskOnDB();

// Public API functions
export const saveRiskData = async (data: RiskData): Promise<void> => {
  return dbInstance.saveRiskData(data);
};

export const getRiskData = async (address: string): Promise<RiskData | null> => {
  return dbInstance.getRiskData(address);
};

export const deleteRiskData = async (address: string): Promise<void> => {
  return dbInstance.deleteRiskData(address);
};

/**
 * Migration functionality: Move localStorage data to IndexedDB
 */
export const migrateFromLocalStorage = async (): Promise<{ migrated: number; errors: number }> => {
  let migrated = 0;
  let errors = 0;

  try {
    // Scan localStorage for risk score data
    const keysToMigrate: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('risk_score_')) {
        keysToMigrate.push(key);
      }
    }

    // Migrate each key
    for (const key of keysToMigrate) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const riskData = JSON.parse(data);
          
          // Transform to new format if needed
          const migratedData: RiskData = {
            address: riskData.address || key.replace('risk_score_', ''),
            score: riskData.score || 0,
            tier: riskData.tier || 'TIER_1',
            timestamp: riskData.timestamp || Date.now(),
            chosenTier: riskData.chosenTier || riskData.tier || 'TIER_1'
          };

          // Save to IndexedDB
          await saveRiskData(migratedData);
          
          // Remove from localStorage after successful migration
          localStorage.removeItem(key);
          migrated++;
        }
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
        errors++;
      }
    }

    console.log(`Migration completed: ${migrated} records migrated, ${errors} errors`);
    return { migrated, errors };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { migrated, errors: errors + 1 };
  }
};

/**
 * Export functionality: Download all risk data as JSON
 */
export const exportRiskData = async (): Promise<void> => {
  try {
    const allData = await dbInstance.getAllRiskData();
    
    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: Date.now(),
      data: allData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riskon-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export risk data');
  }
};

/**
 * Import functionality: Import risk data from JSON file
 */
export const importRiskData = async (file: File): Promise<{ imported: number; errors: number; skipped: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const importData: ExportData = JSON.parse(content);
        
        let imported = 0;
        let errors = 0;
        let skipped = 0;

        // Validate import data structure
        if (!importData.data || !Array.isArray(importData.data)) {
          throw new Error('Invalid import file format');
        }

        // Import each record
        for (const record of importData.data) {
          try {
            // Check if record already exists
            const existing = await getRiskData(record.address);
            
            if (existing) {
              // Skip if existing data is newer
              if (existing.timestamp >= record.timestamp) {
                skipped++;
                continue;
              }
            }

            // Validate record structure
            if (!record.address || typeof record.score !== 'number') {
              errors++;
              continue;
            }

            // Ensure all required fields
            const riskData: RiskData = {
              address: record.address,
              score: record.score,
              tier: record.tier || 'TIER_1',
              timestamp: record.timestamp || Date.now(),
              chosenTier: record.chosenTier || record.tier || 'TIER_1'
            };

            await saveRiskData(riskData);
            imported++;
            
          } catch (error) {
            console.error(`Failed to import record for ${record.address}:`, error);
            errors++;
          }
        }

        resolve({ imported, errors, skipped });
        
      } catch (error) {
        console.error('Import failed:', error);
        reject(new Error('Failed to import risk data'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Utility function to check if migration is needed
 */
export const checkMigrationNeeded = (): boolean => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('risk_score_')) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
};

/**
 * Test function to verify IndexedDB functionality
 */
export const testIndexedDB = async (): Promise<{ success: boolean; message: string }> => {
  try {
    if (!RiskOnDB.isSupported()) {
      return { success: false, message: 'IndexedDB is not supported in this browser' };
    }

    const testData: RiskData = {
      address: 'test_address_' + Date.now(),
      score: 42,
      tier: 'TIER_2',
      timestamp: Date.now(),
      chosenTier: 'TIER_1'
    };

    // Test save
    await saveRiskData(testData);

    // Test retrieve
    const retrieved = await getRiskData(testData.address);
    if (!retrieved || retrieved.score !== testData.score) {
      throw new Error('Data retrieval test failed');
    }

    // Test delete
    await deleteRiskData(testData.address);

    // Verify deletion
    const deleted = await getRiskData(testData.address);
    if (deleted !== null) {
      throw new Error('Data deletion test failed');
    }

    return { success: true, message: 'IndexedDB functionality verified successfully' };
    
  } catch (error) {
    return { success: false, message: `IndexedDB test failed: ${error}` };
  }
};

export default dbInstance;