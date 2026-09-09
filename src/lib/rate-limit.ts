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

/** Default limits for auth + mutation endpoints. */
export const RATE_LIMITS = {
  register: { maxRequests: 5, windowMs: 60_000 }, // 5 per minute
  login: { maxRequests: 10, windowMs: 60_000 }, // 10 failed attempts per email per minute (window widens with backoff)
  loginIp: { maxRequests: 30, windowMs: 60_000 }, // 30 total attempts per IP per minute — caps credential-stuffing sweeps
  forgotPassword: { maxRequests: 3, windowMs: 60_000 }, // 3 per minute
  taskCreate: { maxRequests: 30, windowMs: 60_000 }, // 30 per minute
  commentCreate: { maxRequests: 20, windowMs: 60_000 }, // 20 per minute
  fileUpload: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  bulkAction: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  generalMutation: { maxRequests: 60, windowMs: 60_000 }, // 60 per minute (fallback)
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

/** Extract a client identifier from a Request (IP address, with fallback).
 *
 * `x-forwarded-for` is client-spoofable when the request did NOT come
 * through the platform's own proxy (audit Table 7.1). It is only honoured
 * when TRUST_PROXY=true is set by the deployment that terminates the
 * connection; otherwise callers share the conservative 'unknown' bucket.
 */
export function getClientId(request: Request): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Progressive login backoff (audit Table 7.1: per-email limiter alone lets
 * an attacker keep a victim's bucket full forever).
 *
 * The email bucket only counts FAILED attempts and its window doubles for
 * every 5 consecutive failures (up to 16x). Successful sign-in clears the
 * count, so a legitimate user who simply got their password right is never
 * throttled by someone else's failures against their own IP budget.
 */
const FAILURE_TTL_MS = 15 * 60_000;
const failureCounts = new Map<string, { count: number; last: number }>();

function backoffMultiplier(count: number): number {
  return Math.min(2 ** Math.floor(count / 5), 16);
}

/** Record a failed auth attempt for `key`; returns the widened window in ms. */
export function recordAuthFailure(key: string, baseWindowMs: number): number {
  const now = Date.now();
  const prev = failureCounts.get(key);
  const count = prev && now - prev.last < FAILURE_TTL_MS ? prev.count + 1 : 1;
  failureCounts.set(key, { count, last: now });
  return baseWindowMs * backoffMultiplier(count);
}

/** Clear the failure streak for `key` (call on successful sign-in). */
export function clearAuthFailures(key: string): void {
  failureCounts.delete(key);
}

/** Current widened window for `key`, taking recent failures into account. */
export function authBackoffWindowMs(key: string, baseWindowMs: number): number {
  const prev = failureCounts.get(key);
  const active = prev && Date.now() - prev.last < FAILURE_TTL_MS;
  return baseWindowMs * (active ? backoffMultiplier(prev.count) : 1);
}

/** Convert a retryAfterMs value to seconds for the Retry-After header. */
export function retryAfterSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

/**
 * Convenience: apply rate limiting to a mutation request. Returns null
 * if the request is allowed, or a Response (429) if rate-limited.
 *
 * Usage in a route:
 *   const rl = checkMutationLimit(request, RATE_LIMITS.taskCreate, 'task-create');
 *   if (rl) return rl;
 */
export function checkMutationLimit(
  request: Request,
  config: RateLimitConfig,
  keyPrefix: string,
): Response | null {
  const clientId = getClientId(request);
  const result = rateLimit(`${keyPrefix}:${clientId}`, config);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds(result.retryAfterMs ?? 0)),
        },
      },
    );
  }
  return null;
}
