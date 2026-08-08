/**
 * Simple in-memory rate limiter.
 *
 * Uses a sliding-window bucket per key (typically an IP address). Suitable
 * for a single-server deployment; for multi-instance production, replace
 * the Map with Redis or a shared store.
 *
 * The limiter is intentionally simple — no external dependencies, no
 * background cleanup (expired entries are lazily evicted on access).
 */

interface Bucket {
  /** Timestamps of requests within the window. */
  hits: number[];
}

interface RateLimitConfig {
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/** Default limits for auth endpoints. */
export const RATE_LIMITS = {
  register: { maxRequests: 5, windowMs: 60_000 }, // 5 per minute
  login: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
} as const;

const buckets = new Map<string, Bucket>();

/**
 * Check whether a request from `key` should be allowed under the given config.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`.
 *
 * Side-effecting: records the hit if allowed.
 */
export function rateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const existing = buckets.get(key);
  // Keep only hits within the sliding window.
  const hits = existing?.hits.filter((t) => t > windowStart) ?? [];

  if (hits.length >= config.maxRequests) {
    // Oldest hit in the window — caller must wait until it exits the window.
    const oldest = hits[0];
    const retryAfterMs = oldest + config.windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  // Record the hit.
  hits.push(now);
  buckets.set(key, { hits });
  return { allowed: true };
}

/** Extract a client identifier from a Request (IP address, with fallback). */
export function getClientId(request: Request): string {
  // Prefer the forwarded-for header (behind Caddy/load balancer).
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Convert a retryAfterMs value to seconds for the Retry-After header. */
export function retryAfterSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}
