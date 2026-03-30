const PUSH_API_URL = process.env.NEXT_PUBLIC_PUSH_API_URL || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return await Notification.requestPermission();
}

export async function subscribe(walletAddress, preferences) {
  const permission = await requestPermission();
  if (permission !== "granted") {
    return { success: false, reason: permission };
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    return { success: false, reason: "no_vapid_key" };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const response = await fetch(`${PUSH_API_URL}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      subscription: subscription.toJSON(),
      preferences: preferences || {
        riskAlerts: true,
        txUpdates: true,
        liquidityAlerts: true,
      },
    }),
  });

  if (!response.ok) {
    return { success: false, reason: "server_error" };
  }

  return { success: true, subscription };
}

export async function unsubscribe(walletAddress) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (PUSH_API_URL) {
    await fetch(`${PUSH_API_URL}/push/unsubscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });
  }

  return { success: true };
}

export async function updatePreferences(walletAddress, preferences) {
  const response = await fetch(`${PUSH_API_URL}/push/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, preferences }),
  });

  return { success: response.ok };
}

export async function getSubscriptionStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { supported: false, subscribed: false, permission: "unsupported" };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    subscribed: !!subscription,
    permission: Notification.permission,
  };
}

export async function triggerNotification(walletAddress, type, data) {
  if (!PUSH_API_URL) return { success: false, reason: "no_api_url" };

  const response = await fetch(`${PUSH_API_URL}/push/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, type, data }),
  });

  return { success: response.ok };
}
