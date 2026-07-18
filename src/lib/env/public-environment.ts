import { z } from "zod";
import type { PublicEnvironment } from "@/lib/env/types";

const timezoneSchema = z.string().min(1).refine((value) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Invalid IANA timezone");

const electionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Election date must be YYYY-MM-DD");

const publicSchema = z.object({
  appName: z.string().min(1),
  appUrl: z.string().url(),
  campaignTimezone: timezoneSchema,
  electionDate: electionDateSchema,
  supabaseUrl: z.string().url().optional(),
  supabasePublishableKey: z.string().min(1).optional(),
});

export function getPublicEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PublicEnvironment {
  const isProd = (env.NODE_ENV ?? process.env.NODE_ENV) === "production";
  const raw = {
    appName: env.NEXT_PUBLIC_APP_NAME ?? "Kelly Campaign Command Calendar",
    appUrl: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    campaignTimezone: env.NEXT_PUBLIC_CAMPAIGN_TIMEZONE ?? "America/Chicago",
    electionDate: env.NEXT_PUBLIC_ELECTION_DATE ?? "2026-11-03",
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabasePublishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  };

  const parsed = publicSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Public environment invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  if (
    isProd &&
    parsed.data.supabaseUrl &&
    !parsed.data.supabaseUrl.startsWith("https://")
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be HTTPS in production");
  }

  return parsed.data;
}

export function tryGetPublicEnvironment(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { ok: true; value: PublicEnvironment } | { ok: false; error: string } {
  try {
    return { ok: true, value: getPublicEnvironment(env) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Public environment invalid",
    };
  }
}
