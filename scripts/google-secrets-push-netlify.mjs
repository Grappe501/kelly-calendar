/**
 * Optional Netlify env push — fail closed. Never prints secret values.
 */
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const env = await loadGoogleEnv();
const keys = [
  "KCCC_GOOGLE_CLIENT_ID",
  "KCCC_GOOGLE_CLIENT_SECRET",
  "KCCC_GOOGLE_OAUTH_REDIRECT_URI",
  "KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY",
  "KCCC_GOOGLE_MAPS_ROUTES_API_KEY",
  "KCCC_GOOGLE_CALENDAR_ID",
  "KCCC_GOOGLE_SYNC_ENABLED",
  "KCCC_GOOGLE_ROUTES_ENABLED",
  "KCCC_GOOGLE_HISTORY_START",
];

const missing = keys.filter((k) => !process.env[k]?.trim() && k !== "KCCC_GOOGLE_MAPS_ROUTES_API_KEY");
if (!env.clientId || !env.clientSecret || !env.encryptionKey) {
  console.error("FAIL: required Google secrets missing in .env.local");
  process.exit(1);
}

const which = spawnSync("npx", ["netlify", "--version"], { encoding: "utf8", shell: true });
if (which.status !== 0) {
  console.error("FAIL: Netlify CLI not available. Enter secrets in Netlify UI instead.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((resolve) => {
  rl.question(
    "Type PUSH-NETLIFY-GOOGLE-SECRETS to upload configured keys (values never printed): ",
    resolve,
  );
});
rl.close();
if (answer.trim() !== "PUSH-NETLIFY-GOOGLE-SECRETS") {
  console.error("Aborted.");
  process.exit(1);
}

for (const key of keys) {
  const value = process.env[key];
  if (!value?.trim()) continue;
  // Prefer env:set without echoing value — pass via stdin when supported.
  const r = spawnSync(
    "npx",
    ["netlify", "env:set", key, value, "--force"],
    { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (r.status !== 0) {
    console.error(`FAIL: could not set ${key} (details redacted)`);
    process.exit(1);
  }
  console.log(`${key.padEnd(40, ".")} SET`);
}

console.log("PASS: Netlify env keys updated (values redacted)");
if (missing.length) {
  console.log("NOTE: some optional keys were empty and skipped");
}
process.exit(0);
