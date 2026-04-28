/**
 * Contract Interaction Tests for Risk Tier Client
 * Tests the Soroban smart contract interactions with proper mocking
 */

import { RiskTierContractClient, riskTierClient, useRiskTierContract } from '../riskTierClient';
import { getCache, setCache, invalidateCache } from '../cacheManager';
import { passkeyWallet } from './passkeyIntegration';

// Mock dependencies
jest.mock('../cacheManager');
jest.mock('./passkeyIntegration');
jest.mock('@stellar/stellar-sdk', () => ({
  Address: {
    fromString: jest.fn(),
  },
  Contract: jest.fn(),
  TransactionBuilder: jest.fn(),
  Networks: {
    TESTNET: 'TESTNET',
  },
  BASE_FEE: '100',
  StrKey: {
    isValidEd25519PublicKey: jest.fn(),
  },
  Horizon: {
    Server: jest.fn(),
  },
  Server: jest.fn(),
  nativeToScVal: jest.fn(),
  scValToNative: jest.fn(),
}));

// Mock the cache invalidation hook
jest.mock('../hooks/useCacheInvalidation', () => ({
  dispatchCacheEvent: {
    riskTierUpdated: jest.fn(),
  },
}));

import { getCache as mockGetCache, setCache as mockSetCache, invalidateCache as mockInvalidateCache } from '../cacheManager';
import { passkeyWallet as mockPasskeyWallet } from './passkeyIntegration';
import { dispatchCacheEvent } from '../hooks/useCacheInvalidation';
import { Address, Contract, TransactionBuilder, Networks, StrKey, Horizon, Server, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';

// Mock React hooks
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: () => [false, mockSetLoading],
}));

describe('Risk Tier Contract Client', () => {
  const mockWalletAddress = 'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1';
  const mockContractAddress = 'CA3D5KQFCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q';
  const mockScore = 75;
  const mockTier = 'TIER_2';
  const mockChosenTier = 'TIER_2';

  let client: RiskTierContractClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment variables
    process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID = mockContractAddress;
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = Networks.TESTNET;

    // Mock Address.fromString
    (Address.fromString as jest.Mock).mockReturnValue({
      toScVal: () => 'mock-address-scval',
    });

    // Mock StrKey.isValidEd25519PublicKey
    (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(true);

    // Mock nativeToScVal
    (nativeToScVal as jest.Mock).mockImplementation((value, options) => {
      if (options?.type === 'u32') return `mock-u32-${value}`;
      if (options?.type === 'symbol') return `mock-symbol-${value}`;
      return `mock-scval-${value}`;
    });

    // Mock scValToNative
    (scValToNative as jest.Mock).mockImplementation((scval) => {
      if (typeof scval === 'string' && scval.includes('mock-')) {
        return scval.replace('mock-', '');
      }
      return scval;
    });

    // Mock Contract
    const mockContract = {
      call: jest.fn(),
    } as any;
    (Contract as jest.Mock).mockImplementation(() => mockContract);

    // Mock Server
    const mockServer = {
      simulateTransaction: jest.fn(),
    } as any;
    (Server as jest.Mock).mockImplementation(() => mockServer);

    // Mock Horizon.Server
    const mockHorizonServer = {
      loadAccount: jest.fn(),
    } as any;
    (Horizon.Server as jest.Mock).mockImplementation(() => mockHorizonServer);

    // Mock TransactionBuilder
    const mockTransactionBuilder = {
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        toXDR: () => 'mock-transaction-xdr',
      }),
    };
    (TransactionBuilder as jest.Mock).mockImplementation(() => mockTransactionBuilder);

    // Mock passkey wallet
    mockPasskeyWallet.signTransaction = jest.fn().mockResolvedValue('mock-signature');
    mockPasskeyWallet.submitTransactionDirectly = jest.fn().mockResolvedValue({
      hash: 'mock-tx-hash',
    });
    mockPasskeyWallet.smartWalletAddress = mockContractAddress;

    // Mock cache functions
    mockGetCache.mockResolvedValue(null);
    mockSetCache.mockResolvedValue(undefined);
    mockInvalidateCache.mockResolvedValue(undefined);

    client = new RiskTierContractClient(mockContractAddress);
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
    delete process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE;
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with provided contract ID', () => {
      const customClient = new RiskTierContractClient(mockContractAddress);
      expect(customClient).toBeInstanceOf(RiskTierContractClient);
    });

    it('should use environment variables when no contract ID provided', () => {
      const envClient = new RiskTierContractClient();
      expect(envClient).toBeInstanceOf(RiskTierContractClient);
    });

    it('should throw error when contract ID is not configured', () => {
      delete process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID;
      delete process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;

      const envClient = new RiskTierContractClient();
      
      // Should not throw on initialization, but on first contract call
      expect(() => envClient['contract']).toThrow('Contract ID not configured');
    });
  });

  describe('setRiskTier', () => {
    it('should set risk tier successfully', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'mock-result' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.setRiskTier(mockWalletAddress, mockScore, mockTier, mockChosenTier);

      expect(result).toBe('mock-tx-hash');
      expect(mockPasskeyWallet.signTransaction).toHaveBeenCalledWith('mock-transaction-xdr');
      expect(mockPasskeyWallet.submitTransactionDirectly).toHaveBeenCalled();
      expect(mockInvalidateCache).toHaveBeenCalled();
      expect(dispatchCacheEvent.riskTierUpdated).toHaveBeenCalledWith(mockWalletAddress, mockTier);
    });

    it('should validate address format', async () => {
      (StrKey.isValidEd25519PublicKey as jest.Mock).mockReturnValue(false);

      await expect(client.setRiskTier('invalid-address', mockScore, mockTier, mockChosenTier))
        .rejects.toThrow('not a valid Stellar address');
    });

    it('should validate score range', async () => {
      await expect(client.setRiskTier(mockWalletAddress, -1, mockTier, mockChosenTier))
        .rejects.toThrow('Score must be between 0 and 100');

      await expect(client.setRiskTier(mockWalletAddress, 101, mockTier, mockChosenTier))
        .rejects.toThrow('Score must be between 0 and 100');
    });

    it('should validate tier values', async () => {
      await expect(client.setRiskTier(mockWalletAddress, mockScore, 'INVALID_TIER', mockChosenTier))
        .rejects.toThrow('Must be one of: TIER_1, TIER_2, TIER_3');
    });

    it('should handle contract call failures', async () => {
      mockPasskeyWallet.submitTransactionDirectly.mockRejectedValue(new Error('Transaction failed'));

      await expect(client.setRiskTier(mockWalletAddress, mockScore, mockTier, mockChosenTier))
        .rejects.toThrow('Transaction failed');
    });
  });

  describe('getRiskTier', () => {
    it('should get risk tier data from cache', async () => {
      const mockCachedData = {
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      };

      mockGetCache.mockResolvedValue(mockCachedData);

      const result = await client.getRiskTier(mockWalletAddress);

      expect(result).toEqual(mockCachedData);
      expect(mockGetCache).toHaveBeenCalled();
      expect(Server).not.toHaveBeenCalled(); // Should not call RPC if cache hit
    });

    it('should fetch risk tier data from contract when cache miss', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'score-75-tier-TIER_2-timestamp-123-chosen_tier-TIER_2' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue({
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      });

      const result = await client.getRiskTier(mockWalletAddress);

      expect(result).toEqual({
        score: mockScore,
        tier: mockTier,
        timestamp: expect.any(BigInt),
        chosen_tier: mockChosenTier,
      });

      expect(mockSetCache).toHaveBeenCalled();
    });

    it('should return null when no risk tier data exists', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: null },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getRiskTier(mockWalletAddress);

      expect(result).toBeNull();
    });

    it('should handle RPC errors gracefully', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getRiskTier(mockWalletAddress);

      expect(result).toBeNull();
    });
  });

  describe('getScore', () => {
    it('should get score from cached tier data', async () => {
      const mockCachedData = {
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      };

      mockGetCache.mockResolvedValue(mockCachedData);

      const result = await client.getScore(mockWalletAddress);

      expect(result).toBe(mockScore);
    });

    it('should fetch score directly when no cached data', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: '75' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue(mockScore);

      const result = await client.getScore(mockWalletAddress);

      expect(result).toBe(mockScore);
    });

    it('should return 0 on errors', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getScore(mockWalletAddress);

      expect(result).toBe(0);
    });
  });

  describe('getChosenTier', () => {
    it('should get chosen tier from cached data', async () => {
      const mockCachedData = {
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      };

      mockGetCache.mockResolvedValue(mockCachedData);

      const result = await client.getChosenTier(mockWalletAddress);

      expect(result).toBe(mockChosenTier);
    });

    it('should fetch chosen tier directly when no cached data', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'TIER_2' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue(mockChosenTier);

      const result = await client.getChosenTier(mockWalletAddress);

      expect(result).toBe(mockChosenTier);
    });

    it('should return TIER_3 as default on errors', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getChosenTier(mockWalletAddress);

      expect(result).toBe('TIER_3');
    });

    it('should return TIER_3 for invalid tier values', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'INVALID_TIER' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue('INVALID_TIER');

      const result = await client.getChosenTier(mockWalletAddress);

      expect(result).toBe('TIER_3');
    });
  });

  describe('canAccessTier', () => {
    it('should check tier access successfully', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'true' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue(true);

      const result = await client.canAccessTier(mockWalletAddress, 'TIER_1');

      expect(result).toBe(true);
    });

    it('should return false on errors', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.canAccessTier(mockWalletAddress, 'TIER_1');

      expect(result).toBe(false);
    });

    it('should validate target tier', async () => {
      await expect(client.canAccessTier(mockWalletAddress, 'INVALID_TIER'))
        .rejects.toThrow('Must be one of: TIER_1, TIER_2, TIER_3');
    });
  });

  describe('getTierStats', () => {
    it('should get tier statistics successfully', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'TIER_1-10-TIER_2-20-TIER_3-5' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue({
        TIER_1: 10,
        TIER_2: 20,
        TIER_3: 5,
      });

      const result = await client.getTierStats();

      expect(result).toEqual({
        TIER_1: 10,
        TIER_2: 20,
        TIER_3: 5,
      });
    });

    it('should return default stats on errors', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getTierStats();

      expect(result).toEqual({
        TIER_1: 0,
        TIER_2: 0,
        TIER_3: 0,
      });
    });

    it('should handle malformed stats data', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: null },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getTierStats();

      expect(result).toEqual({
        TIER_1: 0,
        TIER_2: 0,
        TIER_3: 0,
      });
    });
  });

  describe('getTierUsers', () => {
    it('should get users in specific tier', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1,GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue([
        'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1',
        'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
      ]);

      const result = await client.getTierUsers('TIER_1');

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1');
    });

    it('should return empty array on errors', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('RPC error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.getTierUsers('TIER_1');

      expect(result).toEqual([]);
    });

    it('should validate tier parameter', async () => {
      await expect(client.getTierUsers('INVALID_TIER'))
        .rejects.toThrow('Must be one of: TIER_1, TIER_2, TIER_3');
    });
  });

  describe('updateChosenTier', () => {
    it('should update chosen tier successfully', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'mock-result' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      const result = await client.updateChosenTier(mockWalletAddress, 'TIER_1');

      expect(result).toBe('mock-tx-hash');
      expect(mockPasskeyWallet.signTransaction).toHaveBeenCalled();
      expect(mockPasskeyWallet.submitTransactionDirectly).toHaveBeenCalled();
    });

    it('should validate new chosen tier', async () => {
      await expect(client.updateChosenTier(mockWalletAddress, 'INVALID_TIER'))
        .rejects.toThrow('Must be one of: TIER_1, TIER_2, TIER_3');
    });
  });

  describe('Account Resolution', () => {
    it('should load G address from Horizon', async () => {
      const mockHorizonServer = {
        loadAccount: jest.fn().mockResolvedValue({
          accountId: mockWalletAddress,
          sequence: '123456789',
        }),
      };
      (Horizon.Server as jest.Mock).mockImplementation(() => mockHorizonServer);

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'true' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      await client.canAccessTier(mockWalletAddress, 'TIER_1');

      expect(mockHorizonServer.loadAccount).toHaveBeenCalledWith(mockWalletAddress);
    });

    it('should handle account not found errors', async () => {
      const mockHorizonServer = {
        loadAccount: jest.fn().mockRejectedValue(new Error('Account not found')),
      };
      (Horizon.Server as jest.Mock).mockImplementation(() => mockHorizonServer);

      // Mock friendbot funding
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'true' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      await client.canAccessTier(mockWalletAddress, 'TIER_1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('friendbot.stellar.org')
      );
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton client', () => {
      expect(riskTierClient).toBeInstanceOf(RiskTierContractClient);
    });

    it('should use lazy initialization for singleton', () => {
      delete process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID;
      delete process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;

      // Should not throw on import
      expect(() => riskTierClient).not.toThrow();

      // Should throw on first use
      expect(() => riskTierClient['contract']).toThrow('Contract ID not configured');
    });
  });

  describe('React Hook', () => {
    it('should provide hook methods', () => {
      const { result } = require('react').renderHook(() => useRiskTierContract());

      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('setRiskTier');
      expect(result.current).toHaveProperty('getRiskTier');
      expect(result.current).toHaveProperty('canAccessTier');
      expect(result.current).toHaveProperty('updateChosenTier');
      expect(result.current).toHaveProperty('getTierStats');
    });

    it('should handle loading states correctly', async () => {
      const mockHook = useRiskTierContract();

      // Mock async operation
      mockSetLoading.mockClear();

      await mockHook.setRiskTier(mockWalletAddress, mockScore, mockTier, mockChosenTier);

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('should handle error states correctly', async () => {
      const mockHook = useRiskTierContract();

      mockSetError.mockClear();

      // Mock an error
      const mockServer = {
        simulateTransaction: jest.fn().mockRejectedValue(new Error('Test error')),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      try {
        await mockHook.setRiskTier(mockWalletAddress, mockScore, mockTier, mockChosenTier);
      } catch (error) {
        // Expected to throw
      }

      expect(mockSetError).toHaveBeenCalled();
    });
  });

  describe('Cache Integration', () => {
    it('should use cache for read operations', async () => {
      const mockCachedData = {
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      };

      mockGetCache.mockResolvedValue(mockCachedData);

      await client.getRiskTier(mockWalletAddress);

      expect(mockGetCache).toHaveBeenCalledWith('USER_RISK_TIER_GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1');
      expect(Server).not.toHaveBeenCalled();
    });

    it('should cache results after successful fetch', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'score-75-tier-TIER_2-timestamp-123-chosen_tier-TIER_2' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      (scValToNative as jest.Mock).mockReturnValue({
        score: mockScore,
        tier: mockTier,
        timestamp: BigInt(Date.now()),
        chosen_tier: mockChosenTier,
      });

      await client.getRiskTier(mockWalletAddress);

      expect(mockSetCache).toHaveBeenCalledWith(
        'USER_RISK_TIER_GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1',
        expect.any(Object),
        { ttl: 900000 } // 15 minutes
      );
    });

    it('should invalidate cache after updates', async () => {
      const mockServer = {
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: 'mock-result' },
        }),
      };
      (Server as jest.Mock).mockImplementation(() => mockServer);

      await client.setRiskTier(mockWalletAddress, mockScore, mockTier, mockChosenTier);

      expect(mockInvalidateCache).toHaveBeenCalledWith('USER_RISK_TIER_GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1');
      expect(mockInvalidateCache).toHaveBeenCalledWith('RISK_SCORE_GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1');
      expect(mockInvalidateCache).toHaveBeenCalledWith('HORIZON_DATA_GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1');
    });
  });

  describe('Input Validation', () => {
    it('should validate contract addresses', () => {
      expect(() => client['validateAddress'](mockWalletAddress)).not.toThrow();
      expect(() => client['validateAddress'](mockContractAddress)).not.toThrow();
      
      expect(() => client['validateAddress']('')).toThrow('required and must be a non-empty string');
      expect(() => client['validateAddress']('invalid')).toThrow('not a valid Stellar address');
      expect(() => client['validateAddress']('G' + 'A'.repeat(55))).not.toThrow();
      expect(() => client['validateAddress']('C' + 'A'.repeat(55))).not.toThrow();
      expect(() => client['validateAddress']('G' + 'A'.repeat(54))).toThrow('not a valid Stellar address');
    });

    it('should validate scores', () => {
      expect(() => client['validateScore'](50)).not.toThrow();
      expect(() => client['validateScore'](0)).not.toThrow();
      expect(() => client['validateScore'](100)).not.toThrow();
      
      expect(() => client['validateScore'](-1)).toThrow('Score must be between 0 and 100');
      expect(() => client['validateScore'](101)).toThrow('Score must be between 0 and 100');
      expect(() => client['validateScore'](NaN)).toThrow('Score must be a finite number');
      expect(() => client['validateScore'](Infinity)).toThrow('Score must be a finite number');
    });

    it('should validate tiers', () => {
      expect(() => client['validateTierInput']('TIER_1')).not.toThrow();
      expect(() => client['validateTierInput']('tier_1')).not.toThrow(); // Should normalize
      expect(() => client['validateTierInput']('  tier_2  ')).not.toThrow(); // Should trim
      
      expect(() => client['validateTierInput']('')).toThrow('required and must be a string');
      expect(() => client['validateTierInput']('INVALID')).toThrow('Must be one of: TIER_1, TIER_2, TIER_3');
    });
  });
});
