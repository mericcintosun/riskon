"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "install_prompt_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;
const MIN_PAGE_VISITS = 2;
const VISIT_COUNT_KEY = "install_prompt_visits";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const visits = parseInt(sessionStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    sessionStorage.setItem(VISIT_COUNT_KEY, String(visits));

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION) {
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (visits >= MIN_PAGE_VISITS) {
        setCanInstall(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCanInstall(false);
  }, []);

  return { canInstall, isInstalled, promptInstall, dismissPrompt };
}
