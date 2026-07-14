import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Component that simulates network errors
const NetworkErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  
  if (shouldThrow) {
    throw new Error('Network request failed: Unable to connect to blockchain');
  }
  
  return <button onClick={() => setShouldThrow(true)}>Simulate Network Error</button>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should help users recover from network failures', () => {
    render(
      <ErrorBoundary>
        <NetworkErrorComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Simulate Network Error'));
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('should allow retry after network error', () => {
    render(
      <ErrorBoundary>
        <NetworkErrorComponent />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Simulate Network Error'));
    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('Simulate Network Error')).toBeInTheDocument();
  });
});
