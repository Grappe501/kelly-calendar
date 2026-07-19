import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function loadGoogleEnv() {
  const { loadApprovedEnv } = await import(
    pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
  );
  const { env } = loadApprovedEnv({ includeRedDirtFallback: false });
  for (const [k, v] of Object.entries(env)) {
    if (v && !process.env[k]) process.env[k] = v;
  }
  return {
    root,
    clientId: Boolean(process.env.KCCC_GOOGLE_CLIENT_ID?.trim()),
    clientSecret: Boolean(process.env.KCCC_GOOGLE_CLIENT_SECRET?.trim()),
    redirectUri: Boolean(process.env.KCCC_GOOGLE_OAUTH_REDIRECT_URI?.trim()),
    encryptionKey: Boolean(process.env.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY?.trim()),
    routesKey: Boolean(process.env.KCCC_GOOGLE_MAPS_ROUTES_API_KEY?.trim()),
    calendarId: process.env.KCCC_GOOGLE_CALENDAR_ID?.trim() || "primary",
    syncEnabled: ["1", "true", "yes", "on"].includes(
      (process.env.KCCC_GOOGLE_SYNC_ENABLED || "").toLowerCase(),
    ),
    routesEnabled: ["1", "true", "yes", "on"].includes(
      (process.env.KCCC_GOOGLE_ROUTES_ENABLED || "").toLowerCase(),
    ),
    historyStart: process.env.KCCC_GOOGLE_HISTORY_START?.trim() || "2025-11-01T00:00:00-05:00",
  };
}

export function printConfigured(label, ok) {
  const pad = label.padEnd(28, ".");
  console.log(`${pad} ${ok ? "CONFIGURED" : "NOT CONFIGURED"}`);
}
