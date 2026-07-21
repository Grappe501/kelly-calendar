export type RateLimitState = {
  limited: boolean;
  retryAfterMs: number | null;
  remaining: number;
};

/** Simple in-memory token bucket for operator-triggered batches (not durable). */
export class BoundedTokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillPerSecond,
    );
    this.lastRefill = now;
  }

  tryTake(count = 1): RateLimitState {
    this.refill();
    if (this.tokens < count) {
      const need = count - this.tokens;
      const retryAfterMs = Math.ceil((need / this.refillPerSecond) * 1000);
      return { limited: true, retryAfterMs, remaining: Math.floor(this.tokens) };
    }
    this.tokens -= count;
    return {
      limited: false,
      retryAfterMs: null,
      remaining: Math.floor(this.tokens),
    };
  }
}

export function computeBackoffMs(
  attempt: number,
  baseMs = 250,
  maxMs = 30_000,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(250, exp * 0.2));
  return exp + jitter;
}

export function shouldRetryDispatch(errorCategory: string | null): boolean {
  if (!errorCategory) return false;
  return (
    errorCategory === "RATE_LIMIT" ||
    errorCategory === "TRANSIENT_FAILURE" ||
    errorCategory === "TIMEOUT_BEFORE_SEND"
  );
}
