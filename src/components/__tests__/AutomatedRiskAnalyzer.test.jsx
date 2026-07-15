/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AutomatedRiskAnalyzer from '../AutomatedRiskAnalyzer';

// Mock all the dependencies
jest.mock('../../lib/horizonDataCollector', () => ({
  collectTransactionData: jest.fn(),
  getCachedAnalysis: jest.fn(),
  cacheAnalysis: jest.fn(),
}));

jest.mock('../../lib/lightweightRiskModel', () => ({
  calculateRiskScore: jest.fn(),
  getDataQualityScore: jest.fn(),
}));

jest.mock('../../lib/rateLimiter', () => ({
  checkRateLimit: jest.fn(),
  recordUpdate: jest.fn(),
  formatRemainingTime: jest.fn((ms) => '2h 30m'),
}));

// The on-chain write now goes through the server-side risk oracle
// (POST /api/risk/attest) instead of a browser-signed transaction, so the
// component's network call is what we stub.
const mockAttestResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const okAttestation = (overrides = {}) => ({
  success: true,
  data: {
    address: 'GTEST123456789',
    score: 25,
    tier: 'TIER_1',
    chosenTier: 'TIER_1',
    hash: '0x123456789abcdef',
    attestedBy: 'GORACLE123',
    ...overrides,
  },
});

jest.mock('../../contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

// Captures the real onScoreImpactChange callback the component passes down, so a
// test can simulate BlendHistoryPerformance reporting a score impact.
const mockBlendImpactRef = { current: null };

// Mock child components
jest.mock('../BlendHistoryPerformance.jsx', () => {
  return function MockBlendHistoryPerformance({ onScoreImpactChange }) {
    mockBlendImpactRef.current = onScoreImpactChange;
    return <div data-testid="blend-history-performance">Mock Blend History</div>;
  };
});

jest.mock('../BlendDashboard.jsx', () => {
  return function MockBlendDashboard({ kit, walletAddress, riskScore }) {
    return (
      <div data-testid="blend-dashboard">
        Mock Blend Dashboard - Score: {riskScore}
      </div>
    );
  };
});

describe('AutomatedRiskAnalyzer Component', () => {
  const mockWalletAddress = 'GD5TESTEXAMPLEADDRESS123456789';
  const mockKit = { signTransaction: jest.fn() };

  const mockToast = {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    dismiss: jest.fn(),
  };

  // The component mutates the object returned by calculateRiskScore (it reassigns
  // riskScore and unshifts into explanation when a blend impact applies), so a
  // fresh object must be produced per call — otherwise mutations leak across tests.
  const createMockRiskAnalysis = () => ({
    riskScore: 25,
    tier: 'TIER_1',
    confidence: 0.85,
    featureImportance: {
      totalVolume: { weight: -0.15, normalizedValue: 0.8, impact: -0.12, rawValue: 5000, isPositive: true },
      uniqueCounterparties: { weight: -0.25, normalizedValue: 0.5, impact: -0.125, rawValue: 12, isPositive: true },
      assetDiversity: { weight: -0.2, normalizedValue: 0.4, impact: -0.08, rawValue: 4, isPositive: true },
      nightDayRatio: { weight: 0.35, normalizedValue: 0.2, impact: 0.07, rawValue: 0.3, isPositive: false },
    },
    explanation: ['🟢 Low Risk - Premium pool access', '✅ High transaction volume increases trust'],
    recommendations: ['🎉 Excellent! Your risk profile is in great condition'],
    rawMetrics: {
      totalVolume: 5000,
      // Deliberately different from riskScore (25) so that queries for the
      // rendered risk score stay unambiguous.
      uniqueCounterparties: 12,
      assetDiversity: 4,
      nightDayRatio: 0.3,
    },
    normalizedFeatures: {
      totalVolume: 0.8,
      uniqueCounterparties: 0.5,
      assetDiversity: 0.4,
      nightDayRatio: 0.2,
    },
    modelVersion: '1.0.0',
  });

  // Reference copy for feeding mocks / expected values (never handed to the component).
  const mockRiskAnalysis = createMockRiskAnalysis();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    const { useWallet } = require('../../contexts/WalletContext');
    const { useToast } = require('../../contexts/ToastContext');
    const { collectTransactionData, getCachedAnalysis } = require('../../lib/horizonDataCollector');
    const { calculateRiskScore, getDataQualityScore } = require('../../lib/lightweightRiskModel');
    const { checkRateLimit } = require('../../lib/rateLimiter');

    useWallet.mockReturnValue({
      walletAddress: mockWalletAddress,
      kit: mockKit,
    });

    // The component destructures `const { toast } = useToast()`, matching the
    // real ToastContext value shape ({ toast, ... }).
    useToast.mockReturnValue({ toast: mockToast });

    collectTransactionData.mockResolvedValue({
      success: true,
      metrics: mockRiskAnalysis.rawMetrics,
      dataPoints: { payments: 50, transactions: 45, period: 30 },
      timestamp: Date.now(),
    });

    getCachedAnalysis.mockReturnValue(null);

    calculateRiskScore.mockImplementation(() => createMockRiskAnalysis());

    getDataQualityScore.mockReturnValue({
      score: 100,
      isGood: true,
      needsMoreData: false,
    });

    checkRateLimit.mockResolvedValue({
      canUpdate: true,
      remainingTime: 0,
    });

    // csrfFetch echoes the middleware's double-submit cookie back as a header;
    // seeding the cookie keeps it from having to prime one with an extra GET.
    document.cookie = 'riskon-csrf-token=test-csrf-token';

    // Default: the oracle attests successfully.
    global.fetch = jest.fn().mockResolvedValue(
      mockAttestResponse(okAttestation())
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    test('should show connect wallet message when no wallet connected', () => {
      const { useWallet } = require('../../contexts/WalletContext');
      useWallet.mockReturnValue({ walletAddress: null, kit: null });

      render(<AutomatedRiskAnalyzer />);

      expect(screen.getByText('Automated Risk Analysis')).toBeInTheDocument();
      expect(screen.getByText('Connect your wallet to use AI-powered risk analysis')).toBeInTheDocument();
      expect(screen.getByText(/We'll analyze your transaction data from the last 30 days/)).toBeInTheDocument();
    });

    test('should show risk score gauge when wallet is connected', () => {
      render(<AutomatedRiskAnalyzer />);

      // The gauge is deliberately labelled "Activity Percentile", not "Risk
      // Score": it is calibrated against real Stellar wallets, so it reports
      // where this wallet sits in that population — not a default probability.
      expect(screen.getByText('Activity Percentile')).toBeInTheDocument();
      expect(screen.getByText('--')).toBeInTheDocument(); // Initial score display
      expect(screen.getByRole('button', { name: /🧠 Start Analysis/ })).toBeInTheDocument();
    });

    test('should load cached analysis on mount', () => {
      const { getCachedAnalysis } = require('../../lib/horizonDataCollector');
      const cachedData = {
        success: true,
        metrics: mockRiskAnalysis.rawMetrics,
        riskAnalysis: mockRiskAnalysis,
        timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      };

      getCachedAnalysis.mockReturnValue(cachedData);

      render(<AutomatedRiskAnalyzer />);

      expect(getCachedAnalysis).toHaveBeenCalledWith(mockWalletAddress);
      expect(screen.getByText('25')).toBeInTheDocument(); // Cached risk score
    });
  });

  describe('Risk Analysis Flow', () => {
    test('should run complete analysis when start button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      expect(mockToast.loading).toHaveBeenCalledWith('📊 Analyzing transaction data from last 30 days...');
      expect(mockToast.dismiss).toHaveBeenCalled();
      expect(mockToast.loading).toHaveBeenCalledWith('🧠 Calculating risk score with AI model...');
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('✅ Risk analysis completed!', { duration: 4000 });
      });

      expect(screen.getByText('25')).toBeInTheDocument(); // Risk score
      expect(screen.getByText('Tier-1: Safe')).toBeInTheDocument();
    });

    test('should handle analysis errors gracefully', async () => {
      const user = userEvent.setup();
      const { collectTransactionData } = require('../../lib/horizonDataCollector');
      
      collectTransactionData.mockResolvedValue({
        success: false,
        error: 'API Error',
        metrics: null,
      });

      render(<AutomatedRiskAnalyzer />);

      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('❌ Analysis error: API Error');
      });
    });

    test('should show data quality warning when needed', async () => {
      const user = userEvent.setup();
      const { getDataQualityScore } = require('../../lib/lightweightRiskModel');
      
      getDataQualityScore.mockReturnValue({
        score: 50,
        isGood: false,
        needsMoreData: true,
      });

      render(<AutomatedRiskAnalyzer />);

      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      // The warning is emitted from a setTimeout(..., 1000), so allow more than
      // waitFor's default 1000ms timeout.
      await waitFor(
        () => {
          expect(mockToast.warning).toHaveBeenCalledWith(
            '⚠️ More transaction history needed for better analysis',
            { duration: 6000 }
          );
        },
        { timeout: 3000 }
      );
    });

    test('should apply blend score impact when available', async () => {
      const user = userEvent.setup();

      render(<AutomatedRiskAnalyzer />);

      // Simulate BlendHistoryPerformance reporting a -5 score impact. This must
      // land before the analysis runs, since runAutomatedAnalysis reads the
      // blendScoreImpact state when computing the final score.
      await act(async () => {
        mockBlendImpactRef.current({ totalChange: -5 });
      });

      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument(); // 25 - 5 = 20
      });
    });
  });

  describe('Blockchain Update Flow', () => {
    test('should update risk score on blockchain when button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // First run analysis
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Then request an on-chain attestation from the oracle
      const updateButton = screen.getByRole('button', { name: /🔗 Update Score/ });
      await user.click(updateButton);

      // The browser must not submit a score itself — it asks the oracle.
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/risk/attest',
          expect.objectContaining({ method: 'POST' })
        );
      });

      const attestCall = global.fetch.mock.calls.find(
        ([url]) => url === '/api/risk/attest'
      );

      // The CSRF token from the middleware's cookie must be echoed back.
      expect(attestCall[1].headers['x-csrf-token']).toBe('test-csrf-token');

      // The wallet address is sent; the score is NOT trusted from the client.
      const sentBody = JSON.parse(attestCall[1].body);
      expect(sentBody.address).toBe(mockWalletAddress);
      expect(sentBody).not.toHaveProperty('score');

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          '✅ Risk score attested on-chain by the oracle!'
        );
      });

      // The transaction toast is emitted from a setTimeout(..., 1000), so allow
      // more than waitFor's default 1000ms timeout.
      await waitFor(
        () => {
          expect(mockToast.info).toHaveBeenCalledWith('🔗 Transaction: 0x123456...', { duration: 5000 });
        },
        { timeout: 3000 }
      );
    });

    test('should handle rate limiting', async () => {
      const user = userEvent.setup();
      const { checkRateLimit } = require('../../lib/rateLimiter');
      
      checkRateLimit.mockReturnValue({
        canUpdate: false,
        remainingTime: 2 * 60 * 60 * 1000, // 2 hours
      });

      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Try to update - should be rate limited
      const updateButton = screen.getByRole('button', { name: /⏰ 2h 30m/ });
      expect(updateButton).toBeDisabled();
    });

    test('should surface oracle attestation failures', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn().mockResolvedValue(
        mockAttestResponse(
          { success: false, error: 'Contract simulation failed', code: 'SIMULATION_FAILED' },
          false,
          502
        )
      );

      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Try to update
      const updateButton = screen.getByRole('button', { name: /🔗 Update Score/ });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Contract simulation failed')
        );
      });
    });

    test('should surface the server-enforced 24h rate limit', async () => {
      const user = userEvent.setup();

      // The authoritative limit lives on the server (read from the contract's
      // own timestamp), so the client must handle a 429.
      global.fetch = jest.fn().mockResolvedValue(
        mockAttestResponse(
          {
            success: false,
            error: 'This wallet was already scored in the last 24 hours.',
            code: 'RATE_LIMITED',
          },
          false,
          429
        )
      );

      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Try to update
      const updateButton = screen.getByRole('button', { name: /🔗 Update Score/ });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith(
          '⏰ This wallet was already scored in the last 24 hours'
        );
      });
    });
  });

  describe('UI Interactions', () => {
    test('should toggle feature details visibility', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Toggle details
      const showDetailsButton = screen.getByRole('button', { name: 'Show Details' });
      await user.click(showDetailsButton);

      // The toggle renders "Show Details" -> "Hide".
      expect(screen.getByText('Hide')).toBeInTheDocument();
      expect(screen.getByText('🟢 Low Risk - Premium pool access')).toBeInTheDocument();
      expect(screen.getByText('✅ High transaction volume increases trust')).toBeInTheDocument();

      // Hide details
      await user.click(screen.getByRole('button', { name: 'Hide' }));
      expect(screen.getByRole('button', { name: 'Show Details' })).toBeInTheDocument();
    });

    test('should toggle recommendations visibility', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Toggle recommendations
      const showRecommendationsButton = screen.getByRole('button', { name: 'Show' });
      await user.click(showRecommendationsButton);

      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
      expect(screen.getByText('🎉 Excellent! Your risk profile is in great condition')).toBeInTheDocument();
    });

    test('should allow re-analysis', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // First analysis
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Re-analyze
      const reanalyzeButton = screen.getByRole('button', { name: /🔄 Re-analyze/ });
      await user.click(reanalyzeButton);

      // Each analysis run emits two loading toasts ("Analyzing..." then
      // "Calculating..."), so two runs produce four.
      expect(mockToast.loading).toHaveBeenCalledTimes(4);
      expect(mockToast.loading).toHaveBeenCalledWith('📊 Analyzing transaction data from last 30 days...');
      expect(mockToast.loading).toHaveBeenCalledWith('🧠 Calculating risk score with AI model...');
    });
  });

  describe('Feature Display', () => {
    test('should display feature breakdown correctly', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Check feature display
      expect(screen.getByText('💰')).toBeInTheDocument();
      expect(screen.getByText('5000 XLM')).toBeInTheDocument();
      expect(screen.getByText('🤝')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // uniqueCounterparties
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('🌙')).toBeInTheDocument();
      expect(screen.getByText('0.3')).toBeInTheDocument();
    });

    test('should show tier badge correctly', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Tier-1: Safe')).toBeInTheDocument();
      });

      const tierBadge = screen.getByText('Tier-1: Safe').closest('span');
      expect(tierBadge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
    });
  });

  describe('Child Components', () => {
    test('should render Blend components when wallet is connected', async () => {
      const user = userEvent.setup();
      
      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      expect(screen.getByTestId('blend-history-performance')).toBeInTheDocument();
      expect(screen.getByTestId('blend-dashboard')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View pool ratings/ })).toHaveAttribute(
        'href',
        '/pools'
      );
    });

    test('should not render Blend components without analysis', () => {
      render(<AutomatedRiskAnalyzer />);

      expect(screen.queryByTestId('blend-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /View pool ratings/ })).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('should show loading state during analysis', async () => {
      const user = userEvent.setup();
      const { collectTransactionData } = require('../../lib/horizonDataCollector');
      
      // Make the collection take longer
      collectTransactionData.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          success: true,
          metrics: mockRiskAnalysis.rawMetrics,
          dataPoints: { payments: 50, transactions: 45, period: 30 },
          timestamp: Date.now(),
        }), 100);
      }));

      render(<AutomatedRiskAnalyzer />);

      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      expect(startButton).toBeDisabled();
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    test('should show loading state during blockchain update', async () => {
      const user = userEvent.setup();

      // Make the oracle attestation take longer
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve(mockAttestResponse(okAttestation())),
              100
            );
          })
      );

      render(<AutomatedRiskAnalyzer />);

      // Run analysis first
      const startButton = screen.getByRole('button', { name: /🧠 Start Analysis/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Try to update
      const updateButton = screen.getByRole('button', { name: /🔗 Update Score/ });
      await user.click(updateButton);

      expect(updateButton).toBeDisabled();
      expect(screen.getByText('Saving to Blockchain...')).toBeInTheDocument();
    });
  });
});
