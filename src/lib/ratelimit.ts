/**
 * Simple in-memory fixed-window rate limiter.
 *
 * NOTE: in-memory state is per-serverless-instance and resets on cold start, so
 * it is a best-effort guard for the MVP. For production-grade limits across
 * instances, back this with a shared store (e.g. Upstash Redis).
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetMs: existing.resetAt - now };
}

/** Test helper: clear all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
