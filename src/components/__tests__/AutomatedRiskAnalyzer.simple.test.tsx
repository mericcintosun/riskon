/**
 * Simplified Component Tests for AutomatedRiskAnalyzer
 * Tests the React component with basic mocking
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

// Mock contexts
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToast: () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      loading: jest.fn(),
      dismiss: jest.fn(),
    },
  }),
}));

jest.mock('../../contexts/WalletContext', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useWallet: () => ({
    walletAddress: null,
    kit: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: false,
  }),
}));

// Mock child components
jest.mock('../BlendHistoryPerformance', () => {
  return function MockBlendHistoryPerformance() {
    return <div data-testid="blend-history-performance">Blend History Performance</div>;
  };
});

jest.mock('../BlendDashboard', () => {
  return function MockBlendDashboard() {
    return <div data-testid="blend-dashboard">Blend Dashboard</div>;
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

describe('AutomatedRiskAnalyzer Component (Simplified)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render wallet connection prompt when no wallet is connected', () => {
    render(<AutomatedRiskAnalyzer />);

    expect(screen.getByText('Automated Risk Analysis')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet to use AI-powered risk analysis')).toBeInTheDocument();
    expect(screen.getByText('We\'ll analyze your transaction data from last 30 days')).toBeInTheDocument();
  });

  it('should render risk score gauge', () => {
    render(<AutomatedRiskAnalyzer />);

    expect(screen.getByText('Risk Score')).toBeInTheDocument();
  });

  it('should have proper structure and accessibility', () => {
    const { container } = render(<AutomatedRiskAnalyzer />);

    // Should have main container
    expect(container.firstChild).toBeInTheDocument();
    
    // Should have text content
    expect(screen.getByText('Automated Risk Analysis')).toBeInTheDocument();
  });

  it('should handle missing dependencies gracefully', () => {
    // This test ensures the component doesn't crash when dependencies are missing
    expect(() => render(<AutomatedRiskAnalyzer />)).not.toThrow();
  });
});
