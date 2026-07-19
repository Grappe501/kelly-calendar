/**
 * Interactive secret installer for Google OAuth + Routes.
 * Writes only to .env.local. Never echoes secret values.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");

function assertRepo() {
  if (!fs.existsSync(path.join(root, "package.json"))) {
    console.error("FAIL: not a KCCC repository root");
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (pkg.name !== "kelly-campaign-command-calendar") {
    console.error("FAIL: unexpected package name");
    process.exit(1);
  }
  const normalized = root.replace(/\\/g, "/").toLowerCase();
  if (!normalized.includes("kelly-calendar") && !normalized.includes("soswebsite")) {
    console.error("FAIL: refused — path outside approved project drive layout");
    process.exit(1);
  }
}

function assertEnvLocalNotTracked() {
  const r = spawnSync("git", ["ls-files", "--error-unmatch", ".env.local"], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status === 0) {
    console.error("FAIL: .env.local is tracked by Git — aborting");
    process.exit(1);
  }
}

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, eq).trim()] = value;
  }
  return out;
}

function serializeEnv(map) {
  return (
    Object.entries(map)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n"
  );
}

function promptHidden(rl, question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const ask = () => {
      process.stdout.write(question);
      let value = "";
      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      const onData = (char) => {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") process.exit(1);
        if (char === "\u0008" || char === "\u007f") {
          value = value.slice(0, -1);
          return;
        }
        value += char;
        process.stdout.write("*");
      };
      stdin.on("data", onData);
    };
    // Fallback if raw mode unsupported
    if (typeof stdin.setRawMode !== "function") {
      rl.question(question, (answer) => resolve(answer));
      return;
    }
    ask();
  });
}

function promptPlain(rl, question, defaultValue = "") {
  return new Promise((resolve) => {
    const q = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(q, (answer) => resolve(answer.trim() || defaultValue));
  });
}

assertRepo();
assertEnvLocalNotTracked();

const existing = fs.existsSync(envLocal) ? parseEnv(fs.readFileSync(envLocal, "utf8")) : {};
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("KCCC Google integration secret configure");
console.log("Values are written only to .env.local and are never printed.\n");

const clientId = await promptHidden(rl, "Google OAuth Client ID: ");
const clientSecret = await promptHidden(rl, "Google OAuth Client Secret: ");
const redirectUri = await promptPlain(
  rl,
  "OAuth redirect URI",
  existing.KCCC_GOOGLE_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/google/calendar/callback",
);
const genKey = await promptPlain(rl, "Generate encryption key? (y/N)", "y");
let encryptionKey = existing.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY || "";
if (genKey.toLowerCase().startsWith("y")) {
  encryptionKey = crypto.randomBytes(32).toString("hex");
} else {
  encryptionKey = await promptHidden(rl, "Google token-encryption key: ");
}
const routesKey = await promptHidden(rl, "Google Maps Routes API key (optional): ");
const calendarId = await promptPlain(
  rl,
  "Google Calendar ID",
  existing.KCCC_GOOGLE_CALENDAR_ID || "primary",
);

rl.close();

const next = { ...existing };
if (clientId) next.KCCC_GOOGLE_CLIENT_ID = clientId;
if (clientSecret) next.KCCC_GOOGLE_CLIENT_SECRET = clientSecret;
if (redirectUri) next.KCCC_GOOGLE_OAUTH_REDIRECT_URI = redirectUri;
if (encryptionKey) next.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY = encryptionKey;
if (routesKey) next.KCCC_GOOGLE_MAPS_ROUTES_API_KEY = routesKey;
if (calendarId) next.KCCC_GOOGLE_CALENDAR_ID = calendarId;
if (!next.KCCC_GOOGLE_SYNC_ENABLED) next.KCCC_GOOGLE_SYNC_ENABLED = "false";
if (!next.KCCC_GOOGLE_ROUTES_ENABLED) next.KCCC_GOOGLE_ROUTES_ENABLED = "false";
if (!next.KCCC_GOOGLE_HISTORY_START) {
  next.KCCC_GOOGLE_HISTORY_START = "2025-11-01T00:00:00-05:00";
}

fs.writeFileSync(envLocal, serializeEnv(next), { encoding: "utf8", mode: 0o600 });
try {
  fs.chmodSync(envLocal, 0o600);
} catch {
  // Windows may ignore mode
}

console.log("\nGoogle Client ID ........ " + (next.KCCC_GOOGLE_CLIENT_ID ? "CONFIGURED" : "MISSING"));
console.log("Google Client Secret .... " + (next.KCCC_GOOGLE_CLIENT_SECRET ? "CONFIGURED" : "MISSING"));
console.log("Encryption Key .......... " + (next.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY ? "CONFIGURED" : "MISSING"));
console.log("Routes API Key .......... " + (next.KCCC_GOOGLE_MAPS_ROUTES_API_KEY ? "CONFIGURED" : "MISSING"));
console.log("Calendar ID ............. " + (next.KCCC_GOOGLE_CALENDAR_ID || "primary"));
console.log(".env.local tracked ....... NO");
console.log("PASS: wrote .env.local (values redacted)");
