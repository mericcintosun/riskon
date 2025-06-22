"use client";

import { useEffect, useState } from "react";
import { getModel } from "./loadModel";
import * as tf from "@tensorflow/tfjs";

export function useRiskScore(features) {
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
          setScore(Math.round(Math.max(0, Math.min(100, prob * 100))));
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
  }, [features]);

  return {
    riskScore: score,
    loading,
    error,
  };
}
