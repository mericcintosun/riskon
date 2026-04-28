/**
 * Component Tests for AutomatedRiskAnalyzer
 * Tests the React component with proper mocking and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../contexts/ToastContext';
import { WalletProvider } from '../../contexts/WalletContext';
import AutomatedRiskAnalyzer from '../AutomatedRiskAnalyzer';

// Mock the dependencies
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
  formatRemainingTime: jest.fn(),
}));

jest.mock('../../app/lib/writeScore', () => ({
  writeScoreToBlockchainEnhanced: jest.fn(),
}));

jest.mock('../BlendHistoryPerformance', () => {
  return function MockBlendHistoryPerformance({ onScoreImpactChange }: any) {
    React.useEffect(() => {
      onScoreImpactChange({ totalChange: 5 });
    }, [onScoreImpactChange]);
    return <div data-testid="blend-history-performance">Blend History Performance</div>;
  };
});

jest.mock('../BlendDashboard', () => {
  return function MockBlendDashboard({ kit, walletAddress, riskScore }: any) {
    return (
      <div data-testid="blend-dashboard">
        Blend Dashboard - Score: {riskScore}
      </div>
    );
  };
});

jest.mock('../EnhancedLiquidityPools', () => {
  return function MockEnhancedLiquidityPools() {
    return <div data-testid="enhanced-liquidity-pools">Enhanced Liquidity Pools</div>;
  };
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Import the mocked modules
import { collectTransactionData, getCachedAnalysis } from '../../lib/horizonDataCollector';
import { calculateRiskScore, getDataQualityScore } from '../../lib/lightweightRiskModel';
import { checkRateLimit, recordUpdate, formatRemainingTime } from '../../lib/rateLimiter';
import { writeScoreToBlockchainEnhanced } from '../../app/lib/writeScore';

const mockCollectTransactionData = collectTransactionData as jest.MockedFunction<typeof collectTransactionData>;
const mockGetCachedAnalysis = getCachedAnalysis as jest.MockedFunction<typeof getCachedAnalysis>;
const mockCalculateRiskScore = calculateRiskScore as jest.MockedFunction<typeof calculateRiskScore>;
const mockGetDataQualityScore = getDataQualityScore as jest.MockedFunction<typeof getDataQualityScore>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockRecordUpdate = recordUpdate as jest.MockedFunction<typeof recordUpdate>;
const mockFormatRemainingTime = formatRemainingTime as jest.MockedFunction<typeof formatRemainingTime>;
const mockWriteScoreToBlockchainEnhanced = writeScoreToBlockchainEnhanced as jest.MockedFunction<typeof writeScoreToBlockchainEnhanced>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <WalletProvider>
      {children}
    </WalletProvider>
  </ToastProvider>
);

describe('AutomatedRiskAnalyzer Component', () => {
  const mockWalletAddress = 'GD5YQPYKFQCTJ5GP5N2R3C4T2YF6L5M2W2Q4Z3X2Y5R6P7E8T9W0Q1';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockCollectTransactionData.mockResolvedValue({
      success: true,
      metrics: {
        totalVolume: 1000,
        uniqueCounterparties: 10,
        assetDiversity: 3,
        nightDayRatio: 0.5,
        totalPayments: 25,
        totalTransactions: 30,
        averageTransactionSize: 40,
      },
      dataPoints: {
        payments: 25,
        transactions: 30,
        period: 30,
      },
      timestamp: Date.now(),
    });

    mockCalculateRiskScore.mockReturnValue({
      riskScore: 35,
      tier: 'TIER_2',
      confidence: 85,
      featureImportance: {
        totalVolume: { weight: 0.15, normalizedValue: 0.5, impact: 0.075, rawValue: 1000, isPositive: true },
        uniqueCounterparties: { weight: 0.25, normalizedValue: 0.8, impact: 0.2, rawValue: 10, isPositive: true },
        assetDiversity: { weight: 0.2, normalizedValue: 0.6, impact: 0.12, rawValue: 3, isPositive: true },
        nightDayRatio: { weight: 0.35, normalizedValue: 0.4, impact: 0.14, rawValue: 0.5, isPositive: false },
      },
      explanation: ['🟡 Medium Risk - Standard pool access', '✅ High transaction volume increases trust', '⚠️ High night activity increases risk'],
      recommendations: ['🎯 Diversify transactions with different assets', '🌞 Make more transactions during daytime hours'],
      rawMetrics: {
        totalVolume: 1000,
        uniqueCounterparties: 10,
        assetDiversity: 3,
        nightDayRatio: 0.5,
      },
      normalizedFeatures: {
        totalVolume: 0.5,
        uniqueCounterparties: 0.8,
        assetDiversity: 0.6,
        nightDayRatio: 0.4,
      },
      modelVersion: '1.0.0',
    });

    mockGetDataQualityScore.mockReturnValue({
      score: 100,
      isGood: true,
      needsMoreData: false,
    });

    mockCheckRateLimit.mockReturnValue({
      canUpdate: true,
      remainingTime: 0,
    });

    mockFormatRemainingTime.mockReturnValue('2h 30m');

    mockWriteScoreToBlockchainEnhanced.mockResolvedValue({
      successful: true,
      hash: 'tx_hash_123',
      method: 'blockchain',
    });

    mockGetCachedAnalysis.mockReturnValue(null);
  });

  it('should render wallet connection prompt when no wallet is connected', () => {
    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    expect(screen.getByText('Automated Risk Analysis')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet to use AI-powered risk analysis')).toBeInTheDocument();
    expect(screen.getByText('We\'ll analyze your transaction data from last 30 days')).toBeInTheDocument();
  });

  it('should render analysis interface when wallet is connected', async () => {
    // Mock wallet context to provide wallet address
    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('🧠 Start Analysis')).toBeInTheDocument();
    });

    expect(screen.getByText('Risk Score')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('should load cached analysis on mount', async () => {
    const mockCachedAnalysis = {
      success: true,
      metrics: {
        totalVolume: 500,
        uniqueCounterparties: 5,
        assetDiversity: 2,
        nightDayRatio: 0.3,
      },
      timestamp: Date.now() - 60000, // 1 minute ago
    };

    mockGetCachedAnalysis.mockReturnValue(mockCachedAnalysis);

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetCachedAnalysis).toHaveBeenCalledWith(mockWalletAddress);
    });

    expect(mockCalculateRiskScore).toHaveBeenCalledWith(mockCachedAnalysis.metrics);
  });

  it('should run automated analysis when button is clicked', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockCollectTransactionData).toHaveBeenCalledWith(mockWalletAddress);
    });

    expect(mockCalculateRiskScore).toHaveBeenCalled();
    expect(mockGetDataQualityScore).toHaveBeenCalled();
    expect(mockCacheAnalysis).toHaveBeenCalled();
  });

  it('should display risk analysis results after analysis', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument(); // Risk score
    });

    expect(screen.getByText('Tier-2: Standard')).toBeInTheDocument();
    expect(screen.getByText('📊 Feature Analysis')).toBeInTheDocument();
    expect(screen.getByText('💡 Improvement Recommendations')).toBeInTheDocument();
  });

  it('should show feature breakdown details', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('📊 Feature Analysis')).toBeInTheDocument();
    });

    const showDetailsButton = screen.getByText('Show Details');
    await user.click(showDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('✅ High transaction volume increases trust')).toBeInTheDocument();
      expect(screen.getByText('⚠️ High night activity increases risk')).toBeInTheDocument();
    });
  });

  it('should show recommendations when requested', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('💡 Improvement Recommendations')).toBeInTheDocument();
    });

    const showRecommendationsButton = screen.getByText('Show');
    await user.click(showRecommendationsButton);

    await waitFor(() => {
      expect(screen.getByText('🎯 Diversify transactions with different assets')).toBeInTheDocument();
      expect(screen.getByText('🌞 Make more transactions during daytime hours')).toBeInTheDocument();
    });
  });

  it('should update risk score on blockchain', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    // First run analysis
    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('🔗 Update Score')).toBeInTheDocument();
    });

    // Then update score on blockchain
    const updateButton = screen.getByText('🔗 Update Score');
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockWriteScoreToBlockchainEnhanced).toHaveBeenCalledWith({
        kit: mockWalletContext.kit,
        address: mockWalletAddress,
        score: 35,
        chosenTier: 'TIER_2',
      });
    });

    expect(mockRecordUpdate).toHaveBeenCalledWith(mockWalletAddress);
  });

  it('should handle rate limiting correctly', async () => {
    const user = userEvent.setup();

    mockCheckRateLimit.mockReturnValue({
      canUpdate: false,
      remainingTime: 9000000, // 2.5 hours in milliseconds
    });

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    // Run analysis first
    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('⏰ 2h 30m')).toBeInTheDocument();
    });

    // Button should be disabled
    const updateButton = screen.getByText('⏰ 2h 30m');
    expect(updateButton).toBeDisabled();
  });

  it('should handle analysis errors gracefully', async () => {
    const user = userEvent.setup();

    mockCollectTransactionData.mockResolvedValue({
      success: false,
      error: 'Network error occurred',
      metrics: undefined,
      dataPoints: {
        payments: 0,
        transactions: 0,
        period: 30,
      },
      timestamp: Date.now(),
    });

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('🔄 Re-analyze')).toBeInTheDocument();
    });

    // Should still show the start analysis button after error
    expect(screen.getByText('🔄 Re-analyze')).toBeInTheDocument();
  });

  it('should display blend impact badge', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('🏦 Blend: +5 points')).toBeInTheDocument();
    });
  });

  it('should show data quality warning when needed', async () => {
    const user = userEvent.setup();

    mockGetDataQualityScore.mockReturnValue({
      score: 25,
      isGood: false,
      needsMoreData: true,
    });

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Data Quality Warning:')).toBeInTheDocument();
      expect(screen.getByText('More transaction history is needed for better analysis')).toBeInTheDocument();
    });
  });

  it('should render blend dashboard and liquidity pools after analysis', async () => {
    const user = userEvent.setup();

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByTestId('blend-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-liquidity-pools')).toBeInTheDocument();
    });

    expect(screen.getByText('🌊 Blend DeFi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('🎯 Risk-Based Liquidity Pools')).toBeInTheDocument();
  });

  it('should handle blockchain update failures', async () => {
    const user = userEvent.setup();

    mockWriteScoreToBlockchainEnhanced.mockResolvedValue({
      successful: false,
      error: 'Transaction failed',
      method: 'local_storage',
    });

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    // Run analysis first
    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('🔗 Update Score')).toBeInTheDocument();
    });

    // Then update score on blockchain
    const updateButton = screen.getByText('🔗 Update Score');
    await user.click(updateButton);

    await waitFor(() => {
      expect(mockWriteScoreToBlockchainEnhanced).toHaveBeenCalled();
    });
  });

  it('should display correct tier colors and badges', async () => {
    const user = userEvent.setup();

    // Test TIER_1 (low risk)
    mockCalculateRiskScore.mockReturnValue({
      ...mockCalculateRiskScore.getMockImplementation()(),
      riskScore: 25,
      tier: 'TIER_1',
    });

    const mockWalletContext = {
      walletAddress: mockWalletAddress,
      kit: { signTransaction: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: true,
    };

    jest.spyOn(React, 'useContext').mockImplementation(() => mockWalletContext);

    render(
      <TestWrapper>
        <AutomatedRiskAnalyzer />
      </TestWrapper>
    );

    const analyzeButton = await screen.findByText('🧠 Start Analysis');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Tier-1: Safe')).toBeInTheDocument();
    });

    // Test TIER_3 (high risk)
    mockCalculateRiskScore.mockReturnValue({
      ...mockCalculateRiskScore.getMockImplementation()(),
      riskScore: 85,
      tier: 'TIER_3',
    });

    const reanalyzeButton = screen.getByText('🔄 Re-analyze');
    await user.click(reanalyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Tier-3: Opportunity / High Risk')).toBeInTheDocument();
    });
  });
});
