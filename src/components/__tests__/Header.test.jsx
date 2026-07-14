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

jest.mock('../contexts/WalletContext', () => ({
  useWallet: () => mockWalletContext,
}));

jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});

describe('Header', () => {
  beforeEach(() => {
    mockWalletContext.walletAddress = null;
    mockWalletContext.isLoading = false;
    mockWalletContext.connectWallet.mockResolvedValue({ success: true });
    mockWalletContext.disconnectWallet.mockResolvedValue({ success: true });
  });

  test('should handle wallet connection failures', async () => {
    mockWalletContext.connectWallet.mockRejectedValue(new Error('Network error: Unable to reach wallet service'));

    render(<Header />);

    fireEvent.click(screen.getByText('Connect Wallet'));

    expect(mockWalletContext.connectWallet).toHaveBeenCalled();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  test('should show loading state during connection', () => {
    mockWalletContext.isLoading = true;

    render(<Header />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled();
  });

  test('should handle mobile menu toggle', () => {
    render(<Header />);

    const mobileMenuButton = screen.getByLabelText('Toggle mobile menu');
    fireEvent.click(mobileMenuButton);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
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
