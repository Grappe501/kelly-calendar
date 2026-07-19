import { loadGoogleEnv, printConfigured } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;

console.log(
  JSON.stringify(
    {
      googleOAuth: oauthOk ? "CONFIGURED" : "NOT CONFIGURED",
      calendarId: env.calendarId,
      historyStart: env.historyStart,
      syncEnabled: env.syncEnabled,
      routesApi: env.routesKey ? "CONFIGURED" : "NOT CONFIGURED",
      routesEnabled: env.routesEnabled,
      pushSupported: false,
      syncDirection: "IMPORT_ONLY",
      note: "Use /system/google-integration for live connection status after OAuth connect.",
    },
    null,
    2,
  ),
);
printConfigured("OAuth bundle", oauthOk);
process.exit(0);
