const express = require("express");

function createPushRouter(redisClient) {
  const router = express.Router();

  router.post("/subscribe", async (req, res) => {
    try {
      const { walletAddress, subscription, preferences } = req.body;

      if (!walletAddress || !subscription) {
        return res.status(400).json({ error: "walletAddress and subscription are required" });
      }

      const record = {
        subscription,
        preferences: preferences || {
          riskAlerts: true,
          txUpdates: true,
          liquidityAlerts: true,
        },
        createdAt: Date.now(),
      };

      await redisClient.set(`push:${walletAddress}`, JSON.stringify(record));
      res.json({ success: true });
    } catch (error) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.delete("/unsubscribe", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress is required" });
      }

      await redisClient.del(`push:${walletAddress}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.put("/preferences", async (req, res) => {
    try {
      const { walletAddress, preferences } = req.body;

      if (!walletAddress || !preferences) {
        return res.status(400).json({ error: "walletAddress and preferences are required" });
      }

      const data = await redisClient.get(`push:${walletAddress}`);
      if (!data) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const record = JSON.parse(data);
      record.preferences = preferences;
      await redisClient.set(`push:${walletAddress}`, JSON.stringify(record));
      res.json({ success: true });
    } catch (error) {
      console.error("Push preferences error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/vapid-key", (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      return res.status(500).json({ error: "VAPID keys not configured" });
    }
    res.json({ publicKey: key });
  });

  router.post("/notify", async (req, res) => {
    try {
      const { walletAddress, type, data } = req.body;

      if (!walletAddress || !type) {
        return res.status(400).json({ error: "walletAddress and type are required" });
      }

      const { sendNotification } = require("./pushService");

      const titles = {
        risk_alert: "Risk Tier Changed",
        tx_update: "Transaction Update",
        liquidity_alert: "Liquidity Alert",
      };

      const payload = {
        title: titles[type] || "Riskon Notification",
        body: data?.message || "You have a new notification",
        type,
        url: data?.url || "/",
      };

      const result = await sendNotification(redisClient, walletAddress, payload);
      res.json(result);
    } catch (error) {
      console.error("Push notify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createPushRouter };
