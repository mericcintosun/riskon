import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserRiskProfile from '../UserRiskProfile';

describe('UserRiskProfile', () => {
  const mockOnTierSelect = jest.fn();

  beforeEach(() => {
    mockOnTierSelect.mockClear();
  });

  test('should show clear error when score is not calculated', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={null} onTierSelect={mockOnTierSelect} />);

    expect(screen.getByText('Credit score has not been calculated. Please generate your score first.')).toBeInTheDocument();
  });

  test('should help users understand their risk level', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={25} onTierSelect={mockOnTierSelect} />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
    expect(screen.getByText(/strong on-chain history/)).toBeInTheDocument();
  });

  test('should prevent selection of restricted tiers', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={25} onTierSelect={mockOnTierSelect} />);

    const tier2Card = screen.getByText('TIER-2').closest('div');
    fireEvent.click(tier2Card);

    expect(mockOnTierSelect).not.toHaveBeenCalled();
  });

  test('should require confirmation for high-risk tier selection', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={85} onTierSelect={mockOnTierSelect} />);

    const tier3Card = screen.getByText('TIER-3').closest('div');
    fireEvent.click(tier3Card);

    expect(screen.getByText('High-Risk Tier Acknowledgment')).toBeInTheDocument();
    expect(screen.getByText(/low liquidity and high volatility/)).toBeInTheDocument();
  });

  test('should handle high-risk confirmation flow', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={85} onTierSelect={mockOnTierSelect} />);

    const tier3Card = screen.getByText('TIER-3').closest('div');
    fireEvent.click(tier3Card);
    fireEvent.click(screen.getByText('Acknowledge & Proceed'));

    expect(mockOnTierSelect).toHaveBeenCalledWith('TIER_3');
  });
});
