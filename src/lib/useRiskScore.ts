"use client";

import { useEffect, useState } from "react";
import { getModel } from "./loadModel";
import { getCache, setCache } from "./cacheManager";
import { dispatchCacheEvent } from "../hooks/useCacheInvalidation";
import { CACHE_KEYS } from "../types/cache";
import * as tf from "@tensorflow/tfjs";

const RISK_SCORE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for risk scores

export function useRiskScore(features, walletAddress = null) {
  // features = [txCount, medianHours, assetKinds]
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        if (!features || features.length !== 3) {
          setScore(null);
          setLoading(false);
          return;
        }

        // Check if all values are valid numbers
        if (!features.every((f) => typeof f === "number" && !isNaN(f))) {
          setScore(null);
          setLoading(false);
          return;
        }

        // Check cache first if walletAddress is provided
        if (walletAddress) {
          const cacheKey = `${CACHE_KEYS.RISK_SCORE}_${walletAddress}`;
          const cachedScore = await getCache(cacheKey) as any;

          if (cachedScore && !cancelled) {
            console.log("🚀 Using cached risk score");
            setScore(cachedScore.score);
            setLoading(false);
            return;
          }
        }

        console.log("🧠 Calculating fresh risk score...");

        const model = await getModel();
        if (!model) {
          console.error("Model could not be loaded");
          setError("Model could not be loaded");
          setScore(null);
          setLoading(false);
          return;
        }

        // Normalization - features should already be normalized (0-1 range)
        const input = tf.tensor2d([features]); // 1×3
        const output = model.predict(input);
        const prob = (await output.data())[0]; // 0-1

        if (!cancelled && typeof prob === "number" && !isNaN(prob)) {
          const calculatedScore = Math.round(Math.max(0, Math.min(100, prob * 100)));
          setScore(calculatedScore);

          // Cache the result if walletAddress is provided
          if (walletAddress) {
            const cacheKey = `${CACHE_KEYS.RISK_SCORE}_${walletAddress}`;
            const cacheData = {
              score: calculatedScore,
              features,
              walletAddress,
              timestamp: Date.now(),
            };
            
            await setCache(cacheKey, cacheData, { 
              ttl: RISK_SCORE_CACHE_TTL 
            });

            // Dispatch event for cache invalidation hooks
            dispatchCacheEvent.riskScoreUpdated(walletAddress, calculatedScore);
          }
        }

        // Memory cleanup
        tf.dispose([input, output]);
        setLoading(false);
      } catch (error) {
        console.error("Risk score calculation error:", error);
        if (!cancelled) {
          setError(error.message || "Risk score could not be calculated");
          setScore(null);
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [features, walletAddress]);

  return {
    riskScore: score,
    loading,
    error,
  };
}
