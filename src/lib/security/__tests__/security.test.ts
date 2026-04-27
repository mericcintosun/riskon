/**
 * Security Test Suite
 * 
 * Comprehensive tests for all security implementations including
 * CSRF protection, XSS prevention, input validation, and secure storage.
 */

import { 
  validateStellarAddress, 
  sanitizeString, 
  validateUrl,
  validateRiskScore,
  validateEmail,
  validateTransactionHash,
  validateAmount,
  validateAssetCode
} from '../../validation';
import { 
  setSafeLocalStorageItem, 
  getSafeLocalStorageItem, 
  removeSafeLocalStorageItem,
  isSensitiveStorageKey,
  clearExpiredStorageItems,
  getStorageUsage,
  logSecurityEvent
} from '../../secureStorage';
import { securityMonitor, logSecurityEvent as logSecEvent } from '../securityMonitor';

describe('Input Validation Tests', () => {
  describe('validateStellarAddress', () => {
    test('should validate valid Stellar public keys', () => {
      const validAddress = 'GD5DJ3B7A2YQF4L6K5I7M8N9O0P1Q2R3S4T5U6V7W8X9Y0Z1A2B3C4D5E6F7G8H9';
      const result = validateStellarAddress(validAddress);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(validAddress);
    });

    test('should validate valid contract addresses', () => {
      const validContract = 'CA3D5K7M2N8P9Q0R1S2T3U4V5W6X7Y8Z9A0B1C2D3E4F5G6H7I8J9K0L1M2N3O4';
      const result = validateStellarAddress(validContract);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(validContract);
    });

    test('should reject invalid addresses', () => {
      const invalidAddresses = [
        '',
        'invalid',
        'G123',
        'C123',
        null,
        undefined,
        123
      ];

      invalidAddresses.forEach(address => {
        const result = validateStellarAddress(address as any);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('sanitizeString', () => {
    test('should sanitize XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '\"><script>alert(1)</script>',
        '\';alert(1);//'
      ];

      xssAttempts.forEach(attempt => {
        const sanitized = sanitizeString(attempt);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).toContain('&lt;');
        expect(sanitized).toContain('&gt;');
      });
    });

    test('handle null and undefined', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('validateUrl', () => {
    test('should validate valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://stellar.org'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://example.com',
        '',
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url as any);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateRiskScore', () => {
    test('should validate valid risk scores', () => {
      const validScores = [0, 50, 100, '75', '0', '100'];
      
      validScores.forEach(score => {
        const result = validateRiskScore(score);
        expect(result.isValid).toBe(true);
        expect(typeof result.sanitized).toBe('number');
      });
    });

    test('should reject invalid risk scores', () => {
      const invalidScores = [-1, 101, 'invalid', null, undefined, NaN, Infinity];
      
      invalidScores.forEach(score => {
        const result = validateRiskScore(score as any);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateEmail', () => {
    test('should validate valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid emails', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'test@',
        'test.example.com',
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email as any);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateTransactionHash', () => {
    test('should validate valid transaction hashes', () => {
      const validHash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
      const result = validateTransactionHash(validHash);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid transaction hashes', () => {
      const invalidHashes = [
        '',
        'short',
        'g' + 'a'.repeat(63), // contains non-hex character
        'a'.repeat(63), // too short
        'a'.repeat(65), // too long
        null,
        undefined
      ];

      invalidHashes.forEach(hash => {
        const result = validateTransactionHash(hash as any);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateAmount', () => {
    test('should validate valid amounts', () => {
      const validAmounts = [1, 100.5, '50.25', '0.0000001'];
      
      validAmounts.forEach(amount => {
        const result = validateAmount(amount);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid amounts', () => {
      const invalidAmounts = [0, -1, 'invalid', null, undefined, NaN, Infinity];
      
      invalidAmounts.forEach(amount => {
        const result = validateAmount(amount as any);
        expect(result.isValid).toBe(false);
      });
    });

    test('should enforce decimal limits', () => {
      const result = validateAmount('1.12345678'); // 8 decimal places
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('decimal places');
    });
  });

  describe('validateAssetCode', () => {
    test('should validate valid asset codes', () => {
      const validCodes = ['XLM', 'USD', 'BTC123', 'A'];
      
      validCodes.forEach(code => {
        const result = validateAssetCode(code);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject invalid asset codes', () => {
      const invalidCodes = [
        '',
        'TOOLONGASSETCODE123',
        'special@chars',
        'with spaces',
        null,
        undefined
      ];

      invalidCodes.forEach(code => {
        const result = validateAssetCode(code as any);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('Secure Storage Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('isSensitiveStorageKey', () => {
    test('should identify sensitive keys', () => {
      const sensitiveKeys = [
        'token',
        'auth_token',
        'user_jwt',
        'api_secret',
        'session_id',
        'password_hash',
        'credential_data',
        'private_key',
        'encryption_salt'
      ];

      sensitiveKeys.forEach(key => {
        expect(isSensitiveStorageKey(key)).toBe(true);
      });
    });

    test('should allow non-sensitive keys', () => {
      const safeKeys = [
        'user_preferences',
        'theme_settings',
        'last_login',
        'cache_data',
        'ui_state'
      ];

      safeKeys.forEach(key => {
        expect(isSensitiveStorageKey(key)).toBe(false);
      });
    });
  });

  describe('setSafeLocalStorageItem', () => {
    test('should allow safe keys', () => {
      const result = setSafeLocalStorageItem('user_preferences', 'dark_mode');
      expect(result).toBe(true);
      expect(localStorage.getItem('user_preferences')).toBe('dark_mode');
    });

    test('should block sensitive keys', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = setSafeLocalStorageItem('auth_token', 'secret');
      expect(result).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Blocked insecure localStorage write')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle TTL', () => {
      setSafeLocalStorageItem('temp_data', 'value', { ttl: 100 });
      
      // Should be available immediately
      expect(getSafeLocalStorageItem('temp_data')).toBe('value');
      
      // Mock time passage
      jest.useFakeTimers();
      jest.advanceTimersByTime(150);
      
      expect(getSafeLocalStorageItem('temp_data')).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('getStorageUsage', () => {
    test('should calculate storage usage correctly', () => {
      setSafeLocalStorageItem('key1', 'value1');
      setSafeLocalStorageItem('key2', 'value2');
      
      const usage = getStorageUsage();
      expect(usage.items).toBe(2);
      expect(usage.total).toBeGreaterThan(0);
    });
  });

  describe('clearExpiredStorageItems', () => {
    test('should remove expired items', () => {
      setSafeLocalStorageItem('permanent', 'data');
      setSafeLocalStorageItem('temporary', 'data', { ttl: 50 });
      
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);
      
      clearExpiredStorageItems();
      
      expect(getSafeLocalStorageItem('permanent')).toBe('data');
      expect(getSafeLocalStorageItem('temporary')).toBeNull();
      
      jest.useRealTimers();
    });
  });
});

describe('Security Monitor Tests', () => {
  beforeEach(() => {
    securityMonitor.clearData();
  });

  describe('event logging', () => {
    test('should log security events', () => {
      logSecEvent('csrf_failure', 'medium', { test: 'data' }, {
        ip: '192.168.1.1',
        userAgent: 'test-agent',
        url: '/test'
      });

      const metrics = securityMonitor.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.eventsByType['csrf_failure']).toBe(1);
      expect(metrics.eventsBySeverity['medium']).toBe(1);
    });

    test('should track suspicious IPs', () => {
      const ip = '192.168.1.1';
      
      // Log multiple events from same IP
      for (let i = 0; i < 12; i++) {
        logSecEvent('suspicious_activity', 'low', { event: i }, { ip });
      }

      expect(securityMonitor.isIPBlocked(ip)).toBe(true);
    });
  });

  describe('anomaly detection', () => {
    test('should detect suspicious user agents', () => {
      const request = {
        ip: '192.168.1.1',
        userAgent: 'curl/7.68.0',
        url: '/api/test',
        method: 'GET'
      };

      const anomaly = securityMonitor.detectAnomaly(request);
      expect(anomaly.isAnomalous).toBe(true);
      expect(anomaly.reasons).toContain('Suspicious user agent detected');
    });

    test('should detect suspicious URL paths', () => {
      const request = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        url: '/admin/config',
        method: 'GET'
      };

      const anomaly = securityMonitor.detectAnomaly(request);
      expect(anomaly.isAnomalous).toBe(true);
      expect(anomaly.reasons.some(r => r.includes('Suspicious URL path'))).toBe(true);
    });
  });

  describe('report generation', () => {
    test('should generate security report', () => {
      logSecEvent('csrf_failure', 'medium', { test: 'data' });
      logSecEvent('xss_attempt', 'high', { test: 'data' });

      const report = securityMonitor.generateReport();
      expect(report).toContain('Security Report');
      expect(report).toContain('Total Events: 2');
      expect(report).toContain('csrf_failure: 1');
      expect(report).toContain('xss_attempt: 1');
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete security workflow', () => {
    // 1. Validate and sanitize user input
    const userInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeString(userInput);
    
    // 2. Store safely
    setSafeLocalStorageItem('user_input', sanitized);
    
    // 3. Retrieve and verify
    const retrieved = getSafeLocalStorageItem('user_input');
    expect(retrieved).toBe(sanitized);
    expect(retrieved).not.toContain('<script>');
    
    // 4. Log security event
    logSecurityEvent('xss_attempt', 'low', { input: userInput });
    
    // 5. Verify monitoring
    const metrics = securityMonitor.getMetrics();
    expect(metrics.eventsByType['xss_attempt']).toBe(1);
  });
});
