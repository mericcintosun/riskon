"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Mobile Optimization Hook
 * 
 * Provides utilities for optimizing mobile experience including:
 * - Performance monitoring
 * - Touch detection
 * - Viewport management
 * - Battery optimization
 * - Network awareness
 */
export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check if device is mobile
  const checkMobile = useCallback(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent) || (typeof window !== 'undefined' && window.innerWidth <= 768);
  }, []);

  // Check if device supports touch
  const checkTouch = useCallback(() => {
    return typeof window !== 'undefined' && 
           ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Get viewport dimensions
  const getViewport = useCallback(() => {
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0
    };
  }, []);

  // Check for reduced motion preference
  const checkReducedMotion = useCallback(() => {
    return typeof window !== 'undefined' && 
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check battery level if available
  const checkBattery = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return battery.level < 0.2; // Low power if less than 20%
      } catch (error) {
        console.warn('Battery API not available');
        return false;
      }
    }
    return false;
  }, []);

  // Get network connection type
  const getConnectionType = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return connection ? connection.effectiveType || 'unknown' : 'unknown';
    }
    return 'unknown';
  }, []);

  // Initialize all checks
  useEffect(() => {
    const updateAllChecks = async () => {
      setIsMobile(checkMobile());
      setIsTouch(checkTouch());
      setViewport(getViewport());
      setIsReducedMotion(checkReducedMotion());
      setIsLowPowerMode(await checkBattery());
      setConnectionType(getConnectionType());
    };

    updateAllChecks();

    // Set up event listeners
    const handleResize = () => {
      setViewport(getViewport());
      setIsMobile(checkMobile());
    };

    const handleConnectionChange = () => {
      setConnectionType(getConnectionType());
    };

    const handleMotionChange = (e) => {
      setIsReducedMotion(e.matches);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      
      if ('connection' in navigator) {
        navigator.connection.addEventListener('change', handleConnectionChange);
      }

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', handleMotionChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
        
        if ('connection' in navigator) {
          navigator.connection.removeEventListener('change', handleConnectionChange);
        }

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, [checkMobile, checkTouch, getViewport, checkBattery, getConnectionType, checkReducedMotion]);

  // Performance optimization based on device capabilities
  const getOptimizedAnimationDuration = useCallback((baseDuration) => {
    if (isReducedMotion) return 0;
    if (isLowPowerMode) return baseDuration * 0.5;
    if (connectionType === 'slow-2g' || connectionType === '2g') return baseDuration * 0.7;
    if (isMobile) return baseDuration * 0.8;
    return baseDuration;
  }, [isReducedMotion, isLowPowerMode, connectionType, isMobile]);

  // Determine if heavy features should be enabled
  const shouldEnableHeavyFeatures = useCallback(() => {
    return !isLowPowerMode && 
           !['slow-2g', '2g'].includes(connectionType) &&
           !isReducedMotion;
  }, [isLowPowerMode, connectionType, isReducedMotion]);

  // Get appropriate image quality based on connection
  const getImageQuality = useCallback(() => {
    if (['slow-2g', '2g'].includes(connectionType)) return 'low';
    if (['3g'].includes(connectionType)) return 'medium';
    return 'high';
  }, [connectionType]);

  // Safe area insets for notched screens
  const getSafeAreaInsets = useCallback(() => {
    if (typeof window !== 'undefined' && typeof getComputedStyle !== 'undefined') {
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        top: parseInt(rootStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(rootStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(rootStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(rootStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
      };
    }
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }, []);

  return {
    // Device detection
    isMobile,
    isTouch,
    viewport,
    
    // Performance and accessibility
    isLowPowerMode,
    connectionType,
    isReducedMotion,
    
    // Optimization helpers
    getOptimizedAnimationDuration,
    shouldEnableHeavyFeatures,
    getImageQuality,
    getSafeAreaInsets,
    
    // Utility methods
    checkMobile,
    checkTouch,
    getViewport
  };
}

/**
 * Touch gesture hook for swipe interactions
 */
export function useTouchGestures() {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setSwipeDirection(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) setSwipeDirection('left');
    if (isRightSwipe) setSwipeDirection('right');
  }, [touchStart, touchEnd]);

  const resetSwipe = useCallback(() => {
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeDirection(null);
  }, []);

  return {
    touchStart,
    touchEnd,
    swipeDirection,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetSwipe
  };
}
