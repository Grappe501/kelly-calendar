/** Strip anything that looks like a credential from diagnostic objects. */
export function redactGoogleDiagnostics<T extends Record<string, unknown>>(input: T): T {
  const blocked =
    /secret|token|ciphertext|authTag|authorization|apikey|api_key|refresh|client_secret|bearer/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (blocked.test(key)) {
      out[key] = typeof value === "boolean" ? value : "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && /ya29\.|1\/\/|AIza|sk-/i.test(value)) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = value;
  }
  return out as T;
}
