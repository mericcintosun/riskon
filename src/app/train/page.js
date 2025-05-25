"use client";
import { useState } from "react";
import * as tf from "@tensorflow/tfjs";

import { samples } from "../../lib/samples";

export default function TrainPage() {
  const [status, setStatus] = useState("Hazır");

  async function trainAndSave() {
    setStatus("Eğitiliyor…");

    // ---- 2) Veriyi tensöre çevir ----------------------------------------
    const xs = tf.tensor(samples.map((r) => r.slice(0, 3))); // 3 özellik
    const ys = tf.tensor(samples.map((r) => r[3])); // etiket

    // ---- 3) Basit model (1 Dense nöron + sigmoid) -----------------------
    const model = tf.sequential();
    model.add(
      tf.layers.dense({ units: 1, inputShape: [3], activation: "sigmoid" })
    );
    model.compile({ optimizer: "adam", loss: "binaryCrossentropy" });

    // ---- 4) Eğitim ------------------------------------------------------
    await model.fit(xs, ys, { epochs: 50, batchSize: samples.length });

    // ---- 5) Kaydet – tarayıcı Downloads klasörüne ----------------------
    await model.save("downloads://risk-model"); // indirme penceresi açılır
    setStatus("Bitti! Dosyalar indirildi ✅");
  }

  return (
    <main className="flex flex-col items-center gap-4 p-10">
      <h1 className="text-2xl font-semibold">Risk Modeli Eğit</h1>

      <button
        onClick={trainAndSave}
        className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
      >
        Modeli Eğit ve Kaydet
      </button>

      <p className="text-sm text-gray-600">{status}</p>
    </main>
  );
}
