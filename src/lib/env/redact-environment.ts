const REDACTED = "[REDACTED]";

const SENSITIVE_KEY =
  /^(password|secret|token|apikey|api_key|key|authorization|cookie|databaseurl|directurl|accesstoken|refreshtoken|sessionid|openai|service.?role)$/i;

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "");
  return SENSITIVE_KEY.test(normalized) || /secret|password|token|apikey/i.test(key);
}

function looksLikeSecretValue(value: string): boolean {
  if (/^sk-[a-zA-Z0-9_-]{10,}/.test(value)) return true;
  if (/^Bearer\s+\S+/i.test(value)) return true;
  if (/postgres(ql)?:\/\//i.test(value)) return true;
  if (/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/.test(value)) return true;
  // Google private/secret iCal addresses are bearer secrets in the path.
  if (/calendar\.google\.com\/calendar\/ical\//i.test(value) && /\/private/i.test(value)) {
    return true;
  }
  if (/KCCC_GOOGLE_CALENDAR_ICAL_URL/i.test(value)) return true;
  return false;
}

export function redactDatabaseUrl(url: string | undefined): {
  protocol: string;
  targetClass: "local" | "hosted" | "unknown" | "missing";
  host: string;
  port?: string;
} {
  if (!url?.trim()) {
    return { protocol: "missing", targetClass: "missing", host: "[REDACTED]" };
  }
  try {
    const normalized = url.replace(/^postgres(ql)?:/i, "http:");
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
    const hostHint = isLocal
      ? "loopback"
      : host.includes(".")
        ? `${host.slice(0, 2)}***`
        : "unknown";
    return {
      protocol: "postgresql",
      targetClass: isLocal ? "local" : host.includes(".") ? "hosted" : "unknown",
      host: hostHint,
      port: parsed.port || undefined,
    };
  } catch {
    return { protocol: "postgresql", targetClass: "unknown", host: "[REDACTED]" };
  }
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return looksLikeSecretValue(value) ? REDACTED : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactValue(nested);
      }
    }
    return out;
  }
  return value;
}

export function redactForLog(data: unknown): unknown {
  return redactValue(data);
}
