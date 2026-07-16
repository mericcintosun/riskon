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

  // The tier cards are informational now. They used to be clickable with an
  // onTierSelect callback + a Tier-3 confirmation modal, but the only mount never
  // passed onTierSelect, so every click was inert. These tests assert the honest
  // behaviour: the cards show tier status and nothing pretends to be actionable.

  test('shows which tiers a low score can access, without an interactive modal', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={25} />);

    expect(screen.getByText('TIER-1')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
    // TIER-2 and TIER-3 are restricted at score 25.
    expect(screen.getAllByText('Restricted').length).toBeGreaterThan(0);
    // No confirmation modal exists anymore.
    expect(screen.queryByText('High-Risk Tier Acknowledgment')).not.toBeInTheDocument();
  });

  test('a high score unlocks the high-risk tier as a status, not a clickable action', () => {
    render(<UserRiskProfile walletAddress="GABC123..." riskScore={85} />);

    expect(screen.getByText('TIER-3')).toBeInTheDocument();
    expect(screen.getByText('High-Risk Tier')).toBeInTheDocument();
    // Clicking must not open a modal — there is no interactive tier selection.
    const tier3Card = screen.getByText('TIER-3').closest('div');
    fireEvent.click(tier3Card);
    expect(screen.queryByText('Acknowledge & Proceed')).not.toBeInTheDocument();
  });
});
