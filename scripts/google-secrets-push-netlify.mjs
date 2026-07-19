/**
 * Optional Netlify env push — fail closed. Never prints secret values.
 *
 * Usage:
 *   npm run google:secrets:push-netlify
 *   npm run google:secrets:push-netlify -- --routes-only
 *
 * On this Windows/CLI combination, `netlify env:set KEY VALUE` places the value
 * in process arguments (visible in shell history / process lists). Prefer the
 * Netlify UI for secret values. This script refuses unsafe automated push.
 */
import { spawnSync } from "node:child_process";
import readline from "node:readline";
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const args = process.argv.slice(2);
const routesOnly = args.includes("--routes-only");
const env = await loadGoogleEnv();

const which = spawnSync("npx", ["netlify", "--version"], {
  encoding: "utf8",
  shell: true,
});
if (which.status !== 0) {
  console.error("FAIL: Netlify CLI not available.");
  console.error(
    "Enter secrets in Netlify → Site configuration → Environment variables.",
  );
  process.exit(1);
}

const status = spawnSync("npx", ["netlify", "status"], {
  encoding: "utf8",
  shell: true,
});
const statusText = `${status.stdout || ""}\n${status.stderr || ""}`;
if (status.status !== 0 || /not linked|No site/i.test(statusText)) {
  console.error("FAIL: Netlify site not linked or status unavailable.");
  console.error("Run `netlify link` then enter secrets in the Netlify UI.");
  process.exit(1);
}

// Presence-only site identity (no secrets).
const siteLine = statusText
  .split(/\r?\n/)
  .find((l) => /Site|Admin URL|URL/i.test(l));
if (siteLine) {
  console.log(`Linked site context ......... ${siteLine.trim().slice(0, 120)}`);
}

if (routesOnly) {
  if (!env.routesKey) {
    console.error("FAIL: KCCC_GOOGLE_MAPS_ROUTES_API_KEY not configured locally.");
    process.exit(1);
  }
  console.log("Routes API key .............. CONFIGURED (local)");
  console.log(
    `Routes enabled ............... ${env.routesEnabled ? "YES" : "NO"}`,
  );
  console.log("");
  console.log(
    "SAFE PATH: Netlify CLI env:set places values in process arguments on this environment.",
  );
  console.log("Do not automate secret push here.");
  console.log("");
  console.log("Enter these keys in Netlify UI (values never printed here):");
  console.log("  KCCC_GOOGLE_MAPS_ROUTES_API_KEY");
  console.log("  KCCC_GOOGLE_ROUTES_ENABLED");
  console.log("");
  console.log("Netlify → Site configuration → Environment variables");
  process.exit(0);
}

if (!env.clientId || !env.clientSecret || !env.encryptionKey) {
  console.error("FAIL: required Google OAuth secrets missing in .env.local");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise((resolve) => {
  rl.question(
    "Netlify CLI cannot safely push secrets without exposing them in process args.\nType USE-NETLIFY-UI to acknowledge (no push will run): ",
    resolve,
  );
});
rl.close();
if (answer.trim() !== "USE-NETLIFY-UI") {
  console.error("Aborted.");
  process.exit(1);
}
console.log("Acknowledged. Enter Google OAuth/Routes secrets in the Netlify UI.");
console.log("Secret printed ............ NO");
process.exit(0);
