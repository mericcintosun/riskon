/**
 * Input Validation and Sanitization Module
 *
 * This module provides comprehensive input validation and sanitization utilities
 * to prevent security vulnerabilities like XSS, injection attacks, and invalid data processing.
 *
 * Related Issue: #18 - Input Validation and Sanitization
 */

import { StrKey } from "@stellar/stellar-sdk";

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string | number;
}

/**
 * Validates a Stellar public key (G... address)
 * @param address - The Stellar address to validate
 * @returns ValidationResult with validity status and error message if invalid
 */
export function validateStellarAddress(address: string): ValidationResult {
  if (!address || typeof address !== "string") {
    return {
      isValid: false,
      error: "Address is required and must be a string",
    };
  }

  const trimmed = address.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "Address cannot be empty",
    };
  }

  // Check if it's a valid Stellar public key (G...)
  try {
    if (StrKey.isValidEd25519PublicKey(trimmed)) {
      return {
        isValid: true,
        sanitized: trimmed,
      };
    }
  } catch (error) {
    // Fall through to contract address check
  }

  // Check if it's a valid contract address (C...)
  try {
    if (StrKey.isValidContract(trimmed)) {
      return {
        isValid: true,
        sanitized: trimmed,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid Stellar address format. Must be a valid G... or C... address",
    };
  }

  return {
    isValid: false,
    error: "Invalid Stellar address format. Must be a valid G... or C... address",
  };
}

/**
 * Validates a Stellar contract ID (C... address)
 * @param contractId - The contract ID to validate
 * @returns ValidationResult with validity status
 */
export function validateContractId(contractId: string): ValidationResult {
  if (!contractId || typeof contractId !== "string") {
    return {
      isValid: false,
      error: "Contract ID is required and must be a string",
    };
  }

  const trimmed = contractId.trim();

  if (!trimmed.startsWith("C")) {
    return {
      isValid: false,
      error: "Contract ID must start with 'C'",
    };
  }

  try {
    if (StrKey.isValidContract(trimmed)) {
      return {
        isValid: true,
        sanitized: trimmed,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid contract ID format",
    };
  }

  return {
    isValid: false,
    error: "Invalid contract ID format",
  };
}

/**
 * Validates and sanitizes a risk score (0-100)
 * @param score - The risk score to validate
 * @returns ValidationResult with validity status and sanitized number
 */
export function validateRiskScore(score: number | string): ValidationResult {
  const numScore = typeof score === "string" ? parseFloat(score) : score;

  if (isNaN(numScore)) {
    return {
      isValid: false,
      error: "Score must be a valid number",
    };
  }

  if (!isFinite(numScore)) {
    return {
      isValid: false,
      error: "Score must be a finite number",
    };
  }

  if (numScore < 0 || numScore > 100) {
    return {
      isValid: false,
      error: "Score must be between 0 and 100",
    };
  }

  return {
    isValid: true,
    sanitized: Math.round(numScore), // Round to nearest integer
  };
}

/**
 * Sanitizes a string to prevent XSS attacks
 * Removes or encodes potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * Escapes unsafe HTML characters for safe rendering in text contexts
 * @param input - Raw user input
 * @returns Escaped string with dangerous characters encoded
 */
export function escapeUnsafeHtml(input: string): string {
  return sanitizeString(input);
}

/**
 * Validates and sanitizes a URL
 * @param url - The URL to validate
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns ValidationResult with validity status and sanitized URL
 */
export function validateUrl(
  url: string,
  allowedProtocols: string[] = ["http", "https"]
): ValidationResult {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      error: "URL is required and must be a string",
    };
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    if (!allowedProtocols.includes(parsed.protocol.replace(":", ""))) {
      return {
        isValid: false,
        error: `URL protocol must be one of: ${allowedProtocols.join(", ")}`,
      };
    }

    return {
      isValid: true,
      sanitized: trimmed,
    };
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }
}

/**
 * Validates a number within a specific range
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field for error messages
 * @returns ValidationResult with validity status and sanitized number
 */
export function validateNumberRange(
  value: number | string,
  min: number,
  max: number,
  fieldName: string = "Value"
): ValidationResult {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (!isFinite(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a finite number`,
    };
  }

  if (numValue < min || numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return {
    isValid: true,
    sanitized: numValue,
  };
}

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns ValidationResult with validity status and sanitized email
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return {
      isValid: false,
      error: "Email is required and must be a string",
    };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex (RFC 5322 compliant would be much more complex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Invalid email format",
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
}

/**
 * Validates a transaction hash
 * @param hash - The transaction hash to validate
 * @returns ValidationResult with validity status
 */
export function validateTransactionHash(hash: string): ValidationResult {
  if (!hash || typeof hash !== "string") {
    return {
      isValid: false,
      error: "Transaction hash is required and must be a string",
    };
  }

  const trimmed = hash.trim();

  // Stellar transaction hashes are 64-character hex strings
  const hashRegex = /^[a-f0-9]{64}$/i;

  if (!hashRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Invalid transaction hash format. Must be a 64-character hexadecimal string",
    };
  }

  return {
    isValid: true,
    sanitized: trimmed.toLowerCase(),
  };
}

/**
 * Validates and sanitizes an amount (for XLM or other assets)
 * @param amount - The amount to validate
 * @param maxDecimals - Maximum allowed decimal places (default: 7 for Stellar)
 * @returns ValidationResult with validity status and sanitized amount
 */
export function validateAmount(
  amount: number | string,
  maxDecimals: number = 7
): ValidationResult {
  if (amount === null || amount === undefined) {
    return {
      isValid: false,
      error: "Amount is required",
    };
  }

  const strAmount = typeof amount === "number" ? amount.toString() : amount;
  const numAmount = parseFloat(strAmount);

  if (isNaN(numAmount)) {
    return {
      isValid: false,
      error: "Amount must be a valid number",
    };
  }

  if (!isFinite(numAmount)) {
    return {
      isValid: false,
      error: "Amount must be a finite number",
    };
  }

  if (numAmount <= 0) {
    return {
      isValid: false,
      error: "Amount must be greater than 0",
    };
  }

  // Check decimal places
  const parts = strAmount.split(".");
  if (parts.length > 1 && parts[1].length > maxDecimals) {
    return {
      isValid: false,
      error: `Amount cannot have more than ${maxDecimals} decimal places`,
    };
  }

  return {
    isValid: true,
    sanitized: numAmount,
  };
}

/**
 * Validates an object against multiple validation rules
 * Useful for form validation
 *
 * @param data - The object to validate
 * @param rules - Object mapping field names to validation functions
 * @returns Object with validity status and errors for each field
 */
export function validateObject<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, (value: any) => ValidationResult>
): {
  isValid: boolean;
  errors: Partial<Record<keyof T, string>>;
  sanitized: Partial<T>;
} {
  const errors: Partial<Record<keyof T, string>> = {};
  const sanitized: Partial<T> = {};
  let isValid = true;

  for (const field in rules) {
    const result = rules[field](data[field]);
    if (!result.isValid) {
      errors[field] = result.error;
      isValid = false;
    } else if (result.sanitized !== undefined) {
      sanitized[field] = result.sanitized;
    }
  }

  return { isValid, errors, sanitized };
}

/**
 * Strips HTML tags from a string
 * @param input - The string to strip
 * @returns String without HTML tags
 */
export function stripHtmlTags(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validates a Stellar asset code
 * @param assetCode - The asset code to validate
 * @returns ValidationResult with validity status
 */
export function validateAssetCode(assetCode: string): ValidationResult {
  if (!assetCode || typeof assetCode !== "string") {
    return {
      isValid: false,
      error: "Asset code is required and must be a string",
    };
  }

  const trimmed = assetCode.trim().toUpperCase();

  // Asset codes must be 1-12 alphanumeric characters
  const assetCodeRegex = /^[A-Z0-9]{1,12}$/;

  if (!assetCodeRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Asset code must be 1-12 alphanumeric characters",
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
}

/**
 * Exports for convenience
 */
export const Validators = {
  stellarAddress: validateStellarAddress,
  contractId: validateContractId,
  riskScore: validateRiskScore,
  url: validateUrl,
  numberRange: validateNumberRange,
  email: validateEmail,
  transactionHash: validateTransactionHash,
  amount: validateAmount,
  assetCode: validateAssetCode,
};

export const Sanitizers = {
  string: sanitizeString,
  stripHtml: stripHtmlTags,
};
