import pg from "pg";
import { loadGoogleEnv, printConfigured } from "./lib/google-cli-env.mjs";
import { loadApprovedEnv } from "./lib/load-env-files.mjs";

const env = await loadGoogleEnv();
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;

printConfigured("Google Client ID", env.clientId);
printConfigured("Google Client Secret", env.clientSecret);
printConfigured("Redirect URI", env.redirectUri);
printConfigured("Encryption Key", env.encryptionKey);
printConfigured("Routes API Key", env.routesKey);
console.log(`Calendar ID .................. ${env.calendarId}`);
console.log(`History start ................ ${env.historyStart}`);
console.log(`Sync apply gate .............. ${env.syncEnabled ? "ON" : "OFF"}`);
console.log(`Routes enabled ............... ${env.routesEnabled ? "yes" : "no"}`);
console.log(`Google OAuth ................. ${oauthOk ? "CONFIGURED" : "NOT CONFIGURED"}`);

const { env: approved } = loadApprovedEnv({ includeRedDirtFallback: false });
const databaseUrl = approved.DATABASE_URL || process.env.DATABASE_URL;
let dbOk = false;
let connectionStatus = "NOT_CONNECTED";
let grantedScope = "none";
let googleEmail = null;

if (!databaseUrl) {
  console.log("Database connection ......... NOT CONFIGURED");
} else {
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8_000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    dbOk = true;
    console.log("Database connection ......... CONFIGURED");
    try {
      const row = await client.query(
        `SELECT "connectionStatus", "grantedScopes", "googleAccountEmail", "googleCalendarId", "revokedAt"
         FROM kelly_calendar."GoogleCalendarConnection"
         WHERE "revokedAt" IS NULL
         ORDER BY "updatedAt" DESC
         LIMIT 1`,
      );
      if (row.rows[0]) {
        const r = row.rows[0];
        connectionStatus =
          r.connectionStatus === "CONNECTED" && !r.revokedAt
            ? "CONNECTED"
            : String(r.connectionStatus || "NOT_CONNECTED");
        const scopes = Array.isArray(r.grantedScopes) ? r.grantedScopes : [];
        grantedScope = scopes.some((s) => String(s).includes("calendar.readonly"))
          ? "calendar.readonly"
          : scopes[0]
            ? "other"
            : "none";
        googleEmail = r.googleAccountEmail || null;
      }
    } catch {
      // Table may not exist yet
      connectionStatus = "UNKNOWN";
    }
  } catch {
    console.log("Database connection ......... FAIL");
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

console.log(`Calendar connection .......... ${connectionStatus}`);
if (googleEmail) console.log(`Google account ............... ${googleEmail}`);
console.log(`Granted scope ................ ${grantedScope}`);

const ready =
  oauthOk &&
  dbOk &&
  connectionStatus === "CONNECTED" &&
  grantedScope === "calendar.readonly";

console.log(`Ready for dry-run import ..... ${ready ? "YES" : "NO"}`);
if (!ready) {
  if (!oauthOk) console.log("Next ......................... npm run google:secrets:configure");
  else if (!dbOk) console.log("Next ......................... fix DATABASE_URL / network");
  else if (connectionStatus !== "CONNECTED") {
    console.log("Next ......................... npm run google:oauth:connect (browser Connect)");
  }
}

process.exit(oauthOk && dbOk ? 0 : 1);
