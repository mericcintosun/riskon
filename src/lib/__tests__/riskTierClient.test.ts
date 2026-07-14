/**
 * @jest-environment jsdom
 */

import { RiskTierContractClient, riskTierClient, useRiskTierContract } from '../riskTierClient';
import { Server, Address, nativeToScVal, scValToNative, Networks, BASE_FEE, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

// Mock Stellar SDK
jest.mock('@stellar/stellar-sdk', () => ({
  Server: jest.fn(),
  Address: {
    fromString: jest.fn(),
  },
  nativeToScVal: jest.fn(),
  scValToNative: jest.fn(),
  TransactionBuilder: jest.fn(),
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
  },
  BASE_FEE: '100',
  StrKey: {
    isValidEd25519PublicKey: jest.fn(),
  },
  Horizon: {
    Server: jest.fn(),
  },
}));

// Mock cacheManager
jest.mock('../cacheManager', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

// Mock cache invalidation hook
jest.mock('../hooks/useCacheInvalidation', () => ({
  dispatchCacheEvent: {
    riskTierUpdated: jest.fn(),
  },
}));

// Mock cache types
jest.mock('../types/cache', () => ({
  CACHE_KEYS: {
    USER_RISK_TIER: 'user_risk_tier',
    RISK_SCORE: 'risk_score',
    HORIZON_DATA: 'horizon_data',
  },
}));

// Mock passkey integration
jest.mock('../passkeyIntegration', () => ({
  passkeyWallet: {
    signTransaction: jest.fn(),
    submitTransactionDirectly: jest.fn(),
    smartWalletAddress: 'C1234567890ABCDEF1234567890ABCDEF12345678',
  },
}));

// Mock console methods
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('RiskTierContractClient', () => {
  let client: RiskTierContractClient;
  let mockServer: jest.Mocked<Server>;
  let mockHorizon: jest.Mocked<any>;

  const mockContractId = 'C1234567890ABCDEF1234567890ABCDEF12345678';
  const mockWalletAddress = 'GD5TESTEXAMPLEADDRESS123456789';
  const mockRiskTierData = {
    score: 25,
    tier: 'TIER_1',
    timestamp: BigInt(Date.now()),
    chosen_tier: 'TIER_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Server constructor
    mockServer = {
      simulateTransaction: jest.fn(),
    } as any;
    (Server as jest.Mock).mockReturnValue(mockServer);

    // Mock Horizon Server
    mockHorizon = {
      loadAccount: jest.fn(),
    };
    (Horizon.Server as jest.Mock).mockReturnValue(mockHorizon);

    // Mock Address.fromString
    (Address.fromString as jest.Mock).mockReturnValue({
      toScVal: jest.fn().mockReturnValue('mock-address-scval'),
    });

    // Mock nativeToScVal
    (nativeToScVal as jest.Mock).mockReturnValue('mock-scval');

    // Mock scValToNative
    (scValToNative as jest.Mock).mockReturnValue(mockRiskTierData);

    // Mock StrKey.isValidEd25519PublicKey
    const { StrKey } = require('@stellar/stellar-sdk');
    StrKey.isValidEd25519PublicKey.mockReturnValue(true);

    // Mock TransactionBuilder
    const mockTxBuilder = {
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        toXDR: jest.fn().mockReturnValue('mock-transaction-xdr'),
      }),
    };
    (TransactionBuilder as jest.Mock).mockImplementation(() => mockTxBuilder);

    // Set environment variables
    process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID = mockContractId;
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = Networks.TESTNET;

    client = new RiskTierContractClient(mockContractId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should initialize with provided contract ID', () => {
      const testClient = new RiskTierContractClient(mockContractId);
      expect(testClient).toBeInstanceOf(RiskTierContractClient);
    });

    test('should use environment variables when no contract ID provided', () => {
      const testClient = new RiskTierContractClient();
      expect(testClient).toBeInstanceOf(RiskTierContractClient);
    });

    test('should throw error when contract ID is not configured', () => {
      delete process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID;
      delete process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;

      const testClient = new RiskTierContractClient();
      
      expect(() => testClient['contract']).toThrow(
        'Contract ID not configured. Set NEXT_PUBLIC_RISK_TIER_CONTRACT_ID or NEXT_PUBLIC_RISKSCORE_CONTRACT_ID in your .env.local file.'
      );
    });
  });

  describe('Address Validation', () => {
    test('should validate valid G address', () => {
      const { StrKey } = require('@stellar/stellar-sdk');
      StrKey.isValidEd25519PublicKey.mockReturnValue(true);

      expect(() => client['validateAddress'](mockWalletAddress)).not.toThrow();
    });

    test('should validate valid C address', () => {
      const { StrKey } = require('@stellar/stellar-sdk');
      StrKey.isValidEd25519PublicKey.mockReturnValue(false);

      const cAddress = 'C1234567890ABCDEF1234567890ABCDEF12345678';
      expect(() => client['validateAddress'](cAddress)).not.toThrow();
    });

    test('should reject invalid address format', () => {
      const { StrKey } = require('@stellar/stellar-sdk');
      StrKey.isValidEd25519PublicKey.mockReturnValue(false);

      expect(() => client['validateAddress']('INVALID')).toThrow(
        'Address "INVALID" is not a valid Stellar address.'
      );
    });

    test('should reject empty address', () => {
      expect(() => client['validateAddress']('')).toThrow(
        'Address is required and must be a non-empty string.'
      );
    });

    test('should reject null address', () => {
      expect(() => client['validateAddress'](null)).toThrow(
        'Address is required and must be a non-empty string.'
      );
    });
  });

  describe('Score Validation', () => {
    test('should accept valid score', () => {
      expect(client['validateScore'](50)).toBe(50);
    });

    test('should round decimal scores', () => {
      expect(client['validateScore'](75.7)).toBe(76);
    });

    test('should reject negative scores', () => {
      expect(() => client['validateScore'](-10)).toThrow(
        'Score must be between 0 and 100 (inclusive), received -10.'
      );
    });

    test('should reject scores over 100', () => {
      expect(() => client['validateScore'](150)).toThrow(
        'Score must be between 0 and 100 (inclusive), received 150.'
      );
    });

    test('should reject non-numeric scores', () => {
      expect(() => client['validateScore']('invalid' as any)).toThrow(
        'Score must be a finite number.'
      );
    });

    test('should reject infinite scores', () => {
      expect(() => client['validateScore'](Infinity)).toThrow(
        'Score must be a finite number.'
      );
    });
  });

  describe('Tier Validation', () => {
    test('should accept valid tiers', () => {
      expect(client['validateTierInput']('TIER_1')).toBe('TIER_1');
      expect(client['validateTierInput']('tier_2')).toBe('TIER_2');
      expect(client['validateTierInput']('Tier_3')).toBe('TIER_3');
    });

    test('should reject invalid tiers', () => {
      expect(() => client['validateTierInput']('INVALID_TIER')).toThrow(
        'Tier "INVALID_TIER" is invalid. Must be one of: TIER_1, TIER_2, TIER_3.'
      );
    });

    test('should reject empty tier', () => {
      expect(() => client['validateTierInput']('')).toThrow(
        'Tier is required and must be a string.'
      );
    });
  });

  describe('Read Operations', () => {
    describe('getRiskTier', () => {
      test('should return cached risk tier data', async () => {
        const { getCache } = require('../cacheManager');
        const { CACHE_KEYS } = require('../types/cache');
        
        getCache.mockResolvedValue(mockRiskTierData);

        const result = await client.getRiskTier(mockWalletAddress);

        expect(getCache).toHaveBeenCalledWith(`${CACHE_KEYS.USER_RISK_TIER}_${mockWalletAddress}`);
        expect(result).toEqual(mockRiskTierData);
        expect(console.log).toHaveBeenCalledWith('🚀 Using cached risk tier data');
      });

      test('should fetch fresh risk tier data from contract', async () => {
        const { getCache, setCache } = require('../cacheManager');
        const { CACHE_KEYS } = require('../types/cache');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-risk-tier-scval' },
        });

        const result = await client.getRiskTier(mockWalletAddress);

        expect(mockServer.simulateTransaction).toHaveBeenCalled();
        expect(scValToNative).toHaveBeenCalledWith('mock-risk-tier-scval');
        expect(setCache).toHaveBeenCalled();
        expect(result).toEqual(mockRiskTierData);
      });

      test('should handle simulation errors gracefully', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockResolvedValue({
          error: 'Simulation failed',
        });

        const result = await client.getRiskTier(mockWalletAddress);

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[RiskTierClient] Simulation error in getRiskTier:'),
          'Simulation failed'
        );
      });

      test('should handle network errors', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.getRiskTier(mockWalletAddress);

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('[RiskTierClient] simulateReadCall(getRiskTier) failed:'),
          expect.any(Error)
        );
      });
    });

    describe('getScore', () => {
      test('should return score from cached tier data', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(mockRiskTierData);

        const result = await client.getScore(mockWalletAddress);

        expect(result).toBe(25);
      });

      test('should fetch score directly from contract', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-score-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue(42);

        const result = await client.getScore(mockWalletAddress);

        expect(result).toBe(42);
      });

      test('should return 0 on error', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.getScore(mockWalletAddress);

        expect(result).toBe(0);
      });
    });

    describe('getChosenTier', () => {
      test('should return chosen tier from cached data', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(mockRiskTierData);

        const result = await client.getChosenTier(mockWalletAddress);

        expect(result).toBe('TIER_1');
      });

      test('should fetch chosen tier directly from contract', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-tier-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue('TIER_2');

        const result = await client.getChosenTier(mockWalletAddress);

        expect(result).toBe('TIER_2');
      });

      test('should return TIER_3 as default on error', async () => {
        const { getCache } = require('../cacheManager');
        
        getCache.mockResolvedValue(null);
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.getChosenTier(mockWalletAddress);

        expect(result).toBe('TIER_3');
      });
    });

    describe('canAccessTier', () => {
      test('should return true for accessible tier', async () => {
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-bool-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue(true);

        const result = await client.canAccessTier(mockWalletAddress, 'TIER_1');

        expect(result).toBe(true);
      });

      test('should return false for inaccessible tier', async () => {
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-bool-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue(false);

        const result = await client.canAccessTier(mockWalletAddress, 'TIER_3');

        expect(result).toBe(false);
      });

      test('should return false on error', async () => {
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.canAccessTier(mockWalletAddress, 'TIER_1');

        expect(result).toBe(false);
      });
    });

    describe('getTierStats', () => {
      test('should return tier statistics', async () => {
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-stats-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue({
          TIER_1: 100,
          TIER_2: 50,
          TIER_3: 25,
        });

        const result = await client.getTierStats();

        expect(result).toEqual({
          TIER_1: 100,
          TIER_2: 50,
          TIER_3: 25,
        });
      });

      test('should return default stats on error', async () => {
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.getTierStats();

        expect(result).toEqual({
          TIER_1: 0,
          TIER_2: 0,
          TIER_3: 0,
        });
      });
    });

    describe('getTierUsers', () => {
      test('should return users in specified tier', async () => {
        mockServer.simulateTransaction.mockResolvedValue({
          result: { retval: 'mock-users-scval' },
        });
        (scValToNative as jest.Mock).mockReturnValue([
          'GD5USER1',
          'GD5USER2',
          'GD5USER3',
        ]);

        const result = await client.getTierUsers('TIER_1');

        expect(result).toEqual(['GD5USER1', 'GD5USER2', 'GD5USER3']);
      });

      test('should return empty array on error', async () => {
        mockServer.simulateTransaction.mockRejectedValue(new Error('Network error'));

        const result = await client.getTierUsers('TIER_1');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Write Operations', () => {
    describe('setRiskTier', () => {
      test('should set risk tier successfully', async () => {
        const { passkeyWallet } = require('../passkeyIntegration');
        const { invalidateCache } = require('../cacheManager');
        const { dispatchCacheEvent } = require('../hooks/useCacheInvalidation');
        
        passkeyWallet.signTransaction.mockResolvedValue('mock-signature');
        passkeyWallet.submitTransactionDirectly.mockResolvedValue({
          hash: '0x1234567890abcdef',
        });

        mockHorizon.loadAccount.mockResolvedValue({
          sequence: '123456789',
        });

        const result = await client.setRiskTier(
          mockWalletAddress,
          25,
          'TIER_1',
          'TIER_1'
        );

        expect(result).toBe('0x1234567890abcdef');
        expect(invalidateCache).toHaveBeenCalled();
        expect(dispatchCacheEvent.riskTierUpdated).toHaveBeenCalledWith(
          mockWalletAddress,
          'TIER_1'
        );
      });

      test('should handle signing errors', async () => {
        const { passkeyWallet } = require('../passkeyIntegration');
        
        passkeyWallet.signTransaction.mockRejectedValue(new Error('Signing failed'));

        mockHorizon.loadAccount.mockResolvedValue({
          sequence: '123456789',
        });

        await expect(
          client.setRiskTier(mockWalletAddress, 25, 'TIER_1', 'TIER_1')
        ).rejects.toThrow('Signing failed');
      });
    });

    describe('updateChosenTier', () => {
      test('should update chosen tier successfully', async () => {
        const { passkeyWallet } = require('../passkeyIntegration');
        
        passkeyWallet.signTransaction.mockResolvedValue('mock-signature');
        passkeyWallet.submitTransactionDirectly.mockResolvedValue({
          hash: '0xabcdef1234567890',
        });

        mockHorizon.loadAccount.mockResolvedValue({
          sequence: '123456789',
        });

        const result = await client.updateChosenTier(mockWalletAddress, 'TIER_2');

        expect(result).toBe('0xabcdef1234567890');
      });
    });
  });

  describe('Cache Management', () => {
    test('should invalidate user cache after updates', async () => {
      const { passkeyWallet } = require('../passkeyIntegration');
      const { invalidateCache } = require('../cacheManager');
      
      passkeyWallet.signTransaction.mockResolvedValue('mock-signature');
      passkeyWallet.submitTransactionDirectly.mockResolvedValue({
        hash: '0x1234567890abcdef',
      });

      mockHorizon.loadAccount.mockResolvedValue({
        sequence: '123456789',
      });

      await client.setRiskTier(mockWalletAddress, 25, 'TIER_1', 'TIER_1');

      expect(invalidateCache).toHaveBeenCalledTimes(3); // USER_RISK_TIER, RISK_SCORE, HORIZON_DATA
    });
  });

  describe('Account Resolution', () => {
    test('should load G address from Horizon', async () => {
      const { passkeyWallet } = require('../passkeyIntegration');
      
      passkeyWallet.signTransaction.mockResolvedValue('mock-signature');
      passkeyWallet.submitTransactionDirectly.mockResolvedValue({
        hash: '0x1234567890abcdef',
      });

      const mockAccount = {
        sequence: '123456789',
      };
      mockHorizon.loadAccount.mockResolvedValue(mockAccount);

      await client.setRiskTier(mockWalletAddress, 25, 'TIER_1', 'TIER_1');

      expect(mockHorizon.loadAccount).toHaveBeenCalledWith(mockWalletAddress);
    });

    test('should fund account via friendbot on testnet', async () => {
      const { passkeyWallet } = require('../passkeyIntegration');
      
      passkeyWallet.signTransaction.mockResolvedValue('mock-signature');
      passkeyWallet.submitTransactionDirectly.mockResolvedValue({
        hash: '0x1234567890abcdef',
      });

      // First call fails (account not found), second succeeds (after funding)
      mockHorizon.loadAccount
        .mockRejectedValueOnce(new Error('Account not found'))
        .mockResolvedValueOnce({ sequence: '123456789' });

      // Mock fetch for friendbot
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      await client.setRiskTier(mockWalletAddress, 25, 'TIER_1', 'TIER_1');

      expect(fetch).toHaveBeenCalledWith(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(mockWalletAddress)}`
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors in setRiskTier', async () => {
      await expect(
        client.setRiskTier('invalid', -10, 'INVALID', 'TIER_1')
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to set risk tier:',
        expect.any(Error)
      );
    });

    test('should handle validation errors in updateChosenTier', async () => {
      await expect(
        client.updateChosenTier('invalid', 'INVALID')
      ).rejects.toThrow();
    });

    test('should handle validation errors in canAccessTier', async () => {
      await expect(
        client.canAccessTier('invalid', 'INVALID')
      ).rejects.toThrow();
    });
  });
});

describe('useRiskTierContract Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(React, 'useState').mockImplementation((initial) => {
      if (typeof initial === 'function') {
        return [initial(), jest.fn()];
      }
      return [initial, jest.fn()];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should provide hook interface', () => {
    const { result } = renderHook(() => useRiskTierContract());

    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('setRiskTier');
    expect(result.current).toHaveProperty('getRiskTier');
    expect(result.current).toHaveProperty('canAccessTier');
    expect(result.current).toHaveProperty('updateChosenTier');
    expect(result.current).toHaveProperty('getTierStats');
  });

  test('should handle loading states', async () => {
    const { result } = renderHook(() => useRiskTierContract());

    // Mock a slow operation
    jest.spyOn(riskTierClient, 'getRiskTier').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(null), 100))
    );

    const promise = result.current.getRiskTier('GD5TEST');

    expect(result.current.loading).toBe(true);

    await promise;

    expect(result.current.loading).toBe(false);
  });

  test('should handle errors', async () => {
    const { result } = renderHook(() => useRiskTierContract());

    jest.spyOn(riskTierClient, 'getRiskTier').mockRejectedValue(
      new Error('Test error')
    );

    await result.current.getRiskTier('GD5TEST');

    expect(result.current.error).toBe('Test error');
    expect(result.current.loading).toBe(false);
  });
});

describe('Singleton Instance', () => {
  test('should export singleton client instance', () => {
    expect(riskTierClient).toBeInstanceOf(RiskTierContractClient);
  });

  test('should reuse same instance', () => {
    const client1 = riskTierClient;
    const client2 = riskTierClient;

    expect(client1).toBe(client2);
  });
});

// Helper function for testing hooks
function renderHook<T>(hook: () => T): { result: { current: T } } {
  const result = { current: null as T };
  
  // Simple hook renderer for testing
  const React = require('react');
  
  function TestComponent() {
    result.current = hook();
    return null;
  }

  // Mock React rendering
  require('react').createElement(TestComponent);

  return { result };
}
