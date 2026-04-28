/**
 * Loading States and Skeleton Screens
 *
 * Provides consistent loading UI patterns across the application
 * Related Issue: #19 - Loading States and Skeleton Screens
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'title' | 'card' | 'circle' | 'button';
  width?: string;
  height?: string;
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface LoadingOverlayProps {
  message?: string;
}

interface ButtonLoadingProps {
  children: React.ReactNode;
  loading?: boolean;
  [key: string]: any;
}

interface TableRowSkeletonProps {
  columns?: number;
}

interface ListSkeletonProps {
  items?: number;
}

// Base skeleton component
export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text', 
  width, 
  height 
}) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded';

  const variantClasses: Record<string, string> = {
    text: 'h-4',
    title: 'h-8',
    card: 'h-32',
    circle: 'rounded-full',
    button: 'h-12',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      style={style}
    />
  );
};

// Card skeleton
export const CardSkeleton: React.FC = () => (
  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
    <div className="flex items-start gap-4">
      <Skeleton variant="circle" width="48px" height="48px" />
      <div className="flex-1 space-y-3">
        <Skeleton variant="title" width="60%" />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="80%" />
      </div>
    </div>
  </div>
);

// Risk score skeleton
export const RiskScoreSkeleton: React.FC = () => (
  <div className="text-center space-y-4">
    <Skeleton variant="circle" width="120px" height="120px" className="mx-auto" />
    <Skeleton variant="title" width="150px" className="mx-auto" />
    <Skeleton variant="text" width="200px" className="mx-auto" />
  </div>
);

// Table row skeleton
export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ columns = 4 }) => (
  <tr className="border-b border-white/5">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton variant="text" />
      </td>
    ))}
  </tr>
);

// List skeleton
export const ListSkeleton: React.FC<ListSkeletonProps> = ({ items = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
    ))}
  </div>
);

// Spinner component
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg className="animate-spin text-white" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Loading overlay
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-white font-medium">{message}</p>
    </div>
  </div>
);

// Page loading skeleton
export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
    <div className="max-w-7xl mx-auto space-y-6">
      <Skeleton variant="title" width="300px" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ children, loading, ...props }) => (
  <button {...props} disabled={loading}>
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <Spinner size="sm" />
        <span>Loading...</span>
      </span>
    ) : (
      children
    )}
  </button>
);

export default {
  Skeleton,
  CardSkeleton,
  RiskScoreSkeleton,
  TableRowSkeleton,
  ListSkeleton,
  Spinner,
  LoadingOverlay,
  PageSkeleton,
  ButtonLoading,
};
