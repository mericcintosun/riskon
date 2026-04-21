"use client";

// Mobile performance optimization utilities
export const optimizeForMobile = {
  // Detect if device is mobile
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768;
  },

  // Detect if device has touch support
  hasTouchSupport: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get device pixel ratio for high DPI displays
  getPixelRatio: () => {
    return window.devicePixelRatio || 1;
  },

  // Optimize animations based on device capabilities
  shouldReduceMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get connection type for adaptive loading
  getConnectionType: () => {
    if ('connection' in navigator) {
      return navigator.connection.effectiveType || '4g';
    }
    return '4g';
  },

  // Optimize image loading based on connection
  getOptimalImageSize: (baseSize) => {
    const connectionType = optimizeForMobile.getConnectionType();
    const isMobile = optimizeForMobile.isMobile();
    
    if (isMobile && connectionType === 'slow-2g') {
      return Math.floor(baseSize * 0.5);
    } else if (isMobile && (connectionType === '2g' || connectionType === '3g')) {
      return Math.floor(baseSize * 0.75);
    }
    return baseSize;
  },

  // Debounce function for mobile scroll/touch events
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for high-frequency events
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Mobile-specific event listeners
export const addMobileEventListeners = {
  // Add optimized scroll listener
  scroll: (callback) => {
    const throttledCallback = optimizeForMobile.throttle(callback, 16); // 60fps
    window.addEventListener('scroll', throttledCallback, { passive: true });
    return () => window.removeEventListener('scroll', throttledCallback);
  },

  // Add optimized resize listener
  resize: (callback) => {
    const debouncedCallback = optimizeForMobile.debounce(callback, 250);
    window.addEventListener('resize', debouncedCallback, { passive: true });
    return () => window.removeEventListener('resize', debouncedCallback);
  },

  // Add touch event listeners with proper handling
  touch: (element, handlers) => {
    if (!element || !handlers) return;

    const touchStart = (e) => {
      if (handlers.onTouchStart) {
        handlers.onTouchStart(e);
      }
    };

    const touchMove = (e) => {
      if (handlers.onTouchMove) {
        handlers.onTouchMove(e);
      }
    };

    const touchEnd = (e) => {
      if (handlers.onTouchEnd) {
        handlers.onTouchEnd(e);
      }
    };

    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchmove', touchMove, { passive: true });
    element.addEventListener('touchend', touchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', touchStart);
      element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd);
    };
  }
};

// Performance monitoring for mobile
export const mobilePerformanceMonitor = {
  // Measure render performance
  measureRender: (componentName) => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  },

  // Check memory usage (if available)
  getMemoryUsage: () => {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Log performance metrics
  logMetrics: (componentName, metrics) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Mobile Performance] ${componentName}:`, metrics);
    }
  }
};
