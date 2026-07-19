/**
 * Prints the connect URL for local operators.
 * Does not print tokens. Prefer browser session connect when app is running.
 */
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;

if (!oauthOk) {
  console.log(
    JSON.stringify(
      {
        googleOAuth: "NOT CONFIGURED",
        connect: "SKIPPED SAFELY",
        next: "npm run google:secrets:configure",
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
      connect: "OPEN_BROWSER",
      instructions: [
        "1. Start the app: npm run dev",
        "2. Sign in as Kelly or Campaign Manager",
        "3. Open /system/google-integration and click Connect",
        "   or visit /api/integrations/google/calendar/connect while authenticated",
        "4. Approve calendar.readonly for kelly@kellygrappe.com",
      ],
      redirectUriMustMatch: "KCCC_GOOGLE_OAUTH_REDIRECT_URI (never printed)",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      offlineAccess: true,
      pushSupported: false,
    },
    null,
    2,
  ),
);
process.exit(0);
