import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SUBSCRIPTION_TOKEN_VERSION = 1;
export const SUBSCRIPTION_TOKEN_PREFIX_LEN = 12;

export type SubscriptionTokenMaterial = {
  rawToken: string;
  tokenHash: string;
  tokenPrefix: string;
  tokenVersion: number;
};

/** SHA-256 hex digest of a raw feed token. Never log rawToken. */
export function hashSubscriptionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * Generate a feed subscription token.
 * rawToken = kccc_feed_ + base64url(32 random bytes); store only the hash.
 */
export function generateSubscriptionToken(): SubscriptionTokenMaterial {
  const rawToken = `kccc_feed_${randomBytes(32).toString("base64url")}`;
  return {
    rawToken,
    tokenHash: hashSubscriptionToken(rawToken),
    tokenPrefix: rawToken.slice(0, SUBSCRIPTION_TOKEN_PREFIX_LEN),
    tokenVersion: SUBSCRIPTION_TOKEN_VERSION,
  };
}

/** Timing-safe equality for hex (or other equal-length) token hashes. */
export function tokensEqual(aHash: string, bHash: string): boolean {
  const a = Buffer.from(aHash, "utf8");
  const b = Buffer.from(bHash, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
