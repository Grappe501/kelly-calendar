const SENSITIVE =
  /authorization|bearer\s+[a-z0-9._~+/=-]+|api[_-]?key|reddirt_api_key/gi;

/** Redact secrets from diagnostics, logs, and error summaries. */
export function redactRedDirtDiagnostics(input: unknown): unknown {
  if (input == null) return input;
  if (typeof input === "string") {
    return input.replace(SENSITIVE, "[REDACTED]");
  }
  if (Array.isArray(input)) {
    return input.map(redactRedDirtDiagnostics);
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      if (/authorization|api.?key|secret|token|password|email|phone/i.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactRedDirtDiagnostics(value);
      }
    }
    return out;
  }
  return input;
}

export function safeErrorSummary(message: string, max = 400): string {
  return String(redactRedDirtDiagnostics(message)).slice(0, max);
}
