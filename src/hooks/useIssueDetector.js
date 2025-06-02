"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "../contexts/ToastContext";

export function useIssueDetector() {
  const [issues, setIssues] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { showIssueReport } = useToast();

  const analyzeApplication = async () => {
    setIsAnalyzing(true);
    const detectedIssues = [];

    try {
      // Check 1: Network connectivity with working Stellar endpoints
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Try Horizon first (more reliable)
        let networkOk = false;
        
        try {
          const horizonResponse = await fetch('https://horizon-testnet.stellar.org', {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': 'application/hal+json'
            }
          });
          
          if (horizonResponse.ok) {
            networkOk = true;
          }
        } catch (horizonError) {
          console.warn("Horizon check failed:", horizonError.message);
        }
        
        // If Horizon fails, try Soroban RPC with proper method
        if (!networkOk) {
          try {
            const sorobanResponse = await fetch('https://soroban-testnet.stellar.org', {
              method: 'POST',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getHealth"
              })
            });
            
            if (sorobanResponse.ok) {
              networkOk = true;
            }
          } catch (sorobanError) {
            console.warn("Soroban RPC check failed:", sorobanError.message);
          }
        }
        
        clearTimeout(timeoutId);
        
        if (!networkOk) {
          detectedIssues.push("Stellar Testnet endpoints are unreachable - network connectivity issue");
        }
        
      } catch (error) {
        if (error.name === 'AbortError') {
          detectedIssues.push("Network request timed out - Stellar Testnet may be slow");
        } else {
          detectedIssues.push("Failed to connect to Stellar Testnet - network may be down");
        }
      }

      // Check 2: localStorage availability
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (error) {
        detectedIssues.push("LocalStorage is not available - wallet connections may not persist");
      }

      // Check 3: Environment variables
      const requiredEnvVars = [
        'NEXT_PUBLIC_RISKSCORE_CONTRACT_ID'
      ];
      
      requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
          detectedIssues.push(`Missing environment variable: ${envVar}`);
        }
      });

      // Check 4: Contract ID format validation
      const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;
      if (contractId && contractId.length !== 56) {
        detectedIssues.push("Contract ID format appears invalid - should be 56 characters");
      }

      // Check 5: Browser compatibility
      if (!window.crypto || !window.crypto.subtle) {
        detectedIssues.push("Browser lacks required cryptographic APIs for wallet operations");
      }

      // Check 6: Memory usage (basic check)
      if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
        if (memoryUsage > 0.8) {
          detectedIssues.push("High memory usage detected - application may become unstable");
        }
      }

      // Check 7: Console errors check
      const originalError = console.error;
      let errorCount = 0;
      console.error = function(...args) {
        errorCount++;
        originalError.apply(console, args);
      };

      // Restore after a brief period
      setTimeout(() => {
        console.error = originalError;
        if (errorCount > 5) {
          detectedIssues.push(`High console error rate detected (${errorCount} errors)`);
        }
      }, 2000);

      // Check 8: Wallet availability
      if (!window.stellar && !window.albedo && !window.freighter) {
        detectedIssues.push("No Stellar wallets detected - users may need to install wallet extensions");
      }

      // Check 9: Bundle size warning (static check)
      const performanceEntries = performance.getEntriesByType('navigation');
      if (performanceEntries.length > 0) {
        const loadTime = performanceEntries[0].loadEventEnd - performanceEntries[0].fetchStart;
        if (loadTime > 5000) {
          detectedIssues.push("Slow page load detected - bundle size may be too large");
        }
      }

      // Check 10: React version compatibility
      const reactVersion = React.version;
      if (reactVersion && !reactVersion.startsWith('18') && !reactVersion.startsWith('19')) {
        detectedIssues.push(`React version ${reactVersion} may have compatibility issues with Next.js 15`);
      }

    } catch (error) {
      detectedIssues.push(`Issue analysis failed: ${error.message}`);
    }

    setIssues(detectedIssues);
    setIsAnalyzing(false);
    
    // Show results via toast
    showIssueReport(detectedIssues);
    
    return detectedIssues;
  };

  const checkWalletConnection = () => {
    const walletIssues = [];
    
    // Check stored wallet data
    const storedWallet = localStorage.getItem('connectedWallet');
    const storedAddress = localStorage.getItem('walletAddress');
    
    if (storedWallet && !storedAddress) {
      walletIssues.push("Wallet name stored but address missing - connection corrupted");
    }
    
    if (storedAddress && !storedWallet) {
      walletIssues.push("Wallet address stored but wallet name missing - connection incomplete");
    }

    return walletIssues;
  };

  const checkContractStatus = async () => {
    const contractIssues = [];
    
    try {
      // Basic contract ID validation
      const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;
      if (!contractId) {
        contractIssues.push("Risk score contract ID not configured");
        return contractIssues;
      }

      if (contractId.length !== 56) {
        contractIssues.push("Risk score contract ID has invalid format");
      }

      // Test network connection to Stellar with working endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      let networkWorking = false;
      
      try {
        // Primary: Horizon API (most reliable)
        const horizonResponse = await fetch('https://horizon-testnet.stellar.org', {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/hal+json'
          }
        });
        
        if (horizonResponse.ok) {
          networkWorking = true;
        } else {
          // Secondary: Soroban RPC with JSON-RPC
          const rpcResponse = await fetch('https://soroban-testnet.stellar.org', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getHealth"
            })
          });
          
          if (rpcResponse.ok) {
            networkWorking = true;
          }
        }
        
        clearTimeout(timeoutId);
        
        if (!networkWorking) {
          contractIssues.push("Cannot reach Stellar testnet - contract operations will fail");
        }
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          contractIssues.push("Stellar testnet connection timeout - network may be slow");
        } else {
          contractIssues.push("Contract connectivity check failed");
        }
      }

    } catch (error) {
      contractIssues.push("Contract connectivity check failed");
    }

    return contractIssues;
  };

  const validateFormInputs = (txCount, avgHours, assetTypes) => {
    const validationIssues = [];

    if (txCount !== "" && (isNaN(txCount) || txCount < 0 || txCount > 100)) {
      validationIssues.push("Transaction count must be between 0-100");
    }

    if (avgHours !== "" && (isNaN(avgHours) || avgHours < 0 || avgHours > 24)) {
      validationIssues.push("Average hours must be between 0-24");
    }

    if (assetTypes !== "" && (isNaN(assetTypes) || assetTypes < 0 || assetTypes > 10)) {
      validationIssues.push("Asset types must be between 0-10");
    }

    return validationIssues;
  };

  const runQuickHealthCheck = async () => {
    const healthIssues = [];
    
    // Quick checks
    const walletIssues = checkWalletConnection();
    const contractIssues = await checkContractStatus();
    
    healthIssues.push(...walletIssues);
    healthIssues.push(...contractIssues);

    if (healthIssues.length > 0) {
      showIssueReport(healthIssues);
    }

    return healthIssues;
  };

  // Auto-run basic analysis on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runQuickHealthCheck();
    }, 2000); // Wait 2 seconds after component mount

    return () => clearTimeout(timer);
  }, []);

  return {
    issues,
    isAnalyzing,
    analyzeApplication,
    checkWalletConnection,
    checkContractStatus,
    validateFormInputs,
    runQuickHealthCheck,
  };
} 