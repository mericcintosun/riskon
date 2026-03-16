/**
 * Environment Variables Validation
 *
 * This module provides runtime validation of environment variables using Zod.
 * It ensures all required configuration is present and valid before the application starts,
 * preventing runtime errors caused by missing or misconfigured environment variables.
 *
 * Related Issue: #15 - Environment Variables Validation
 */

import { z } from "zod";

/**
 * Stellar network types
 */
const stellarNetworkSchema = z.enum(["TESTNET", "PUBLIC"], {
  errorMap: () => ({ message: "STELLAR_NETWORK must be either 'TESTNET' or 'PUBLIC'" }),
});

/**
 * URL validation with custom error messages
 */
const urlSchema = z.string().url({ message: "Must be a valid URL" });

/**
 * Stellar contract ID validation (base32 encoded, 56 characters)
 */
const contractIdSchema = z
  .string()
  .regex(/^C[A-Z0-9]{55}$/, {
    message: "Must be a valid Stellar contract ID (56 characters, starting with 'C')",
  })
  .optional();

/**
 * Boolean environment variable schema (accepts 'true', 'false', '1', '0')
 */
const booleanEnvSchema = z
  .string()
  .transform((val) => val === "true" || val === "1")
  .pipe(z.boolean());

/**
 * Number environment variable schema
 */
const numberEnvSchema = z
  .string()
  .regex(/^\d+$/, { message: "Must be a valid number" })
  .transform((val) => parseInt(val, 10));

/**
 * Port number schema (1-65535)
 */
const portSchema = numberEnvSchema.refine((port) => port >= 1 && port <= 65535, {
  message: "Port must be between 1 and 65535",
});

/**
 * Schema for client-side (browser) environment variables
 * These are prefixed with NEXT_PUBLIC_ and accessible in the browser
 */
const clientEnvSchema = z.object({
  // Network Configuration
  NEXT_PUBLIC_RPC_URL: urlSchema,
  NEXT_PUBLIC_NETWORK_PASSPHRASE: z.string().min(1, "Network passphrase is required"),
  NEXT_PUBLIC_RISK_TIER_CONTRACT_ID: contractIdSchema,
  NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID: contractIdSchema,
  NEXT_PUBLIC_FACTORY_CONTRACT_ID: contractIdSchema,

  // Passkey Configuration
  NEXT_PUBLIC_PASSKEY_ENABLED: booleanEnvSchema.optional().default("true"),
  NEXT_PUBLIC_WEBAUTHN_ORIGIN: urlSchema.optional(),

  // API Endpoints
  NEXT_PUBLIC_API_BASE_URL: urlSchema.optional(),
  NEXT_PUBLIC_LIQUIDITY_API_URL: urlSchema.optional(),
  NEXT_PUBLIC_LAUNCHTUBE_API_URL: urlSchema.optional(),

  // Environment
  NEXT_PUBLIC_ENVIRONMENT: z.enum(["development", "production", "test"]).optional(),

  // Observability
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
});

/**
 * Schema for server-side environment variables
 * These are only accessible in server-side code and API routes
 */
const serverEnvSchema = z.object({
  // Network Configuration
  STELLAR_NETWORK: stellarNetworkSchema.optional().default("TESTNET"),
  STELLAR_RPC_URL: urlSchema.optional(),
  HORIZON_URL: urlSchema.optional(),
  STELLAR_NETWORK_PASSPHRASE: z.string().optional(),

  // Redis Configuration
  REDIS_HOST: z.string().optional().default("localhost"),
  REDIS_PORT: portSchema.optional().default("6379"),
  REDIS_PASSWORD: z.string().optional(),

  // Backend Services
  MONITORING_INTERVAL: numberEnvSchema.optional().default("300000"),
  LIQUIDITY_API_PORT: portSchema.optional().default("3001"),

  // API Configuration
  HORIZON_API_TIMEOUT: numberEnvSchema.optional().default("30000"),
  RPC_API_TIMEOUT: numberEnvSchema.optional().default("15000"),

  // Security
  JWT_SECRET: z.string().optional(),
  RATE_LIMIT_REQUESTS_PER_MINUTE: numberEnvSchema.optional().default("100"),
  RATE_LIMIT_WINDOW_MS: numberEnvSchema.optional().default("60000"),

  // External Services
  LAUNCHTUBE_JWT: z.string().optional(),
  MERCURY_URL: urlSchema.optional(),
  MERCURY_JWT: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  PLAUSIBLE_DOMAIN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  SLOW_API_THRESHOLD_MS: numberEnvSchema.optional().default("1000"),

  // Feature Flags
  FEATURE_PASSKEY_WALLET: booleanEnvSchema.optional().default("true"),
  FEATURE_LIQUIDITY_MONITORING: booleanEnvSchema.optional().default("true"),
  FEATURE_RISK_TIER_SYSTEM: booleanEnvSchema.optional().default("true"),
  FEATURE_AUTO_RISK_ANALYSIS: booleanEnvSchema.optional().default("true"),
  FEATURE_LAUNCHTUBE_SPONSORSHIP: booleanEnvSchema.optional().default("true"),

  // Debug Flags
  DEBUG_LIQUIDITY_MONITORING: booleanEnvSchema.optional().default("false"),
  DEBUG_RISK_CALCULATIONS: booleanEnvSchema.optional().default("false"),
  DEBUG_PASSKEY_OPERATIONS: booleanEnvSchema.optional().default("false"),
  DEBUG_CONTRACT_CALLS: booleanEnvSchema.optional().default("false"),

  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
});

/**
 * Combined environment schema (client + server)
 */
const envSchema = clientEnvSchema.merge(serverEnvSchema);

/**
 * Type definitions for validated environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = z.infer<typeof envSchema>;

/**
 * Validates client-side environment variables
 * This should be called in browser code to ensure client config is valid
 */
export function validateClientEnv(): ClientEnv {
  try {
    const clientEnv: Record<string, string | undefined> = {};

    // Extract NEXT_PUBLIC_ variables from process.env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("NEXT_PUBLIC_")) {
        clientEnv[key] = process.env[key];
      }
    });

    return clientEnvSchema.parse(clientEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = formatZodError(error);
      console.error("❌ Client environment validation failed:");
      console.error(errorMessage);
      throw new Error(`Client environment validation failed:\n${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Validates server-side environment variables
 * This should be called in server-side code or API routes
 */
export function validateServerEnv(): ServerEnv {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = formatZodError(error);
      console.error("❌ Server environment validation failed:");
      console.error(errorMessage);
      throw new Error(`Server environment validation failed:\n${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Validates all environment variables (client + server)
 * This should be called during application startup
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = formatZodError(error);
      console.error("❌ Environment validation failed:");
      console.error(errorMessage);
      throw new Error(`Environment validation failed:\n${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Formats Zod validation errors into a readable string
 */
function formatZodError(error: z.ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join(".");
      const message = err.message;
      const value = err.code === "invalid_type" && "received" in err ? err.received : "undefined";
      return `  • ${path}: ${message} (received: ${value})`;
    })
    .join("\n");
}

/**
 * Type-safe helper to get environment variables
 * Use this instead of process.env for better type safety
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return process.env[key] as Env[K];
}

/**
 * Checks if all required environment variables are set
 * Returns an array of missing variables
 */
export function checkMissingEnvVars(): string[] {
  const required: (keyof Env)[] = [
    "NEXT_PUBLIC_RPC_URL",
    "NEXT_PUBLIC_NETWORK_PASSPHRASE",
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  return missing;
}

/**
 * Prints environment configuration summary (without sensitive data)
 */
export function printEnvSummary(env: Env): void {
  console.log("\n🔧 Environment Configuration Summary:");
  console.log(`  Network: ${env.STELLAR_NETWORK || "TESTNET"}`);
  console.log(`  Node Environment: ${env.NODE_ENV}`);
  console.log(`  RPC URL: ${env.NEXT_PUBLIC_RPC_URL}`);
  console.log(`  Network Passphrase: ${env.NEXT_PUBLIC_NETWORK_PASSPHRASE}`);
  console.log(`  Risk Tier Contract: ${env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID || "Not set"}`);
  console.log(`  Passkey Enabled: ${env.NEXT_PUBLIC_PASSKEY_ENABLED}`);
  console.log(`  Redis: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  console.log(`  Liquidity API Port: ${env.LIQUIDITY_API_PORT}\n`);
}
