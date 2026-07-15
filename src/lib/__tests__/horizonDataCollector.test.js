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
jest.mock('../../types/cache', () => ({
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
    // clearAllMocks only clears call data, not implementations / mockResolvedValueOnce
    // queues, so fully reset fetch to avoid mock state leaking between tests.
    fetch.mockReset();
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
      const { CACHE_KEYS } = require('../../types/cache');
      
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
      const { CACHE_KEYS } = require('../../types/cache');
      
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

      // Fetch failures are caught per-page inside fetchPayments/fetchTransactions,
      // so collection degrades gracefully: it still succeeds with zeroed metrics
      // and logs a warning (rather than throwing to the top-level catch).
      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalVolume).toBe(0);
      expect(result.metrics.uniqueCounterparties).toBe(0);
      expect(console.warn).toHaveBeenCalledWith('⚠️ Error fetching payments page:', expect.any(Error));
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
      expect(result.metrics.nightDayRatio).toBeUndefined();
    });

    test('should handle paginated responses', async () => {
      const { getCache } = require('../cacheManager');

      getCache.mockResolvedValue(null);

      // The collector only requests a next page when a full page (200 records)
      // is returned, so page 1 must be full to exercise pagination.
      const firstPageRecords = Array.from({ length: 200 }, (_, i) => ({
        id: `payment_p1_${i}`,
        amount: '1',
        asset_type: 'native',
        asset_code: 'XLM',
        from: `GD5FROM${i}`,
        to: mockWalletAddress,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'payment',
      }));

      const mockFirstPage = {
        _embedded: { records: firstPageRecords },
        _links: {
          next: {
            href: 'https://horizon-testnet.stellar.org/accounts/GD.../payments?cursor=123',
          },
        },
      };

      const mockSecondPage = {
        _embedded: {
          records: [
            {
              id: 'payment_p2',
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
        _links: { next: null },
      };

      const emptyTransactions = {
        _embedded: { records: [] },
        _links: { next: null },
      };

      // URL-aware mock: robust against Promise.all interleaving between the
      // concurrent payments/transactions fetches.
      fetch.mockImplementation((url) => {
        if (url.includes('/payments')) {
          const page = url.includes('cursor=') ? mockSecondPage : mockFirstPage;
          return Promise.resolve({ ok: true, json: () => Promise.resolve(page) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyTransactions) });
      });

      const result = await collectTransactionData(mockWalletAddress);

      expect(fetch).toHaveBeenCalledTimes(3); // 2 for payments (paginated), 1 for transactions
      expect(result.metrics.totalVolume).toBe(250); // 200 * 1 + 50
      expect(result.dataPoints.payments).toBe(201);
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

      // Horizon is queried with order=desc, so records arrive newest-first.
      // The collector stops as soon as it sees a record older than the range.
      const mockResponse = {
        _embedded: {
          records: [mockRecentPayment, mockOldPayment],
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

    test('refuses to ask Horizon about a smart wallet instead of 400ing twice', async () => {
      const { getCache } = require('../cacheManager');
      getCache.mockResolvedValue(null);
      global.fetch = jest.fn();

      // Horizon's /accounts endpoints are ed25519-only and answer 400 for a
      // contract address. This used to fire two guaranteed-400 requests per
      // analysis and paint the console red.
      const result = await collectTransactionData(
        'CB5R46H4YMSP7YGXDEBIX7C6DI5ENIFDXV6EJ34UTGPTO56VVZWP4PGF'
      );

      expect(result.unscorable).toBe(true);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/no classic payment history/i);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should return true for fresh data', () => {
      const freshTimestamp = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      expect(isDataFresh(freshTimestamp)).toBe(true);
    });

    test('should return false for stale data', () => {
      const staleTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      expect(isDataFresh(staleTimestamp)).toBe(false);
    });

    test('should return false for null timestamp', () => {
      // isDataFresh short-circuits on a falsy timestamp (returns the falsy value
      // itself), which is treated as "not fresh" by every caller.
      expect(isDataFresh(null)).toBeFalsy();
    });

    test('should return false for undefined timestamp', () => {
      expect(isDataFresh(undefined)).toBeFalsy();
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
      // jsdom ignores instance-level localStorage.setItem overrides, so spy on
      // the Storage prototype to force a write failure.
      const setItemSpy = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage quota exceeded');
        });

      cacheAnalysis(mockWalletAddress, mockAnalysisData);

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error caching analysis:',
        expect.any(Error)
      );

      setItemSpy.mockRestore();
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

      // Errors are caught and warned about per page (payments + transactions),
      // never escalating to the top-level '❌ Data collection failed' error.
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error fetching payments page:',
        expect.any(Error)
      );
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error fetching transactions page:',
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

      // Full first page (200 records) so the collector requests a second page,
      // which then fails — verifying the error is caught while page 1 is kept.
      const firstPageRecords = Array.from({ length: 200 }, (_, i) => ({
        id: `payment_${i}`,
        amount: '0.5',
        asset_type: 'native',
        asset_code: 'XLM',
        from: `GD5FROM${i}`,
        to: 'GD5WALLET',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'payment',
      }));

      const mockFirstPage = {
        _embedded: { records: firstPageRecords },
        _links: {
          next: {
            href: 'https://horizon-testnet.stellar.org/accounts/GD.../payments?cursor=123',
          },
        },
      };

      const emptyTransactions = {
        _embedded: { records: [] },
        _links: { next: null },
      };

      fetch.mockImplementation((url) => {
        if (url.includes('/payments')) {
          if (url.includes('cursor=')) {
            return Promise.reject(new Error('Pagination error')); // page 2 fails
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFirstPage) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(emptyTransactions) });
      });

      const result = await collectTransactionData('GD5WALLET');

      expect(result.metrics.totalVolume).toBe(100); // Should still get first page data (200 * 0.5)
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Error fetching payments page:',
        expect.any(Error)
      );
    });
  });
});
