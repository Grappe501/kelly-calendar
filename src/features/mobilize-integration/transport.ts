import { MOBILIZE_DOCS } from "@/features/mobilize-integration/docs-revision";
import { safeErrorSummary } from "@/features/mobilize-integration/redact";
import type { MobilizeErrorCategory } from "@/features/mobilize-integration/types";

export type MobilizeTransportRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type MobilizeTransportResponse = {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
};

export type MobilizeTransport = (
  req: MobilizeTransportRequest,
) => Promise<MobilizeTransportResponse>;

export class MobilizeTransportError extends Error {
  category: MobilizeErrorCategory;
  status: number | null;
  retryable: boolean;
  retryAfterMs: number | null;

  constructor(input: {
    message: string;
    category: MobilizeErrorCategory;
    status?: number | null;
    retryable?: boolean;
    retryAfterMs?: number | null;
  }) {
    super(safeErrorSummary(input.message));
    this.name = "MobilizeTransportError";
    this.category = input.category;
    this.status = input.status ?? null;
    this.retryable = input.retryable ?? false;
    this.retryAfterMs = input.retryAfterMs ?? null;
  }
}

export function assertAllowlistedMobilizeUrl(
  urlString: string,
  allowlistedHosts: readonly string[] = MOBILIZE_DOCS.allowlistedHosts,
): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new MobilizeTransportError({
      message: "Invalid Mobilize URL.",
      category: "VALIDATION",
    });
  }
  if (url.protocol !== "https:") {
    throw new MobilizeTransportError({
      message: "Mobilize URL must use HTTPS.",
      category: "VALIDATION",
    });
  }
  if (!allowlistedHosts.includes(url.host)) {
    throw new MobilizeTransportError({
      message: "Pagination or request URL host is not allowlisted.",
      category: "VALIDATION",
    });
  }
  return url;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new MobilizeTransportError({
          message: "Aborted.",
          category: "TIMEOUT",
        }),
      );
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(
        new MobilizeTransportError({
          message: "Aborted.",
          category: "TIMEOUT",
        }),
      );
    });
  });
}

function parseRetryAfterMs(headers: Record<string, string>): number | null {
  const raw = headers["retry-after"] ?? headers["Retry-After"];
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

export function createFetchTransport(): MobilizeTransport {
  return async (req) => {
    assertAllowlistedMobilizeUrl(req.url);
    const timeoutMs = req.timeoutMs ?? 20_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    req.signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      const bodyText = await res.text();
      return { status: res.status, headers, bodyText };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new MobilizeTransportError({
          message: "Mobilize request timed out or aborted.",
          category: "TIMEOUT",
          retryable: true,
        });
      }
      throw new MobilizeTransportError({
        message: err instanceof Error ? err.message : "Network error",
        category: "NETWORK",
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", onAbort);
    }
  };
}

export type RateLimitBudget = {
  /** Max GET requests per second (docs: 15; we stay conservative). */
  maxReadsPerSecond: number;
  lastRequestAt: number;
};

export function createRateLimitedTransport(
  inner: MobilizeTransport,
  budget: RateLimitBudget = {
    maxReadsPerSecond: 8,
    lastRequestAt: 0,
  },
): MobilizeTransport {
  return async (req) => {
    const minGap = Math.ceil(1000 / Math.max(1, budget.maxReadsPerSecond));
    const wait = Math.max(0, budget.lastRequestAt + minGap - Date.now());
    if (wait > 0) await sleep(wait, req.signal);
    budget.lastRequestAt = Date.now();
    return inner(req);
  };
}

/** Bounded retries for idempotent GET reads only. */
export async function withReadRetries(
  transport: MobilizeTransport,
  req: MobilizeTransportRequest,
  options?: { maxAttempts?: number; random?: () => number },
): Promise<MobilizeTransportResponse> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const random = options?.random ?? Math.random;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await transport(req);
      if (res.status === 429 && attempt < maxAttempts) {
        const retryAfter =
          parseRetryAfterMs(res.headers) ??
          Math.round(250 * 2 ** (attempt - 1) + random() * 100);
        await sleep(retryAfter, req.signal);
        continue;
      }
      if (res.status >= 500 && attempt < maxAttempts) {
        const backoff = Math.round(200 * 2 ** (attempt - 1) + random() * 100);
        await sleep(backoff, req.signal);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (
        err instanceof MobilizeTransportError &&
        err.retryable &&
        attempt < maxAttempts
      ) {
        const backoff = Math.round(200 * 2 ** (attempt - 1) + random() * 100);
        await sleep(backoff, req.signal);
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new MobilizeTransportError({
        message: "Mobilize read failed after retries.",
        category: "UNAVAILABLE",
      });
}
