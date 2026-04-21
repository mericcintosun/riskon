"use client";

// Mobile testing utilities for browser compatibility
export const mobileTestingUtils = {
  // Test viewport dimensions
  getViewportInfo: () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      isLandscape: window.innerWidth > window.innerHeight,
      isPortrait: window.innerWidth <= window.innerHeight
    };
  },

  // Test touch support
  testTouchSupport: () => {
    return {
      hasTouch: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchEventSupport: {
        touchstart: 'ontouchstart' in window,
        touchmove: 'ontouchmove' in window,
        touchend: 'ontouchend' in window
      }
    };
  },

  // Test CSS Grid and Flexbox support
  testLayoutSupport: () => {
    const testEl = document.createElement('div');
    return {
      gridSupport: CSS.supports('display', 'grid'),
      flexboxSupport: CSS.supports('display', 'flex'),
      customPropertiesSupport: CSS.supports('--test', '0')
    };
  },

  // Test performance characteristics
  testPerformance: () => {
    const connection = navigator.connection || {};
    return {
      connectionType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 'unknown',
      rtt: connection.rtt || 'unknown',
      saveData: connection.saveData || false,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    };
  },

  // Test browser features
  testBrowserFeatures: () => {
    return {
      localStorage: typeof(Storage) !== "undefined",
      sessionStorage: typeof(Storage) !== "undefined",
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch(e) {
          return false;
        }
      })(),
      webWorkers: typeof(Worker) !== "undefined",
      serviceWorker: 'serviceWorker' in navigator
    };
  },

  // Generate mobile compatibility report
  generateCompatibilityReport: () => {
    const viewport = mobileTestingUtils.getViewportInfo();
    const touch = mobileTestingUtils.testTouchSupport();
    const layout = mobileTestingUtils.testLayoutSupport();
    const performance = mobileTestingUtils.testPerformance();
    const features = mobileTestingUtils.testBrowserFeatures();

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport,
      touch,
      layout,
      performance,
      features,
      issues: mobileTestingUtils.identifyIssues({
        viewport,
        touch,
        layout,
        performance,
        features
      })
    };
  },

  // Identify potential mobile issues
  identifyIssues: (testResults) => {
    const issues = [];

    // Check viewport size
    if (testResults.viewport.width < 320) {
      issues.push({
        type: 'viewport',
        severity: 'high',
        message: 'Viewport width is below minimum recommended size (320px)'
      });
    }

    // Check touch support
    if (!testResults.touch.hasTouch) {
      issues.push({
        type: 'touch',
        severity: 'medium',
        message: 'Touch events not supported - may affect mobile interactions'
      });
    }

    // Check layout support
    if (!testResults.layout.gridSupport) {
      issues.push({
        type: 'layout',
        severity: 'medium',
        message: 'CSS Grid not supported - fallback layouts needed'
      });
    }

    // Check connection
    if (testResults.performance.connectionType === 'slow-2g' || 
        testResults.performance.connectionType === '2g') {
      issues.push({
        type: 'performance',
        severity: 'high',
        message: 'Slow connection detected - consider optimizing assets'
      });
    }

    return issues;
  },

  // Log compatibility report to console
  logCompatibilityReport: () => {
    const report = mobileTestingUtils.generateCompatibilityReport();
    
    if (process.env.NODE_ENV === 'development') {
      console.group('📱 Mobile Compatibility Report');
      console.log('📊 Viewport:', report.viewport);
      console.log('👆 Touch Support:', report.touch);
      console.log('🎨 Layout Support:', report.layout);
      console.log('⚡ Performance:', report.performance);
      console.log('🔧 Browser Features:', report.features);
      
      if (report.issues.length > 0) {
        console.warn('⚠️ Issues Found:', report.issues);
      } else {
        console.log('✅ No issues detected');
      }
      
      console.groupEnd();
    }

    return report;
  }
};

// Mobile viewport testing helper
export const testMobileViewport = () => {
  const sizes = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
    { name: 'Samsung Galaxy S20', width: 360, height: 800 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 }
  ];

  const currentViewport = mobileTestingUtils.getViewportInfo();
  const matchingDevice = sizes.find(size => 
    Math.abs(currentViewport.width - size.width) <= 10 && 
    Math.abs(currentViewport.height - size.height) <= 10
  );

  return {
    current: currentViewport,
    matchingDevice: matchingDevice || 'Unknown device',
    allSizes: sizes
  };
};
