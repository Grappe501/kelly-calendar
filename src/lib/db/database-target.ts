export type DatabaseTargetClass =
  | "missing"
  | "local_loopback"
  | "hosted_postgresql"
  | "unknown_postgresql"
  | "invalid";

export function classifyDatabaseTarget(
  databaseUrl: string | undefined,
): DatabaseTargetClass {
  if (!databaseUrl?.trim()) return "missing";
  if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) return "invalid";
  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:/i, "http:");
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return "local_loopback";
    }
    if (host.includes(".")) return "hosted_postgresql";
    return "unknown_postgresql";
  } catch {
    return "invalid";
  }
}

export function classifySslMode(databaseUrl: string | undefined): string {
  if (!databaseUrl) return "unknown";
  const lower = databaseUrl.toLowerCase();
  if (lower.includes("sslmode=require") || lower.includes("ssl=true")) {
    return "required";
  }
  if (lower.includes("sslmode=disable")) return "disabled";
  if (lower.includes("sslmode=")) return "explicit";
  return "provider_default";
}
