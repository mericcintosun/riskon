import * as tf from "@tensorflow/tfjs";

let modelPromise; // Singleton – her yerden aynı promise döner

export function getModel() {
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel("/model/risk-model.json");
  }
  return modelPromise;
} 