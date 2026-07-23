export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

type Bucket = { count: number; resetAt: number };

/**
 * Development-only in-memory limiter.
 * NOT distributed production protection (ADR-021).
 */
const buckets = new Map<string, Bucket>();

export function checkInMemoryRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(options.key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt: new Date(resetAt),
    };
  }

  existing.count += 1;
  const allowed = existing.count <= options.limit;
  return {
    allowed,
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: new Date(existing.resetAt),
  };
}

export function rateLimitPolicyForRoute(pathname: string): {
  limit: number;
  windowMs: number;
  mode: "permissive" | "moderate" | "strict";
  distributed: false;
} {
  if (pathname.startsWith("/api/health")) {
    return { limit: 120, windowMs: 60_000, mode: "permissive", distributed: false };
  }
  if (pathname.startsWith("/api/ai")) {
    return { limit: 10, windowMs: 60_000, mode: "strict", distributed: false };
  }
  if (pathname.startsWith("/api/calendar/feeds")) {
    return { limit: 60, windowMs: 60_000, mode: "strict", distributed: false };
  }
  if (pathname.startsWith("/api/system")) {
    return { limit: 60, windowMs: 60_000, mode: "moderate", distributed: false };
  }
  return { limit: 90, windowMs: 60_000, mode: "moderate", distributed: false };
}

export function __resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
