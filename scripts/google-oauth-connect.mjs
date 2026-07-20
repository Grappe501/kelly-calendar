/**
 * Prints the connect path for local operators.
 * Does not print tokens. Browser session required.
 */
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;

if (!oauthOk) {
  console.log("Google OAuth .................. NOT CONFIGURED");
  console.log("Next ......................... npm run google:secrets:configure");
  process.exit(1);
}

console.log("Google OAuth .................. CONFIGURED");
console.log("Scope ......................... calendar.readonly");
console.log("Account to approve ............ kelly@kellygrappe.com");
console.log("");
console.log("Connect steps:");
console.log("  1. Keep `npm run dev` running (http://localhost:3000)");
console.log("  2. Sign in as Kelly (kelly@kellygrappe.com) or Campaign Manager");
console.log("  3. Open http://localhost:3000/system/google-integration");
console.log("  4. Click Connect and approve read-only Calendar access");
console.log("  5. Re-run: npm run google:oauth:doctor");
console.log("  6. Dry-run: npm run google:calendar:import-history");
console.log("");
console.log("Redirect URI must match KCCC_GOOGLE_OAUTH_REDIRECT_URI in Cloud Console.");
console.log("Sync apply gate stays OFF until dry-run review is approved.");
process.exit(0);
