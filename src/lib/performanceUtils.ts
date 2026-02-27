/**
 * Performance Optimization Utilities
 *
 * Provides memoization, debouncing, throttling, and lazy loading helpers
 * Related Issue: #14 - Performance Optimizations
 */

/**
 * Debounce function - delays execution until after wait time
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load image with IntersectionObserver
 */
export function lazyLoadImage(img: HTMLImageElement, src: string) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        img.src = src;
        observer.unobserve(img);
      }
    });
  });

  observer.observe(img);
  return () => observer.disconnect();
}

/**
 * Batch async operations
 */
export async function batchAsync<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(callback: () => void, options?: { timeout?: number }) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Polyfill
  const start = Date.now();
  return setTimeout(() => {
    callback();
  }, Math.max(0, (options?.timeout || 50) - (Date.now() - start)));
}

/**
 * Virtual scrolling helper
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  scrollTop: number
) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

  return {
    visibleItems: items.slice(startIndex, endIndex),
    offsetY: startIndex * itemHeight,
    totalHeight: items.length * itemHeight,
    startIndex,
    endIndex,
  };
}

/**
 * Measure performance
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();

    if (start === undefined) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const duration = end! - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  clear() {
    this.marks.clear();
  }
}

/**
 * Bundle size optimization helper
 */
export const lazyImport = {
  /**
   * Dynamically import component
   */
  component: <T>(importFn: () => Promise<{ default: T }>) => {
    return async () => {
      const module = await importFn();
      return module.default;
    };
  },

  /**
   * Preload component
   */
  preload: <T>(importFn: () => Promise<{ default: T }>) => {
    return () => {
      void importFn();
    };
  },
};

/**
 * Memory leak prevention
 */
export function createCleanupManager() {
  const cleanupFns: (() => void)[] = [];

  return {
    add: (fn: () => void) => {
      cleanupFns.push(fn);
    },
    cleanup: () => {
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
    },
  };
}

/**
 * Optimize React re-renders
 */
export const reactOptimizations = {
  /**
   * Check if props changed (for React.memo)
   */
  shallowEqual: <T extends Record<string, any>>(prev: T, next: T): boolean => {
    const keys1 = Object.keys(prev);
    const keys2 = Object.keys(next);

    if (keys1.length !== keys2.length) return false;

    return keys1.every((key) => prev[key] === next[key]);
  },

  /**
   * Create stable callback reference
   */
  useStableCallback: <T extends (...args: any[]) => any>(callback: T): T => {
    // This would use useRef and useCallback in actual React component
    // Placeholder for documentation
    return callback;
  },
};

export default {
  debounce,
  throttle,
  memoize,
  lazyLoadImage,
  batchAsync,
  requestIdleCallback,
  useVirtualScroll,
  PerformanceMonitor,
  lazyImport,
  createCleanupManager,
  reactOptimizations,
};
