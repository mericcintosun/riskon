/**
 * Risk Data System Initializer
 * Automatically initializes the IndexedDB risk data system when the app loads
 */

"use client";

import { useEffect, useState } from 'react';
import { initializeRiskDataSystem } from '../lib/riskDataManager';

const RiskDataInitializer = () => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initSystem = async () => {
      try {
        const result = await initializeRiskDataSystem();
        
        if (result.success) {
          setInitialized(true);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    // Only initialize once
    if (!initialized && !error) {
      initSystem();
    }
  }, [initialized, error]);

  // This component doesn't render anything visible
  // It only handles initialization in the background
  return null;
};

export default RiskDataInitializer;