import {
  checkInMemoryRateLimit,
  rateLimitPolicyForRoute,
} from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/security/safe-error";

export function enforceScaffoldRateLimit(pathname: string, key: string): void {
  const policy = rateLimitPolicyForRoute(pathname);
  const result = checkInMemoryRateLimit({
    key: `${pathname}:${key}`,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });
  if (!result.allowed) {
    throw new RateLimitError();
  }
}
