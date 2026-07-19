import { loadGoogleEnv, printConfigured } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
printConfigured("Google Client ID", env.clientId);
printConfigured("Google Client Secret", env.clientSecret);
printConfigured("Encryption Key", env.encryptionKey);
printConfigured("Redirect URI", env.redirectUri);
printConfigured("Routes API Key", env.routesKey);
console.log(`Calendar ID .................. ${env.calendarId}`);
console.log(`History start ................ ${env.historyStart}`);
console.log(`Sync enabled ................. ${env.syncEnabled ? "yes" : "no"}`);
console.log(`Routes enabled ............... ${env.routesEnabled ? "yes" : "no"}`);

const oauthOk = env.clientId && env.clientSecret && env.encryptionKey && env.redirectUri;
console.log(`Google OAuth ................. ${oauthOk ? "CONFIGURED" : "NOT CONFIGURED"}`);
process.exit(0);
