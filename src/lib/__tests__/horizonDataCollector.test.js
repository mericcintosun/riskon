/**
 * @jest-environment jsdom
 */

import { collectTransactionData, isDataFresh, getCachedAnalysis, cacheAnalysis } from '../horizonDataCollector';

// Mock the cacheManager module
jest.mock('../cacheManager', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

// Mock the CACHE_KEYS
jest.mock('../types/cache', () => ({
  CACHE_KEYS: {
    HORIZON_DATA: 'horizon_data',
    USER_RISK_TIER: 'user_risk_tier',
    RISK_SCORE: 'risk_score',
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Horizon Data Collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('collectTransactionData', () => {
    const mockWalletAddress = 'GD5TQY6K5ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';

    test('should return cached data when available', async () => {
      const { getCache } = require('../cacheManager');
      const { CACHE_KEYS } = require('../types/cache');
      
      const cachedData = {
        success: true,
        metrics: {
          totalVolume: 5000,
          uniqueCounterparties: 25,
          assetDiversity: 5,
          nightDayRatio: 0.3,
        },
        timestamp: Date.now(),
      };

      getCache.mockResolvedValue(cachedData);

      const result = await collectTransactionData(mockWalletAddress);

      expect(getCache).toHaveBeenCalledWith(`${CACHE_KEYS.HORIZON_DATA}_${mockWalletAddress}`);
      expect(result).toEqual(cachedData);
      expect(console.log).toHaveBeenCalledWith('🚀 Using cached Horizon data');
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should fetch fresh data when cache is empty', async () => {
      const { getCache, setCache } = require('../cacheManager');
      const { CACHE_KEYS } = require('../types/cache');
      
      getCache.mockResolvedValue(null);

      // Mock successful API responses
      const mockPaymentsResponse = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD5TEST1',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
              type: 'payment',
            },
            {
              id: 'payment2',
              amount: '50',
              asset_type: 'credit_alphanum4',
              asset_code: 'USD',
              from: 'GD5TEST2',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
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
              operation_count: 1,
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              successful: true,
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPaymentsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTransactionsResponse),
        });

      const result = await collectTransactionData(mockWalletAddress);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(setCache).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalVolume).toBe(105); // 100 + 5 (USD converted at 0.1 rate)
      expect(result.metrics.uniqueCounterparties).toBe(2);
      expect(result.metrics.assetDiversity).toBe(2); // XLM and USD
      expect(result.dataPoints.payments).toBe(2);
      expect(result.dataPoints.transactions).toBe(1);
    });

    test('should handle API errors gracefully', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);
      fetch.mockRejectedValue(new Error('Network error'));

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.metrics).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Data collection failed:', expect.any(Error));
    });

    test('should handle empty API responses', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      const mockEmptyResponse = {
        _embedded: {
          records: [],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmptyResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEmptyResponse),
        });

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.success).toBe(true);
      expect(result.metrics.totalVolume).toBe(0);
      expect(result.metrics.uniqueCounterparties).toBe(0);
      expect(result.metrics.assetDiversity).toBe(0);
      expect(result.metrics.nightDayRatio).toBe(0);
    });

    test('should handle paginated responses', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      // Mock first page
      const mockFirstPage = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD5TEST1',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: {
            href: 'https://horizon-testnet.stellar.org/accounts/GD.../payments?cursor=123',
          },
        },
      };

      // Mock second page
      const mockSecondPage = {
        _embedded: {
          records: [
            {
              id: 'payment2',
              amount: '50',
              asset_type: 'native',
              asset_code: 'XLM',
              from: 'GD5TEST2',
              to: mockWalletAddress,
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFirstPage),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSecondPage),
        })
        // Mock transactions response
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData(mockWalletAddress);

      expect(fetch).toHaveBeenCalledTimes(3); // 2 for payments (paginated), 1 for transactions
      expect(result.metrics.totalVolume).toBe(150);
      expect(result.dataPoints.payments).toBe(2);
    });

    test('should filter transactions outside date range', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      const mockOldPayment = {
        id: 'old_payment',
        amount: '1000',
        asset_type: 'native',
        asset_code: 'XLM',
        from: 'GD5OLD',
        to: mockWalletAddress,
        created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
        type: 'payment',
      };

      const mockRecentPayment = {
        id: 'recent_payment',
        amount: '100',
        asset_type: 'native',
        asset_code: 'XLM',
        from: 'GD5RECENT',
        to: mockWalletAddress,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        type: 'payment',
      };

      const mockResponse = {
        _embedded: {
          records: [mockOldPayment, mockRecentPayment],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.metrics.totalVolume).toBe(100); // Only recent payment
      expect(result.dataPoints.payments).toBe(1);
    });

    test('should calculate night/day ratio correctly', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      const nightPayment = {
        id: 'night_payment',
        amount: '50',
        asset_type: 'native',
        asset_code: 'XLM',
        from: 'GD5NIGHT',
        to: mockWalletAddress,
        created_at: new Date().setHours(23, 0, 0, 0), // 11 PM
        type: 'payment',
      };

      const dayPayment = {
        id: 'day_payment',
        amount: '50',
        asset_type: 'native',
        asset_code: 'XLM',
        from: 'GD5DAY',
        to: mockWalletAddress,
        created_at: new Date().setHours(14, 0, 0, 0), // 2 PM
        type: 'payment',
      };

      const mockResponse = {
        _embedded: {
          records: [nightPayment, dayPayment],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData(mockWalletAddress);

      expect(result.metrics.nightDayRatio).toBe(1); // 1 night / 1 day = 1
    });
  });

  describe('isDataFresh', () => {
    test('should return true for fresh data', () => {
      const freshTimestamp = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      expect(isDataFresh(freshTimestamp)).toBe(true);
    });

    test('should return false for stale data', () => {
      const staleTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      expect(isDataFresh(staleTimestamp)).toBe(false);
    });

    test('should return false for null timestamp', () => {
      expect(isDataFresh(null)).toBe(false);
    });

    test('should return false for undefined timestamp', () => {
      expect(isDataFresh(undefined)).toBe(false);
    });

    test('should handle edge case exactly at 1 hour', () => {
      const edgeTimestamp = Date.now() - 60 * 60 * 1000; // Exactly 1 hour ago
      expect(isDataFresh(edgeTimestamp)).toBe(false);
    });
  });

  describe('getCachedAnalysis', () => {
    const mockWalletAddress = 'GD5TESTEXAMPLE';

    test('should return cached data when fresh', () => {
      const freshData = {
        success: true,
        metrics: { totalVolume: 1000 },
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      };

      localStorage.setItem(
        `horizon_analysis_${mockWalletAddress}`,
        JSON.stringify(freshData)
      );

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toEqual(freshData);
    });

    test('should return null for stale data', () => {
      const staleData = {
        success: true,
        metrics: { totalVolume: 1000 },
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      localStorage.setItem(
        `horizon_analysis_${mockWalletAddress}`,
        JSON.stringify(staleData)
      );

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toBeNull();
    });

    test('should return null when no cached data exists', () => {
      const result = getCachedAnalysis(mockWalletAddress);
      expect(result).toBeNull();
    });

    test('should handle corrupted cache data', () => {
      localStorage.setItem(
        `horizon_analysis_${mockWalletAddress}`,
        'invalid json'
      );

      const result = getCachedAnalysis(mockWalletAddress);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error reading cached analysis:',
        expect.any(Error)
      );
    });
  });

  describe('cacheAnalysis', () => {
    const mockWalletAddress = 'GD5TESTEXAMPLE';
    const mockAnalysisData = {
      success: true,
      metrics: { totalVolume: 1000 },
      timestamp: Date.now(),
    };

    test('should cache analysis data successfully', () => {
      cacheAnalysis(mockWalletAddress, mockAnalysisData);

      const cachedData = localStorage.getItem(
        `horizon_analysis_${mockWalletAddress}`
      );

      expect(cachedData).toBe(JSON.stringify(mockAnalysisData));
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      cacheAnalysis(mockWalletAddress, mockAnalysisData);

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error caching analysis:',
        expect.any(Error)
      );

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Risk Metrics Calculation', () => {
    test('should convert non-XLM assets at simplified rate', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      const mockResponse = {
        _embedded: {
          records: [
            {
              id: 'usd_payment',
              amount: '100',
              asset_type: 'credit_alphanum4',
              asset_code: 'USD',
              from: 'GD5TEST',
              to: 'GD5WALLET',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData('GD5WALLET');

      expect(result.metrics.totalVolume).toBe(10); // 100 USD * 0.1 conversion rate
    });

    test('should handle native XLM assets correctly', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      const mockResponse = {
        _embedded: {
          records: [
            {
              id: 'xlm_payment',
              amount: '100',
              asset_type: 'native',
              from: 'GD5TEST',
              to: 'GD5WALLET',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: null,
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData('GD5WALLET');

      expect(result.metrics.totalVolume).toBe(100); // 100 XLM (no conversion)
    });
  });

  describe('Error Handling', () => {
    test('should handle fetch errors with warning', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      fetch.mockRejectedValue(new Error('Network error'));

      await collectTransactionData('GD5TEST');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Data collection failed:',
        expect.any(Error)
      );
    });

    test('should handle malformed API responses', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const result = await collectTransactionData('GD5TEST');

      expect(result.success).toBe(true);
      expect(result.metrics.totalVolume).toBe(0);
    });

    test('should handle pagination errors gracefully', async () => {
      const { getCache } = require('../cacheManager');
      
      getCache.mockResolvedValue(null);

      // First page succeeds
      const mockFirstPage = {
        _embedded: {
          records: [
            {
              id: 'payment1',
              amount: '100',
              asset_type: 'native',
              from: 'GD5TEST',
              to: 'GD5WALLET',
              created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              type: 'payment',
            },
          ],
        },
        _links: {
          next: {
            href: 'https://horizon-testnet.stellar.org/accounts/GD.../payments?cursor=123',
          },
        },
      };

      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockFirstPage),
        })
        // Second page fails
        .mockRejectedValueOnce(new Error('Pagination error'))
        // Transactions succeed
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _embedded: { records: [] },
            _links: { next: null },
          }),
        });

      const result = await collectTransactionData('GD5WALLET');

      expect(result.metrics.totalVolume).toBe(100); // Should still get first page data
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error fetching payments page:',
        expect.any(Error)
      );
    });
  });
});
