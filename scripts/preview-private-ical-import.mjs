/**
 * Presence check for private Google iCal env integration.
 * Never prints the secret URL value.
 *
 * Usage: npm run import:preview:private-ical
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env } = loadApprovedEnv({ includeRedDirtFallback: false });
const configured = Boolean(
  (process.env.KCCC_GOOGLE_CALENDAR_ICAL_URL ?? env.KCCC_GOOGLE_CALENDAR_ICAL_URL ?? "").trim(),
);

console.log(
  JSON.stringify(
    {
      calendarFeedConfigured: configured,
      envKey: "KCCC_GOOGLE_CALENDAR_ICAL_URL",
      pushSupported: false,
      syncDirection: "IMPORT_ONLY",
      nextStep: configured
        ? "Use /import/google-calendar → Private Google Calendar iCal (server env) → Validate → Preview"
        : "Set KCCC_GOOGLE_CALENDAR_ICAL_URL in .env.local or Netlify env (never commit the value)",
    },
    null,
    2,
  ),
);

if (!configured) {
  console.error("FAIL: KCCC Google Calendar iCal URL is not configured.");
  process.exit(1);
}

console.log("PASS: calendar feed configured (value redacted).");
