import "server-only";

import { loadApprovedEnvironment } from "@/lib/env/load-server-environment";
import { AppError } from "@/lib/security/safe-error";

export const PRIVATE_ICAL_ENV_KEY = "KCCC_GOOGLE_CALENDAR_ICAL_URL" as const;

/**
 * Presence-only check. Never returns or logs the secret value.
 */
export function isPrivateGoogleIcalConfigured(): boolean {
  const loaded = loadApprovedEnvironment();
  const value = (loaded.env[PRIVATE_ICAL_ENV_KEY] ?? process.env[PRIVATE_ICAL_ENV_KEY] ?? "").trim();
  return value.length > 0;
}

/**
 * Server-only accessor for the secret iCal feed URL.
 * Callers must not log, persist, or return this string to the browser.
 */
export function requirePrivateGoogleIcalUrl(): string {
  const loaded = loadApprovedEnvironment();
  const value = (loaded.env[PRIVATE_ICAL_ENV_KEY] ?? process.env[PRIVATE_ICAL_ENV_KEY] ?? "").trim();
  if (!value) {
    throw new AppError({
      code: "CONFIGURATION_ERROR",
      status: 503,
      publicMessage: "KCCC Google Calendar iCal URL is not configured.",
    });
  }
  return value;
}

export function privateIcalConfigStatus(): {
  calendarFeedConfigured: boolean;
  envKey: typeof PRIVATE_ICAL_ENV_KEY;
  syncDirection: "IMPORT_ONLY";
  pushSupported: false;
} {
  return {
    calendarFeedConfigured: isPrivateGoogleIcalConfigured(),
    envKey: PRIVATE_ICAL_ENV_KEY,
    syncDirection: "IMPORT_ONLY",
    pushSupported: false,
  };
}
