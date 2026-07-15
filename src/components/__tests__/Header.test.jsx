import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Header from '../Header';

// Mock WalletContext
const mockWalletContext = {
  walletAddress: null,
  isLoading: false,
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  walletName: null,
};

jest.mock('../../contexts/WalletContext', () => ({
  useWallet: () => mockWalletContext,
}));

jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

// NOTE: Header is responsive and renders BOTH a desktop and a mobile variant of
// the wallet button and the nav links, so the queries below use the *AllBy*
// variants (getByText throws "Found multiple elements" here).

describe('Header', () => {
  beforeEach(() => {
    mockWalletContext.walletAddress = null;
    mockWalletContext.isLoading = false;
    mockWalletContext.connectWallet
      .mockReset()
      .mockResolvedValue({ success: true });
    mockWalletContext.disconnectWallet
      .mockReset()
      .mockResolvedValue({ success: true });
  });

  test('should handle wallet connection failures', () => {
    mockWalletContext.connectWallet.mockRejectedValue(
      new Error('Network error: Unable to reach wallet service')
    );

    render(<Header />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    expect(connectButtons.length).toBeGreaterThan(0);

    fireEvent.click(connectButtons[0]);

    expect(mockWalletContext.connectWallet).toHaveBeenCalled();
    // The button stays rendered after a failed connection attempt.
    expect(screen.getAllByText('Connect Wallet')[0]).toBeInTheDocument();
  });

  test('should show loading state during connection', () => {
    mockWalletContext.isLoading = true;

    render(<Header />);

    expect(screen.getAllByText('Connecting...').length).toBeGreaterThan(0);

    const connectingButtons = screen.getAllByRole('button', {
      name: /connecting/i,
    });
    expect(connectingButtons.length).toBeGreaterThan(0);
    connectingButtons.forEach((button) => expect(button).toBeDisabled());
  });

  test('should handle mobile menu toggle', () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton);

    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Features').length).toBeGreaterThan(0);
  });

  test('should prevent body scroll when mobile menu is open', () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');

    fireEvent.click(mobileMenuButton);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(mobileMenuButton);
    expect(document.body.style.overflow).toBe('unset');
  });
});
