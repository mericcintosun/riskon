"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptionStatus,
} from "../lib/pushNotifications";

export default function NotificationSettings() {
  const { walletAddress, isConnected } = useWallet();
  const [status, setStatus] = useState({
    supported: false,
    subscribed: false,
    permission: "default",
  });
  const [preferences, setPreferences] = useState({
    riskAlerts: true,
    txUpdates: true,
    liquidityAlerts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then(setStatus);
  }, []);

  if (!isConnected || !status.supported) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await subscribe(walletAddress, preferences);
      if (result.success) {
        setStatus((prev) => ({ ...prev, subscribed: true, permission: "granted" }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribe(walletAddress);
      setStatus((prev) => ({ ...prev, subscribed: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    if (status.subscribed) {
      await updatePreferences(walletAddress, updated);
    }
  };

  const toggles = [
    { key: "riskAlerts", label: "Risk Score Alerts", desc: "When your risk tier changes" },
    { key: "txUpdates", label: "Transaction Updates", desc: "When transactions complete or fail" },
    { key: "liquidityAlerts", label: "Liquidity Alerts", desc: "Significant pool changes" },
  ];

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Push Notifications</h3>

      {status.permission === "denied" && (
        <p className="text-amber-400 text-sm mb-4">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {!status.subscribed ? (
        <button
          onClick={handleSubscribe}
          disabled={loading || status.permission === "denied"}
          className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-4"
        >
          {loading ? "Enabling..." : "Enable Notifications"}
        </button>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {toggles.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer"
              >
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-white/50 text-xs">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    preferences[key] ? "bg-violet-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      preferences[key] ? "left-5" : "left-1"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>

          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 text-white/70 font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            {loading ? "Disabling..." : "Disable All Notifications"}
          </button>
        </>
      )}
    </div>
  );
}
