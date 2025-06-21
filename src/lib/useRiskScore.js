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

        // Tüm değerlerin geçerli sayı olduğunu kontrol et
        if (!features.every((f) => typeof f === "number" && !isNaN(f))) {
          setScore(null);
          setLoading(false);
          return;
        }

        const model = await getModel();
        if (!model) {
          console.error("Model yüklenemedi");
          setError("Model yüklenemedi");
          setScore(null);
          setLoading(false);
          return;
        }

        // Normalizasyon - features zaten normalize edilmiş olmalı (0-1 arası)
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
          setError(error.message || "Risk skoru hesaplanamadı");
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
