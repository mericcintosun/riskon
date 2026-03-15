/**
 * Environment Initialization
 *
 * This module initializes and validates environment variables at application startup.
 * It should be imported at the top of server-side entry points to ensure
 * configuration is valid before any other code runs.
 *
 * Related Issue: #15 - Environment Variables Validation
 */

import { validateEnv, printEnvSummary, checkMissingEnvVars } from "./env";

/**
 * Initialize environment variables with validation
 * Call this at the start of your server-side code
 */
export function initializeEnv() {
  // Check for missing required variables first
  const missing = checkMissingEnvVars();
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\n💡 Copy .env.example to .env.local and fill in the values");
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Validate all environment variables
  const env = validateEnv();

  // Print configuration summary (development only)
  if (process.env.NODE_ENV === "development") {
    printEnvSummary(env);
  }

  return env;
}

// Auto-initialize in server context (Node.js environment)
// This runs when the module is first imported
if (typeof window === "undefined") {
  try {
    initializeEnv();
  } catch (error) {
    // Allow the application to start even if validation fails in development
    // This prevents blocking during development when not all variables are set
    if (process.env.NODE_ENV === "production") {
      // In production, fail fast
      console.error("🚨 Environment validation failed in production. Application cannot start.");
      throw error;
    } else {
      // In development, warn but continue
      console.warn("⚠️  Environment validation failed. Some features may not work correctly.");
      console.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
