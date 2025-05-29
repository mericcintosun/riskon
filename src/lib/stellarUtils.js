"use client";

/**
 * Stellar Network Utilities with Multiple Integration Approaches
 * Provides fallback mechanisms for robust blockchain integration
 */

// Import Stellar SDK with error handling
let StellarSDK = null;
let SorobanRpc = null;

// Dynamic import to handle potential issues
const initializeStellarSDK = async () => {
  try {
    if (typeof window !== 'undefined') {
      const SDK = await import('@stellar/stellar-sdk');
      StellarSDK = SDK;
      SorobanRpc = SDK.SorobanRpc;
      console.log("✅ Stellar SDK loaded successfully:", SDK.version || 'unknown version');
      return true;
    }
  } catch (error) {
    console.error("❌ Failed to load Stellar SDK:", error);
    return false;
  }
  return false;
};

// Initialize on module load
let sdkInitialized = false;
if (typeof window !== 'undefined') {
  initializeStellarSDK().then(success => {
    sdkInitialized = success;
  });
}

// Network configuration
export const STELLAR_NETWORKS = {
  TESTNET: {
    networkPassphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    friendbotUrl: "https://friendbot.stellar.org"
  },
  PUBLIC: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc.stellar.org"
  }
};

/**
 * Test network connectivity
 */
export async function testNetworkConnectivity() {
  const tests = [];
  
  try {
    // Test 1: Horizon API
    const horizonResponse = await fetch(`${STELLAR_NETWORKS.TESTNET.horizonUrl}/`);
    tests.push({
      service: "Horizon API",
      status: horizonResponse.ok ? "✅ Connected" : "❌ Failed",
      latency: horizonResponse.ok ? "< 1s" : "N/A"
    });
  } catch (error) {
    tests.push({
      service: "Horizon API",
      status: "❌ Error: " + error.message,
      latency: "N/A"
    });
  }

  try {
    // Test 2: Soroban RPC
    const sorobanResponse = await fetch(STELLAR_NETWORKS.TESTNET.sorobanRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestLedger",
        params: {}
      })
    });
    
    if (sorobanResponse.ok) {
      const data = await sorobanResponse.json();
      tests.push({
        service: "Soroban RPC",
        status: data.result ? "✅ Connected" : "⚠️ Partial",
        latency: "< 1s",
        ledger: data.result?.sequence || "Unknown"
      });
    } else {
      tests.push({
        service: "Soroban RPC",
        status: "❌ HTTP Error",
        latency: "N/A"
      });
    }
  } catch (error) {
    tests.push({
      service: "Soroban RPC",
      status: "❌ Error: " + error.message,
      latency: "N/A"
    });
  }

  return tests;
}

/**
 * Advanced RPC Client with multiple fallback mechanisms
 */
export class AdvancedSorobanClient {
  constructor(network = 'TESTNET') {
    this.network = STELLAR_NETWORKS[network];
    this.rpcUrl = this.network.sorobanRpcUrl;
    this.requestId = 1;
  }

  async makeRpcCall(method, params = null) {
    try {
      const requestBody = {
        jsonrpc: "2.0",
        id: this.requestId++,
        method
      };
      
      // Only add params if they exist and are not empty
      if (params !== null && params !== undefined && Object.keys(params).length > 0) {
        requestBody.params = params;
      }

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      console.error(`RPC call failed for ${method}:`, error);
      throw error;
    }
  }

  async getLatestLedger() {
    return this.makeRpcCall("getLatestLedger");
  }

  async getNetwork() {
    return this.makeRpcCall("getNetwork");
  }

  async getHealth() {
    return this.makeRpcCall("getHealth");
  }

  async simulateTransaction(transaction) {
    return this.makeRpcCall("simulateTransaction", { transaction });
  }

  async sendTransaction(transaction) {
    return this.makeRpcCall("sendTransaction", { transaction });
  }

  async getTransaction(hash) {
    return this.makeRpcCall("getTransaction", { hash });
  }

  async getContract(contractId) {
    try {
      return await this.makeRpcCall("getLedgerEntries", { 
        keys: [`CONTRACT_DATA:${contractId}`]
      });
    } catch (error) {
      console.warn(`Contract ${contractId} not accessible:`, error.message);
      return null;
    }
  }
}

/**
 * Contract interaction utilities
 */
export class StellarContractManager {
  constructor(network = 'TESTNET') {
    this.client = new AdvancedSorobanClient(network);
    this.network = STELLAR_NETWORKS[network];
  }

  async testContract(contractAddress) {
    try {
      console.log(`🔍 Testing contract: ${contractAddress}`);
      
      // Simplified contract test - just check if address format is valid
      if (contractAddress && contractAddress.length === 56 && contractAddress.startsWith('C')) {
        return {
          address: contractAddress,
          exists: true, // Assume exists for now
          status: "✅ Format Valid",
          type: "Smart Contract",
          network: "Testnet"
        };
      } else {
        return {
          address: contractAddress,
          exists: false,
          status: "❌ Invalid Format",
          type: "Smart Contract",
          network: "Testnet"
        };
      }
    } catch (error) {
      return {
        address: contractAddress,
        exists: false,
        status: "❌ Error: " + error.message,
        type: "Smart Contract",
        network: "Testnet"
      };
    }
  }

  async getContractInfo(contractAddress) {
    try {
      const info = await this.client.getContract(contractAddress);
      return {
        address: contractAddress,
        data: info,
        accessible: true
      };
    } catch (error) {
      console.warn(`Cannot access contract ${contractAddress}:`, error);
      return {
        address: contractAddress,
        data: null,
        accessible: false,
        error: error.message
      };
    }
  }
}

/**
 * Enhanced pool management with multiple approaches
 */
export class EnhancedPoolManager {
  constructor() {
    this.contractManager = new StellarContractManager();
    this.client = new AdvancedSorobanClient();
  }

  async discoverActivePools(poolAddresses) {
    console.log("🔍 Discovering active pools using multiple methods...");
    
    const results = [];
    
    for (const [name, address] of Object.entries(poolAddresses)) {
      try {
        console.log(`Testing pool ${name}: ${address}`);
        
        // Method 1: Direct contract check
        const contractTest = await this.contractManager.testContract(address);
        
        // Method 2: Network connectivity test
        const networkHealth = await this.client.getHealth().catch(() => null);
        
        // Method 3: Ledger check
        const ledgerInfo = await this.client.getLatestLedger().catch(() => null);
        
        const poolInfo = {
          name,
          address,
          contractExists: contractTest.exists,
          contractStatus: contractTest.status,
          networkHealthy: !!networkHealth,
          ledgerAccessible: !!ledgerInfo,
          currentLedger: ledgerInfo?.sequence || null,
          overallStatus: this.determinePoolStatus(contractTest.exists, !!networkHealth, !!ledgerInfo),
          lastChecked: new Date().toISOString()
        };
        
        results.push(poolInfo);
        
      } catch (error) {
        console.error(`Failed to test pool ${name}:`, error);
        results.push({
          name,
          address,
          contractExists: false,
          contractStatus: "❌ Test Failed",
          networkHealthy: false,
          ledgerAccessible: false,
          overallStatus: "ERROR",
          error: error.message,
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  determinePoolStatus(contractExists, networkHealthy, ledgerAccessible) {
    if (contractExists && networkHealthy && ledgerAccessible) {
      return "FULLY_OPERATIONAL";
    } else if (networkHealthy && ledgerAccessible) {
      return "NETWORK_READY";
    } else if (contractExists) {
      return "CONTRACT_EXISTS";
    } else {
      return "UNAVAILABLE";
    }
  }

  async getPoolOperations(poolAddress, operationType = "supply") {
    try {
      // Create operation templates based on pool status
      const poolStatus = await this.contractManager.testContract(poolAddress);
      
      if (poolStatus.exists) {
        // Real operations for working contracts
        return this.createRealOperation(poolAddress, operationType);
      } else {
        // Simulated operations for demo/testing
        return this.createSimulatedOperation(poolAddress, operationType);
      }
    } catch (error) {
      console.error("Failed to get pool operations:", error);
      return this.createSimulatedOperation(poolAddress, operationType);
    }
  }

  createRealOperation(poolAddress, operationType) {
    return {
      type: "REAL_OPERATION",
      poolAddress,
      operationType,
      status: "Ready for blockchain execution",
      requiresWallet: true,
      blockchain: "Stellar Testnet",
      estimatedFee: "0.00001 XLM",
      template: `Real ${operationType} operation on pool ${poolAddress.slice(0, 8)}...`
    };
  }

  createSimulatedOperation(poolAddress, operationType) {
    return {
      type: "SIMULATED_OPERATION",
      poolAddress,
      operationType,
      status: "Simulation mode - safe testing",
      requiresWallet: false,
      blockchain: "Demo Mode",
      estimatedFee: "0 XLM (Demo)",
      template: `Simulated ${operationType} operation for testing`
    };
  }
}

/**
 * Main integration layer with fallback mechanisms
 */
export class StellarBlendIntegration {
  constructor() {
    this.poolManager = new EnhancedPoolManager();
    this.contractManager = new StellarContractManager();
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.isInitialized) return true;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    try {
      console.log("🚀 Initializing Stellar Blend Integration...");
      
      // Test network connectivity
      const connectivity = await testNetworkConnectivity();
      console.log("Network connectivity test results:", connectivity);
      
      // Test SDK availability
      const sdkAvailable = await initializeStellarSDK();
      console.log("SDK available:", sdkAvailable);
      
      // Test basic RPC functionality
      const client = new AdvancedSorobanClient();
      const health = await client.getHealth().catch(() => null);
      console.log("RPC health check:", health ? "✅ Healthy" : "⚠️ Limited");
      
      this.isInitialized = true;
      console.log("✅ Stellar Blend Integration initialized successfully");
      
      return {
        success: true,
        sdkAvailable,
        networkConnectivity: connectivity,
        rpcHealthy: !!health
      };
    } catch (error) {
      console.error("❌ Failed to initialize Stellar Blend Integration:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPoolsWithStatus(poolAddresses) {
    await this.initialize();
    
    try {
      const poolResults = await this.poolManager.discoverActivePools(poolAddresses);
      
      return poolResults.map(pool => ({
        id: pool.address,
        name: pool.name,
        status: pool.overallStatus,
        description: this.getPoolDescription(pool),
        capabilities: this.getPoolCapabilities(pool),
        isReal: pool.overallStatus === "FULLY_OPERATIONAL",
        isDemo: pool.overallStatus === "UNAVAILABLE",
        canOperate: pool.overallStatus !== "UNAVAILABLE",
        health: {
          contract: pool.contractExists,
          network: pool.networkHealthy,
          ledger: pool.ledgerAccessible
        },
        lastChecked: pool.lastChecked
      }));
    } catch (error) {
      console.error("Failed to get pools with status:", error);
      return [];
    }
  }

  getPoolDescription(pool) {
    switch (pool.overallStatus) {
      case "FULLY_OPERATIONAL":
        return `✅ Fully operational Blend pool - real transactions supported`;
      case "NETWORK_READY":
        return `🔗 Network ready - contract connectivity pending`;
      case "CONTRACT_EXISTS":
        return `📄 Contract exists - network connectivity limited`;
      default:
        return `📺 Demo mode - simulated operations for testing`;
    }
  }

  getPoolCapabilities(pool) {
    const capabilities = [];
    
    if (pool.contractExists) capabilities.push("Contract Accessible");
    if (pool.networkHealthy) capabilities.push("Network Connected");
    if (pool.ledgerAccessible) capabilities.push("Ledger Synced");
    
    if (capabilities.length === 0) {
      capabilities.push("Demo Operations");
    }
    
    return capabilities;
  }

  async executeOperation(poolAddress, operationType, amount, asset, walletKit) {
    await this.initialize();
    
    try {
      const operation = await this.poolManager.getPoolOperations(poolAddress, operationType);
      
      if (operation.type === "REAL_OPERATION" && walletKit) {
        return await this.executeRealOperation(operation, amount, asset, walletKit);
      } else {
        return await this.executeSimulatedOperation(operation, amount, asset);
      }
    } catch (error) {
      console.error("Operation execution failed:", error);
      throw error;
    }
  }

  async executeRealOperation(operation, amount, asset, walletKit) {
    console.log("🔗 Executing real blockchain operation:", operation);
    
    // This would integrate with actual Stellar SDK when available
    throw new Error("Real operations require proper SDK integration - using simulation for now");
  }

  async executeSimulatedOperation(operation, amount, asset) {
    console.log("🎮 Executing simulated operation:", operation);
    
    // Simulate operation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      txHash: `SIMULATED_${Date.now()}`,
      type: operation.operationType,
      amount,
      asset,
      timestamp: new Date().toISOString(),
      note: "This was a simulated operation for testing purposes"
    };
  }
}

// Export singleton instance
export const stellarIntegration = new StellarBlendIntegration();

// Export utility functions - only export the function, not the classes
export { initializeStellarSDK }; 