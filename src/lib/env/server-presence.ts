import { classifyDatabaseTarget } from "@/lib/db/database-target";

/** @deprecated Prefer getEnvironmentCapabilityStatus — kept for Step 2 test compatibility. */
export type SecretPresence = {
  databaseUrl: boolean;
  directUrl: boolean;
  openaiApiKey: boolean;
  supabaseUrl: boolean;
  supabasePublishableKey: boolean;
  supabaseServiceRoleKey: boolean;
};

export function getSecretPresence(
  env: NodeJS.ProcessEnv = process.env,
): SecretPresence {
  return {
    databaseUrl: Boolean(env.DATABASE_URL?.trim()),
    directUrl: Boolean(env.DIRECT_URL?.trim()),
    openaiApiKey: Boolean(env.OPENAI_API_KEY?.trim()),
    supabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabasePublishableKey: Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()),
    supabaseServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

export function redactConnectionTarget(databaseUrl: string | undefined): {
  present: boolean;
  targetType: ReturnType<typeof classifyDatabaseTarget>;
} {
  const targetType = classifyDatabaseTarget(databaseUrl);
  return {
    present: targetType !== "missing",
    targetType,
  };
}
