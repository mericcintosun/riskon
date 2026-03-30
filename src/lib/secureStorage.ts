const BLOCKED_SENSITIVE_KEY_PATTERN =
  /(token|jwt|secret|auth|password|session|cookie|credential)/i;

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function isSensitiveStorageKey(key) {
  return BLOCKED_SENSITIVE_KEY_PATTERN.test(String(key || ""));
}

export function setSafeLocalStorageItem(key, value) {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) {
    return false;
  }

  if (isSensitiveStorageKey(key)) {
    console.warn(
      `Blocked insecure localStorage write for sensitive key: ${key}`
    );
    return false;
  }

  localStorageRef.setItem(key, value);
  return true;
}

export function getSafeLocalStorageItem(key) {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) {
    return null;
  }

  return localStorageRef.getItem(key);
}

export function removeSafeLocalStorageItem(key) {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) {
    return false;
  }

  localStorageRef.removeItem(key);
  return true;
}
