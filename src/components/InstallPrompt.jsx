"use client";

import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { trackAppInstalled } from "../lib/analytics";

export default function InstallPrompt() {
  const { canInstall, promptInstall, dismissPrompt } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      trackAppInstalled();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl flex items-center gap-4">
        <img src="/icon-192.png" alt="Riskon" className="w-12 h-12 rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Install Riskon</p>
          <p className="text-white/60 text-xs">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={dismissPrompt}
            className="text-white/50 hover:text-white/80 text-xs px-2 py-1"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
