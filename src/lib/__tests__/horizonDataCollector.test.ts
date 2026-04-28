/**
 * API Mock Tests for Horizon Data Collector
 * Tests the data collection from Stellar Horizon API with proper mocking
 */

import {
  collectTransactionData,
  isDataFresh,
  getCachedAnalysis,
  cacheAnalysis,
} from '../horizonDataCollector';
import { getCache, setCache } from '../cacheManager';

// Mock the cache manager
jest.mock('../cacheManager');
const mockGetCache = getCache as jest.MockedFunction<typeof getCache>;
const mockSetCache = setCache as jest.MockedFunction<typeof setCache>;

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Horizon Data Collector', () => {
  const mockWalletAddress = 'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1';
  const mockContractAddress = 'CA3D5KQFCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q';

  describe('collectTransactionData', () => {
    it('should collect and analyze transaction data successfully', async () => {
      // Mock cache miss
      mockGetCache.mockResolvedValue(null);

      // Mock successful API responses
      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1',
              to: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              type: 'payment',
            },
            {
              id: 'payment2',
              amount: '50',
              asset_type: 'credit_alphanum4',
              asset_code: 'USD',
              from: 'GD8YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q3',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [
            {
              id: 'tx1',
              fee_charged: '100',
              operation_count: 2,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              successful: true,
            },
            {
              id: 'tx2',
              fee_charged: '150',
              operation_count: 1,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              successful: true,
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      // Mock fetch calls
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      // Mock cache set
      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.dataPoints).toBeDefined();
      expect(result.timestamp).toBeDefined();

      expect(result.metrics).toHaveProperty('totalVolume');
      expect(result.metrics).toHaveProperty('uniqueCounterparties');
      expect(result.metrics).toHaveProperty('assetDiversity');
      expect(result.metrics).toHaveProperty('nightDayRatio');
      expect(result.metrics).toHaveProperty('totalPayments');
      expect(result.metrics).toHaveProperty('totalTransactions');
      expect(result.metrics).toHaveProperty('averageTransactionSize');

      expect(result.dataPoints?.payments).toBe(2);
      expect(result.dataPoints?.transactions).toBe(2);
      expect(result.dataPoints?.period).toBe(30);

      // Verify cache was called
      expect(mockGetCache).toHaveBeenCalled();
      expect(mockSetCache).toHaveBeenCalled();
    });

    it('should use cached data when available', async () => {
      const mockCachedData = {
        success: true,
        metrics: {
          totalVolume: 150,
          uniqueCounterparties: 3,
          assetDiversity: 2,
          nightDayRatio: 0.5,
          totalPayments: 2,
          totalTransactions: 2,
          averageTransactionSize: 75,
        },
        dataPoints: {
          payments: 2,
          transactions: 2,
          period: 30,
        },
        timestamp: Date.now() - 60000, // 1 minute ago (fresh)
      };

      mockGetCache.mockResolvedValue(mockCachedData);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result).toEqual(mockCachedData);
      expect(mockGetCache).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockSetCache).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockGetCache.mockResolvedValue(null);

      // Mock fetch error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metrics).toBeUndefined();
      expect(result.dataPoints?.payments).toBe(0);
      expect(result.dataPoints?.transactions).toBe(0);
    });

    it('should handle empty API responses', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockEmptyResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockEmptyResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockEmptyResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.totalPayments).toBe(0);
      expect(result.metrics?.totalTransactions).toBe(0);
      expect(result.metrics?.totalVolume).toBe(0);
      expect(result.metrics?.uniqueCounterparties).toBe(0);
      expect(result.metrics?.assetDiversity).toBe(0);
    });

    it('should handle contract addresses correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: mockContractAddress,
              to: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockContractAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.uniqueCounterparties).toBe(1); // Should count the G... address
    });

    it('should handle pagination correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      // Mock paginated response
      const mockPaymentsPage1 = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: {
            href: 'https://horizon-testnet.stellar.org/accounts/GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1/payments?order=desc&limit=200&cursor=abc123',
          },
        },
      };

      const mockPaymentsPage2 = {
        _embedded: {
          records: [
            {
              id: 'payment2',
              amount: '50',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD8YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q3',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsPage1),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsPage2),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.dataPoints?.payments).toBe(2); // Should get payments from both pages
      expect(global.fetch).toHaveBeenCalledTimes(3); // 2 for payments, 1 for transactions
    });

    it('should filter payments by date range correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days ago (outside range)
      const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago (within range)

      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment_old',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              to: mockWalletAddress,
              created_at: oldDate,
              type: 'payment',
            },
            {
              id: 'payment_recent',
              amount: '50',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD8YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q3',
              to: mockWalletAddress,
              created_at: recentDate,
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.dataPoints?.payments).toBe(1); // Only the recent payment should be counted
      expect(result.metrics?.totalVolume).toBe(50); // Only recent payment amount
    });

    it('should calculate night/day ratio correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      const dayTime = new Date();
      dayTime.setHours(14, 0, 0, 0); // 2 PM (daytime)

      const nightTime = new Date();
      nightTime.setHours(23, 0, 0, 0); // 11 PM (nighttime)

      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment_day',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              to: mockWalletAddress,
              created_at: dayTime.toISOString(),
              type: 'payment',
            },
            {
              id: 'payment_night',
              amount: '50',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD8YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q3',
              to: mockWalletAddress,
              created_at: nightTime.toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.nightDayRatio).toBe(1); // 1 night / 1 day = 1
    });

    it('should handle different asset types correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment_native',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD7YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q2',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              type: 'payment',
            },
            {
              id: 'payment_usd',
              amount: '200',
              asset_type: 'credit_alphanum4',
              asset_code: 'USD',
              from: 'GD8YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q3',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 172800000).toISOString(),
              type: 'payment',
            },
            {
              id: 'payment_eur',
              amount: '150',
              asset_type: 'credit_alphanum12',
              asset_code: 'EUR',
              from: 'GD9YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q4',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 259200000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      const mockTransactionsResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockPaymentsResponse),
        } as Response)
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockTransactionsResponse),
        } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.assetDiversity).toBe(3); // XLM, USD, EUR
      expect(result.metrics?.totalVolume).toBe(100 + 200 * 0.1 + 150 * 0.1); // XLM + converted USD/EUR
    });
  });

  describe('isDataFresh', () => {
    it('should return true for fresh data', () => {
      const recentTimestamp = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      expect(isDataFresh(recentTimestamp)).toBe(true);
    });

    it('should return false for stale data', () => {
      const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      expect(isDataFresh(oldTimestamp)).toBe(false);
    });

    it('should return false for null timestamp', () => {
      expect(isDataFresh(null)).toBe(false);
    });
  });

  describe('getCachedAnalysis', () => {
    it('should return cached analysis if fresh', () => {
      const mockAnalysis = {
        success: true,
        metrics: { totalVolume: 100 },
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAnalysis));

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toEqual(mockAnalysis);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(`horizon_analysis_${mockWalletAddress}`);
    });

    it('should return null for stale cache', () => {
      const mockAnalysis = {
        success: true,
        metrics: { totalVolume: 100 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAnalysis));

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toBeNull();
    });

    it('should return null for invalid cache', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toBeNull();
    });

    it('should return null when no cache exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toBeNull();
    });
  });

  describe('cacheAnalysis', () => {
    it('should cache analysis data', () => {
      const mockAnalysis = {
        success: true,
        metrics: { totalVolume: 100 },
        timestamp: Date.now(),
      };

      cacheAnalysis(mockWalletAddress, mockAnalysis);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `horizon_analysis_${mockWalletAddress}`,
        JSON.stringify(mockAnalysis)
      );
    });

    it('should handle cache errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const mockAnalysis = {
        success: true,
        metrics: { totalVolume: 100 },
        timestamp: Date.now(),
      };

      // Should not throw error
      expect(() => {
        cacheAnalysis(mockWalletAddress, mockAnalysis);
      }).not.toThrow();
    });
  });

  describe('Risk Metrics Calculation', () => {
    it('should calculate average transaction size correctly', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockPaymentsResponse = {
        _embedded: {
          records: [
            { id: 'p1', amount: '100', asset_type: 'native', asset_code: 'XLM', from: 'GD1', to: mockWalletAddress, created_at: new Date().toISOString(), type: 'payment' },
            { id: 'p2', amount: '200', asset_type: 'native', asset_code: 'XLM', from: 'GD2', to: mockWalletAddress, created_at: new Date().toISOString(), type: 'payment' },
            { id: 'p3', amount: '300', asset_type: 'native', asset_code: 'XLM', from: 'GD3', to: mockWalletAddress, created_at: new Date().toISOString(), type: 'payment' },
          ],
        },
        _links: { next: null },
      };

      const mockTransactionsResponse = {
        _embedded: { records: [] },
        _links: { next: null },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockPaymentsResponse) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockTransactionsResponse) } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.averageTransactionSize).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should handle zero payments for average calculation', async () => {
      mockGetCache.mockResolvedValue(null);

      const mockPaymentsResponse = {
        _embedded: { records: [] },
        _links: { next: null },
      };

      const mockTransactionsResponse = {
        _embedded: { records: [] },
        _links: { next: null },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockPaymentsResponse) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockTransactionsResponse) } as Response);

      mockSetCache.mockResolvedValue(undefined);

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics?.averageTransactionSize).toBe(0);
    });
  });
});
