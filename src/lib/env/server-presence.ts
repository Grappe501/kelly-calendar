/**
 * Server-only presence checks. Never return secret values.
 */

export type SecretPresence = {
  databaseUrl: boolean;
  directUrl: boolean;
  openaiApiKey: boolean;
  supabaseUrl: boolean;
  supabasePublishableKey: boolean;
  supabaseServiceRoleKey: boolean;
};

export function getSecretPresence(): SecretPresence {
  return {
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    directUrl: Boolean(process.env.DIRECT_URL?.trim()),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabasePublishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
    ),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

export function redactConnectionTarget(databaseUrl: string | undefined): {
  present: boolean;
  targetType: "missing" | "local_loopback" | "hosted_postgresql" | "unknown";
} {
  if (!databaseUrl?.trim()) {
    return { present: false, targetType: "missing" };
  }

  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:/i, "http:");
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return { present: true, targetType: "local_loopback" };
    }
    if (url.protocol.startsWith("http") && host.includes(".")) {
      return { present: true, targetType: "hosted_postgresql" };
    }
    return { present: true, targetType: "unknown" };
  } catch {
    return { present: true, targetType: "unknown" };
  }
}
