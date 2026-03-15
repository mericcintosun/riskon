/**
 * Accessibility Utilities
 *
 * Provides ARIA labels, keyboard navigation, and screen reader support
 * Related Issue: #13 - Accessibility (a11y) Improvements
 */

/**
 * Generate ARIA label for risk score
 */
export function getRiskScoreAriaLabel(score: number): string {
  if (score <= 30) {
    return `Risk score: ${score} out of 100. Low risk tier. Good credit standing.`;
  } else if (score <= 70) {
    return `Risk score: ${score} out of 100. Medium risk tier. Standard credit standing.`;
  } else {
    return `Risk score: ${score} out of 100. High risk tier. Requires improvement.`;
  }
}

/**
 * Generate ARIA label for Stellar address
 */
export function getAddressAriaLabel(address: string): string {
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
  return `Stellar address: ${shortAddress}. Full address: ${address}`;
}

/**
 * Generate ARIA label for transaction
 */
export function getTransactionAriaLabel(tx: {
  type: string;
  amount?: string;
  asset?: string;
  timestamp: string;
}): string {
  const { type, amount, asset, timestamp } = tx;
  const date = new Date(timestamp).toLocaleDateString();

  if (amount && asset) {
    return `${type} transaction of ${amount} ${asset} on ${date}`;
  }
  return `${type} transaction on ${date}`;
}

/**
 * Keyboard navigation helper
 */
export const keyboardHandlers = {
  /**
   * Handle Enter and Space key for button-like elements
   */
  onActivate: (callback: () => void) => {
    return {
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          callback();
        }
      },
      tabIndex: 0,
      role: 'button',
    };
  },

  /**
   * Handle Escape key
   */
  onEscape: (callback: () => void) => {
    return {
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          callback();
        }
      },
    };
  },

  /**
   * Handle arrow navigation
   */
  onArrowNavigation: (handlers: {
    onUp?: () => void;
    onDown?: () => void;
    onLeft?: () => void;
    onRight?: () => void;
  }) => {
    return {
      onKeyDown: (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            handlers.onUp?.();
            break;
          case 'ArrowDown':
            e.preventDefault();
            handlers.onDown?.();
            break;
          case 'ArrowLeft':
            handlers.onLeft?.();
            break;
          case 'ArrowRight':
            handlers.onRight?.();
            break;
        }
      },
    };
  },
};

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Trap focus within an element (for modals)
   */
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => {
    const focusableElements =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    return {
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !containerRef.current) return;

        const focusable = Array.from(
          containerRef.current.querySelectorAll(focusableElements)
        ) as HTMLElement[];

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      },
    };
  },

  /**
   * Return focus to trigger element (for modals)
   */
  returnFocus: (triggerElement: HTMLElement | null) => {
    if (triggerElement) {
      triggerElement.focus();
    }
  },
};

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Color contrast checker (WCAG AA compliance)
 */
export function hasGoodContrast(foreground: string, background: string): boolean {
  // This is a simplified check. For production, use a library like polished
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  // This is a placeholder implementation
  return true;
}

/**
 * Skip to main content link
 */
export const SkipToMainLink = () => `
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
  >
    Skip to main content
  </a>
`;

/**
 * Screen reader only text utility
 */
export const srOnly = 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/**
 * Get ARIA props for loading state
 */
export function getLoadingAriaProps(isLoading: boolean) {
  return {
    'aria-busy': isLoading,
    'aria-live': 'polite' as const,
  };
}

/**
 * Get ARIA props for error state
 */
export function getErrorAriaProps(hasError: boolean, errorMessage?: string) {
  return {
    'aria-invalid': hasError,
    'aria-errormessage': hasError && errorMessage ? 'error-message' : undefined,
    role: hasError ? ('alert' as const) : undefined,
  };
}

export default {
  getRiskScoreAriaLabel,
  getAddressAriaLabel,
  getTransactionAriaLabel,
  keyboardHandlers,
  focusManager,
  announceToScreenReader,
  hasGoodContrast,
  getLoadingAriaProps,
  getErrorAriaProps,
  srOnly,
};
