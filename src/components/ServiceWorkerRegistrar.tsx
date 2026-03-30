"use client";

import { useEffect } from "react";
import { serviceWorkerManager } from "../lib/serviceWorkerManager";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    serviceWorkerManager.register();
  }, []);

  return null;
}
