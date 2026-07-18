import "server-only";

import { z } from "zod";
import {
  applyLoadedEnvToProcess,
  loadApprovedEnvironment,
} from "@/lib/env/load-server-environment";
import type { ServerEnvironment } from "@/lib/env/types";

const postgresUrl = z
  .string()
  .refine(
    (value) => /^postgres(ql)?:\/\//i.test(value),
    "Database URL must use a PostgreSQL protocol",
  );

const serverSchema = z.object({
  databaseUrl: postgresUrl.optional(),
  directUrl: postgresUrl.optional(),
  openAiApiKey: z.string().min(20).optional(),
  supabaseServiceRoleKey: z.string().min(20).optional(),
  appSessionSecret: z.string().min(16).optional(),
  internalApiSecret: z.string().min(16).optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  redDirtFallbackEnabled: z.boolean(),
});

export function getServerEnvironment(): ServerEnvironment {
  const loaded = loadApprovedEnvironment();
  applyLoadedEnvToProcess(loaded);
  const env = loaded.env;

  const raw = {
    databaseUrl: env.DATABASE_URL || undefined,
    directUrl: env.DIRECT_URL || undefined,
    openAiApiKey: env.OPENAI_API_KEY || undefined,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    appSessionSecret: env.APP_SESSION_SECRET || undefined,
    internalApiSecret: env.INTERNAL_API_SECRET || undefined,
    logLevel: (env.LOG_LEVEL as ServerEnvironment["logLevel"] | undefined) ??
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    redDirtFallbackEnabled: loaded.redDirtFallbackEnabled,
  };

  const parsed = serverSchema.safeParse(raw);
  if (!parsed.success) {
    // Soft-fail optional secrets: strip invalid optional fields
    const soft = {
      ...raw,
      databaseUrl: raw.databaseUrl && postgresUrl.safeParse(raw.databaseUrl).success
        ? raw.databaseUrl
        : undefined,
      directUrl: raw.directUrl && postgresUrl.safeParse(raw.directUrl).success
        ? raw.directUrl
        : undefined,
      openAiApiKey:
        raw.openAiApiKey && raw.openAiApiKey.length >= 20 ? raw.openAiApiKey : undefined,
      supabaseServiceRoleKey:
        raw.supabaseServiceRoleKey && raw.supabaseServiceRoleKey.length >= 20
          ? raw.supabaseServiceRoleKey
          : undefined,
      appSessionSecret:
        raw.appSessionSecret && raw.appSessionSecret.length >= 16
          ? raw.appSessionSecret
          : undefined,
      internalApiSecret:
        raw.internalApiSecret && raw.internalApiSecret.length >= 16
          ? raw.internalApiSecret
          : undefined,
      logLevel: (["debug", "info", "warn", "error"] as const).includes(
        raw.logLevel as ServerEnvironment["logLevel"],
      )
        ? raw.logLevel
        : "info",
    };
    return soft as ServerEnvironment;
  }

  return parsed.data;
}
