const webpush = require("web-push");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@riskon.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendNotification(redisClient, walletAddress, payload) {
  try {
    const data = await redisClient.get(`push:${walletAddress}`);
    if (!data) return { success: false, reason: "no_subscription" };

    const record = JSON.parse(data);
    const subscription = record.subscription;

    if (payload.type && record.preferences) {
      const typeMap = {
        risk_alert: "riskAlerts",
        tx_update: "txUpdates",
        liquidity_alert: "liquidityAlerts",
      };
      const prefKey = typeMap[payload.type];
      if (prefKey && !record.preferences[prefKey]) {
        return { success: false, reason: "preference_disabled" };
      }
    }

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    if (error.statusCode === 410) {
      await redisClient.del(`push:${walletAddress}`);
      return { success: false, reason: "subscription_expired" };
    }
    console.error("Push notification error:", error);
    return { success: false, reason: error.message };
  }
}

async function sendBulkNotification(redisClient, walletAddresses, payload) {
  const results = await Promise.allSettled(
    walletAddresses.map((addr) => sendNotification(redisClient, addr, payload))
  );
  return {
    sent: results.filter((r) => r.status === "fulfilled" && r.value.success).length,
    failed: results.filter((r) => r.status === "rejected" || !r.value?.success).length,
  };
}

module.exports = { sendNotification, sendBulkNotification };
