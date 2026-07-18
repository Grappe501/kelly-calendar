export function normalizeHost(host: string | null): string | null {
  if (!host) return null;
  return host.trim().toLowerCase().replace(/\.$/, "");
}

export function getAllowedOrigins(env: {
  appUrl?: string;
  url?: string;
  deployUrl?: string;
  nodeEnv?: string;
}): string[] {
  const origins = new Set<string>();
  for (const candidate of [env.appUrl, env.url, env.deployUrl]) {
    if (!candidate) continue;
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // ignore
    }
  }
  if ((env.nodeEnv ?? process.env.NODE_ENV) !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

export function isAllowedOrigin(
  origin: string | null,
  allowedOrigins: string[],
): boolean {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

export function isSameOriginRequest(options: {
  origin: string | null;
  host: string | null;
  proto?: string | null;
}): boolean {
  const host = normalizeHost(options.host);
  if (!options.origin || !host) return false;
  try {
    const originUrl = new URL(options.origin);
    const expectedHost = originUrl.host.toLowerCase();
    return expectedHost === host;
  } catch {
    return false;
  }
}

/** Foundation only — mutation routes in later steps must enforce CSRF + session. */
export function csrfTokensMatch(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length < 16 || headerToken.length < 16) return false;
  return cookieToken === headerToken;
}
