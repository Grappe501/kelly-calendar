/**
 * Historical Google Calendar import (dry-run default).
 * Skips safely when OAuth is not configured.
 */
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fromArg = args.find((a) => a.startsWith("--from="))?.slice("--from=".length);
const toArg = args.find((a) => a.startsWith("--to="))?.slice("--to=".length);

const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;

if (!oauthOk) {
  console.log(
    JSON.stringify(
      {
        googleOAuth: "NOT CONFIGURED",
        calendarImport: "SKIPPED SAFELY",
        dryRun: !apply,
        from: fromArg || env.historyStart,
        to: toArg || "present",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (apply && !env.syncEnabled) {
  console.log(
    JSON.stringify(
      {
        googleOAuth: "CONFIGURED",
        calendarImport: "SKIPPED SAFELY",
        reason: "KCCC_GOOGLE_SYNC_ENABLED=false",
        dryRun: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// Live apply/dry-run against DB requires Next server modules + connected refresh token.
// Operators use the admin panel or `google:oauth:connect` then re-run with APPLY via API later.
console.log(
  JSON.stringify(
    {
      googleOAuth: "CONFIGURED",
      calendarImport: apply ? "APPLY_REQUIRES_CONNECTED_SESSION" : "DRY_RUN_READY",
      message:
        "Credentials present. Connect via /api/integrations/google/calendar/connect or npm run google:oauth:connect, then use admin sync / apply.",
      dryRun: !apply,
      from: fromArg || env.historyStart,
      to: toArg || "present",
      defaultsToDryRun: true,
    },
    null,
    2,
  ),
);
process.exit(0);
