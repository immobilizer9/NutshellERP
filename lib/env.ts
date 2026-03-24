/**
 * Validates required environment variables at startup.
 * Import this in instrumentation.ts or any server entry point.
 * Throws on missing vars so the app fails loudly rather than silently.
 */
const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Check your .env file."
    );
  }
}

// Auto-run on import in server context
if (typeof window === "undefined") {
  validateEnv();
}
