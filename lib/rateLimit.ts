/**
 * In-process sliding-window rate limiter.
 *
 * Works well for single-server deployments.
 * For multi-instance / serverless: swap the store for an Upstash Redis client
 * and replace Map operations with atomic INCR + EXPIRE commands.
 */

interface Entry {
  count: number;
  resetAt: number;
}

// Module-level store (persists across requests on the same server process)
const store = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // Unix ms
  retryAfterSec: number; // 0 when allowed
}

/**
 * @param key       Unique identifier, e.g. `login:${ip}` or `api:${userId}`
 * @param max       Max requests allowed per window (default 10)
 * @param windowMs  Window size in milliseconds (default 15 min)
 */
export function checkRateLimit(
  key: string,
  max = 10,
  windowMs = 15 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: max - 1, resetAt: entry.resetAt, retryAfterSec: 0 };
  }

  if (entry.count >= max) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfterSec };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt, retryAfterSec: 0 };
}

// Purge expired entries every 5 minutes to prevent memory growth
if (typeof window === "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
  }, 5 * 60 * 1000).unref?.();
}
