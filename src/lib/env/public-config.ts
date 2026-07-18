import { z } from "zod";

const timezoneSchema = z
  .string()
  .min(1)
  .refine((value) => {
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

const publicEnvSchema = z.object({
  appName: z.string().min(1),
  appUrl: z.string().url().or(z.literal("http://localhost:3000")),
  campaignTimezone: timezoneSchema,
  electionDate: electionDateSchema,
});

export type PublicAppConfig = z.infer<typeof publicEnvSchema>;

export function getPublicAppConfig(): PublicAppConfig {
  return publicEnvSchema.parse({
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Kelly Campaign Command Calendar",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    campaignTimezone: process.env.NEXT_PUBLIC_CAMPAIGN_TIMEZONE ?? "America/Chicago",
    electionDate: process.env.NEXT_PUBLIC_ELECTION_DATE ?? "2026-11-03",
  });
}

export function isTimezoneValid(value: string): boolean {
  return timezoneSchema.safeParse(value).success;
}

export function isElectionDateValid(value: string): boolean {
  return electionDateSchema.safeParse(value).success;
}
