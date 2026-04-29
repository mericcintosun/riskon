"use client";

import React from 'react';
import { useMobileOptimization } from '../hooks/useMobileOptimization';

/**
 * Mobile Optimized Wrapper Component
 * 
 * Provides automatic mobile optimizations including:
 * - Performance adjustments based on device capabilities
 * - Touch-friendly interactions
 * - Safe area support
 * - Responsive typography scaling
 */
export default function MobileOptimizedWrapper({ 
  children, 
  className = "", 
  enableAnimations = true,
  enableHeavyFeatures = false 
}) {
  const {
    isMobile,
    isTouch,
    isLowPowerMode,
    connectionType,
    isReducedMotion,
    shouldEnableHeavyFeatures,
    getSafeAreaInsets
  } = useMobileOptimization();

  const safeAreaInsets = getSafeAreaInsets();

  // Determine if animations should be enabled
  const shouldAnimate = enableAnimations && 
                       !isReducedMotion && 
                       !isLowPowerMode &&
                       !['slow-2g', '2g'].includes(connectionType);

  // Determine if heavy features should be enabled
  const shouldEnableHeavy = enableHeavyFeatures && shouldEnableHeavyFeatures();

  // Generate responsive classes
  const getResponsiveClasses = () => {
    const classes = [];
    
    if (isMobile) classes.push('mobile-optimized');
    if (isTouch) classes.push('touch-optimized');
    if (shouldAnimate) classes.push('animations-enabled');
    if (isReducedMotion) classes.push('reduced-motion');
    if (isLowPowerMode) classes.push('low-power-mode');
    
    return classes.join(' ');
  };

  // Generate safe area styles
  const getSafeAreaStyles = () => {
    const styles = {};
    if (safeAreaInsets.top > 0) styles.paddingTop = `${safeAreaInsets.top}px`;
    if (safeAreaInsets.bottom > 0) styles.paddingBottom = `${safeAreaInsets.bottom}px`;
    if (safeAreaInsets.left > 0) styles.paddingLeft = `${safeAreaInsets.left}px`;
    if (safeAreaInsets.right > 0) styles.paddingRight = `${safeAreaInsets.right}px`;
    return styles;
  };

  return (
    <div 
      className={`mobile-optimized-wrapper ${getResponsiveClasses()} ${className}`}
      style={getSafeAreaStyles()}
      data-mobile={isMobile}
      data-touch={isTouch}
      data-animations={shouldAnimate}
      data-heavy-features={shouldEnableHeavy}
      data-connection={connectionType}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            'data-mobile-optimized': 'true',
            'data-touch-friendly': isTouch,
            'data-animations-enabled': shouldAnimate,
            'data-performance-mode': isLowPowerMode ? 'reduced' : 'full'
          });
        }
        return child;
      })}
    </div>
  );
}

/**
 * Touch-friendly button wrapper
 */
export function TouchButton({ 
  children, 
  onClick, 
  className = "", 
  size = "normal",
  disabled = false,
  ...props 
}) {
  const { isTouch } = useMobileOptimization();

  const sizeClasses = {
    small: isTouch ? "min-h-[44px] min-w-[44px]" : "min-h-[32px] min-w-[32px]",
    normal: isTouch ? "min-h-[48px] min-w-[48px]" : "min-h-[40px] min-w-[40px]",
    large: isTouch ? "min-h-[52px] min-w-[52px]" : "min-h-[44px] min-w-[44px]"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`touch-target touch-button ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Mobile-optimized card component
 */
export function MobileCard({ 
  children, 
  className = "", 
  hover = true,
  ...props 
}) {
  const { isMobile, isTouch } = useMobileOptimization();

  const cardClasses = [
    "mobile-card",
    "card-modern",
    isMobile ? "card-mobile" : "card-desktop",
    isTouch && hover ? "card-touch-hover" : hover ? "card-hover" : "",
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
}

/**
 * Responsive container component
 */
export function ResponsiveContainer({ 
  children, 
  className = "", 
  maxWidth = "7xl",
  ...props 
}) {
  const { isMobile } = useMobileOptimization();

  const containerClasses = [
    "container-mobile-first",
    `max-w-${maxWidth}`,
    isMobile ? "px-4" : "",
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...props}>
      {children}
    </div>
  );
}
