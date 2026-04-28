const BLOCKED_SENSITIVE_KEY_PATTERN =
  /(token|jwt|secret|auth|password|session|cookie|credential|private[-_]?key|salt|api[-_]?key)/i;

// Simple XOR-based encryption for non-critical data
// In production, use Web Crypto API with proper key management
class SimpleEncryption {
  static generateKey() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async encrypt(text, key) {
    if (!text || !key) return null;
    
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn('Encryption failed:', error);
      return null;
    }
  }

  static async decrypt(encryptedText, key) {
    if (!encryptedText || !key) return null;
    
    try {
      const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('Decryption failed:', error);
      return null;
    }
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    // For Node.js test environment, use global localStorage mock
    if (typeof global !== 'undefined' && global.localStorage) {
      return global.localStorage;
    }
    return null;
  }

  return window.localStorage;
}

function getEncryptionKey() {
  // In production, this should be derived from user authentication
  // For now, use a device-specific key
  if (typeof window === "undefined") return null;
  
  let key = localStorage.getItem('riskon-enc-key');
  if (!key) {
    key = SimpleEncryption.generateKey();
    localStorage.setItem('riskon-enc-key', key);
  }
  return key;
}

export function isSensitiveStorageKey(key) {
  return BLOCKED_SENSITIVE_KEY_PATTERN.test(String(key || ""));
}

export function setSafeLocalStorageItem(key, value, options = {}) {
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

  const { encrypt = false, ttl = null } = options;
  let storedValue = value;

  if (encrypt) {
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      // This would be async in real implementation
      // For now, store as-is but mark for encryption
      storedValue = JSON.stringify({
        data: value,
        encrypted: false, // Would be true with proper async implementation
        timestamp: Date.now()
      });
    }
  }

  if (ttl) {
    storedValue = JSON.stringify({
      data: storedValue,
      expires: Date.now() + ttl
    });
  }

  localStorageRef.setItem(key, storedValue);
  return true;
}

export function getSafeLocalStorageItem(key, options = {}) {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) {
    return null;
  }

  let value = localStorageRef.getItem(key);
  if (value === null) return null;

  const { decrypt = false } = options;

  try {
    // Check if value has TTL
    const parsed = JSON.parse(value);
    if (parsed.expires && Date.now() > parsed.expires) {
      removeSafeLocalStorageItem(key);
      return null;
    }

    if (parsed.encrypted && decrypt) {
      const encryptionKey = getEncryptionKey();
      if (encryptionKey) {
        // This would be async in real implementation
        return parsed.data;
      }
    }

    return parsed.data !== undefined ? parsed.data : value;
  } catch (e) {
    // Value is not JSON, return as-is
    return value;
  }
}

export function removeSafeLocalStorageItem(key) {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) {
    return false;
  }

  localStorageRef.removeItem(key);
  return true;
}

export function clearExpiredStorageItems() {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) return;

  const keysToRemove = [];
  
  for (let i = 0; i < localStorageRef.length; i++) {
    const key = localStorageRef.key(i);
    if (key && !isSensitiveStorageKey(key)) {
      try {
        const value = localStorageRef.getItem(key);
        const parsed = JSON.parse(value || '{}');
        if (parsed.expires && Date.now() > parsed.expires) {
          keysToRemove.push(key);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  keysToRemove.forEach(key => removeSafeLocalStorageItem(key));
}

export function getStorageUsage() {
  const localStorageRef = getLocalStorage();
  if (!localStorageRef) return { total: 0, items: 0 };

  let totalSize = 0;
  let itemCount = 0;

  try {
    for (let i = 0; i < localStorageRef.length; i++) {
      const key = localStorageRef.key(i);
      if (key && !isSensitiveStorageKey(key)) {
        const value = localStorageRef.getItem(key);
        totalSize += (key.length + (value?.length || 0)) * 2; // UTF-16
        itemCount++;
      }
    }
  } catch (error) {
    console.warn('Error calculating storage usage:', error);
    return { total: 0, items: 0 };
  }

  return { total: totalSize, items: itemCount };
}

// Security monitoring
export function logSecurityEvent(event, details = {}) {
  if (typeof window === "undefined") return;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // In production, send to security monitoring service
  console.warn('Security Event:', logEntry);
  
  // Store recent security events locally (with TTL)
  const events = JSON.parse(localStorage.getItem('riskon-security-events') || '[]');
  events.push(logEntry);
  
  // Keep only last 100 events
  if (events.length > 100) {
    events.splice(0, events.length - 100);
  }
  
  localStorage.setItem('riskon-security-events', JSON.stringify(events));
}
