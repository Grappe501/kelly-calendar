import { REDDIRT_DOCS } from "@/features/reddirt-integration/docs-revision";
import { safeErrorSummary } from "@/features/reddirt-integration/redact";
import type { RedDirtErrorCategory } from "@/features/reddirt-integration/types";

export type RedDirtTransportRequest = {
  method: "GET";
  url: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type RedDirtTransportResponse = {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
};

export type RedDirtTransport = (
  req: RedDirtTransportRequest,
) => Promise<RedDirtTransportResponse>;

export class RedDirtTransportError extends Error {
  category: RedDirtErrorCategory;
  status: number | null;
  retryable: boolean;

  constructor(input: {
    message: string;
    category: RedDirtErrorCategory;
    status?: number | null;
    retryable?: boolean;
  }) {
    super(safeErrorSummary(input.message));
    this.name = "RedDirtTransportError";
    this.category = input.category;
    this.status = input.status ?? null;
    this.retryable = input.retryable ?? false;
  }
}

export function assertAllowlistedRedDirtUrl(
  urlString: string,
  allowlistedHosts: readonly string[] = REDDIRT_DOCS.allowlistedHosts,
): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new RedDirtTransportError({
      message: "Invalid RedDirt URL.",
      category: "VALIDATION",
    });
  }
  if (url.protocol !== "https:") {
    throw new RedDirtTransportError({
      message: "RedDirt URL must use HTTPS.",
      category: "VALIDATION",
    });
  }
  if (!allowlistedHosts.includes(url.host)) {
    throw new RedDirtTransportError({
      message: "Pagination or request URL host is not allowlisted.",
      category: "VALIDATION",
    });
  }
  return url;
}

/** GET-only fetch transport. POST/PUT/PATCH/DELETE are not exposed. */
export function createRedDirtFetchTransport(): RedDirtTransport {
  return async (req) => {
    if (req.method !== "GET") {
      throw new RedDirtTransportError({
        message: "RedDirt transport allows GET only.",
        category: "UNSUPPORTED",
      });
    }
    assertAllowlistedRedDirtUrl(req.url);
    const timeoutMs = req.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(req.url, {
        method: "GET",
        headers: req.headers,
        signal: controller.signal,
        redirect: "error",
      });
      const bodyText = await res.text();
      if (bodyText.length > 2_000_000) {
        throw new RedDirtTransportError({
          message: "RedDirt response exceeds size bound.",
          category: "VALIDATION",
          status: res.status,
        });
      }
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      return { status: res.status, headers, bodyText };
    } catch (err) {
      if (err instanceof RedDirtTransportError) throw err;
      throw new RedDirtTransportError({
        message: err instanceof Error ? err.message : "RedDirt network error",
        category: "NETWORK",
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}

export async function withReadRetries(
  run: () => Promise<RedDirtTransportResponse>,
  attempts = 2,
): Promise<RedDirtTransportResponse> {
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await run();
      if (res.status === 429 && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      last = err;
      if (
        err instanceof RedDirtTransportError &&
        err.retryable &&
        i < attempts - 1
      ) {
        await new Promise((r) => setTimeout(r, 250 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw last;
}
