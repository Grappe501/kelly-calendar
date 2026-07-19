import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const apply = process.argv.includes("--apply");
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey;

if (!oauthOk) {
  console.log(
    JSON.stringify(
      {
        googleOAuth: "NOT CONFIGURED",
        calendarSync: "SKIPPED SAFELY",
        dryRun: !apply,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      googleOAuth: "CONFIGURED",
      calendarSync: apply && env.syncEnabled ? "APPLY_REQUIRES_CONNECTED_SESSION" : "DRY_RUN_READY",
      syncEnabled: env.syncEnabled,
      dryRun: !apply || !env.syncEnabled,
      note: "Incremental sync uses stored syncCursor after historical import.",
    },
    null,
    2,
  ),
);
process.exit(0);
