"use client";

import { useEffect, useState } from "react";
import { getModel } from "./loadModel";
import * as tf from "@tensorflow/tfjs";

export function useRiskScore(features) {
  // features = [txCount, medianHours, assetKinds]
  const [score, setScore] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!features || features.length !== 3) {
          setScore(null);
          return;
        }

        // Tüm değerlerin geçerli sayı olduğunu kontrol et
        if (!features.every((f) => typeof f === "number" && !isNaN(f))) {
          setScore(null);
          return;
        }

        const model = await getModel();
        if (!model) {
          console.error("Model yüklenemedi");
          setScore(null);
          return;
        }

        // Normalizasyon - features zaten normalize edilmiş olmalı (0-1 arası)
        const input = tf.tensor2d([features]); // 1×3
        const output = model.predict(input);
        const prob = (await output.data())[0]; // 0-1
        
        if (!cancelled && typeof prob === 'number' && !isNaN(prob)) {
          setScore(Math.round(Math.max(0, Math.min(100, prob * 100))));
        }
        
        // Memory cleanup
        tf.dispose([input, output]);
      } catch (error) {
        console.error("Risk skoru hesaplama hatası:", error);
        if (!cancelled) {
          setScore(null);
        }
      }
    }

    run();
    
    return () => {
      cancelled = true;
    };
  }, [features]);

  return score; // null → henüz hesaplanmadı
}
