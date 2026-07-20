import pg from "pg";
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";
import { loadApprovedEnv } from "./lib/load-env-files.mjs";

const env = await loadGoogleEnv();
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;
const { env: approved } = loadApprovedEnv({ includeRedDirtFallback: false });
const databaseUrl = approved.DATABASE_URL || process.env.DATABASE_URL;

let calendarConnection = "NOT_CONNECTED";
let grantedScope = "none";
let googleAccountEmail = null;

if (databaseUrl) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8_000,
  });
  try {
    await client.connect();
    const row = await client.query(
      `SELECT "connectionStatus", "grantedScopes", "googleAccountEmail", "revokedAt"
       FROM kelly_calendar."GoogleCalendarConnection"
       WHERE "revokedAt" IS NULL
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
    );
    if (row.rows[0]) {
      const r = row.rows[0];
      calendarConnection =
        r.connectionStatus === "CONNECTED" && !r.revokedAt
          ? "CONNECTED"
          : String(r.connectionStatus || "NOT_CONNECTED");
      const scopes = Array.isArray(r.grantedScopes) ? r.grantedScopes : [];
      grantedScope = scopes.some((s) => String(s).includes("calendar.readonly"))
        ? "calendar.readonly"
        : scopes[0]
          ? "other"
          : "none";
      googleAccountEmail = r.googleAccountEmail || null;
    }
  } catch {
    calendarConnection = "UNKNOWN";
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

console.log(`Google OAuth .................. ${oauthOk ? "CONFIGURED" : "NOT CONFIGURED"}`);
console.log(`Calendar connection ........... ${calendarConnection}`);
console.log(`Granted scope ................. ${grantedScope}`);
console.log(`Calendar ID ................... ${env.calendarId}`);
console.log(`History start ................. ${env.historyStart}`);
console.log(`Sync apply gate ............... ${env.syncEnabled ? "ON" : "OFF"}`);
console.log(`Routes enabled ................ ${env.routesEnabled ? "yes" : "no"}`);
if (googleAccountEmail) {
  console.log(`Google account ................ ${googleAccountEmail}`);
}
process.exit(0);
