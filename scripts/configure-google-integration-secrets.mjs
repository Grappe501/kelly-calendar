/**
 * Interactive secret installer for Google OAuth + Routes.
 * Writes only to .env.local. Never echoes secret values (including masks/length).
 *
 * Usage:
 *   npm run google:secrets:configure
 *   npm run google:secrets:configure -- --routes-only
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");
const envLocalTmp = path.join(root, ".env.local.tmp.kccc");

const args = process.argv.slice(2);
const routesOnly = args.includes("--routes-only");

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
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const key = raw.slice(0, eq).trim();
    let value = raw.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
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

function configuredLabel(value) {
  return value && String(value).trim() ? "CONFIGURED" : "NOT CONFIGURED";
}

/** Hidden input with no echo, no asterisks, no length leakage. */
function promptHiddenSilent(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    if (typeof stdin.setRawMode !== "function") {
      const rl = readline.createInterface({ input: stdin, output: process.stdout });
      // Still avoid echoing if possible — readline may echo; warn operator.
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
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
      // Intentionally no echo of "*" or any character.
    };
    stdin.on("data", onData);
  });
}

function promptPlain(rl, question) {
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => resolve(answer.trim()));
  });
}

function writeEnvAtomic(map) {
  const payload = serializeEnv(map);
  try {
    fs.writeFileSync(envLocalTmp, payload, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(envLocalTmp, envLocal);
  } finally {
    try {
      if (fs.existsSync(envLocalTmp)) fs.unlinkSync(envLocalTmp);
    } catch {
      // ignore
    }
  }
  try {
    fs.chmodSync(envLocal, 0o600);
  } catch {
    // Windows may ignore mode
  }
}

assertRepo();
assertEnvLocalNotTracked();

const existing = fs.existsSync(envLocal) ? parseEnv(fs.readFileSync(envLocal, "utf8")) : {};
const next = { ...existing };

console.log(
  routesOnly
    ? "KCCC Google Routes secret configure (--routes-only)"
    : "KCCC Google integration secret configure",
);
console.log("Values are written only to .env.local and are never printed.\n");

if (routesOnly) {
  const routesKey = await promptHiddenSilent("Google Routes API key (hidden): ");
  if (!routesKey.trim()) {
    console.error("FAIL: no key entered");
    process.exit(1);
  }
  next.KCCC_GOOGLE_MAPS_ROUTES_API_KEY = routesKey.trim();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const enable = await promptPlain(
    rl,
    "Enable Google Routes integration locally now? [y/N]",
  );
  rl.close();
  if (enable.toLowerCase().startsWith("y")) {
    next.KCCC_GOOGLE_ROUTES_ENABLED = "true";
  } else if (!next.KCCC_GOOGLE_ROUTES_ENABLED) {
    next.KCCC_GOOGLE_ROUTES_ENABLED = "false";
  }

  writeEnvAtomic(next);
  console.log("Google Routes API key .... CONFIGURED");
  console.log(".env.local ................ UPDATED SAFELY");
  console.log("Tracked by Git ............ NO");
  console.log("Secret printed ............ NO");
  console.log(
    `Routes enabled ............. ${
      next.KCCC_GOOGLE_ROUTES_ENABLED === "true" ? "YES" : "NO"
    }`,
  );
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function promptKeepOrReplace(label, key, { hidden = false, generateOption = false } = {}) {
  const has = Boolean(existing[key]?.trim());
  console.log(`${label.padEnd(28, ".")} ${configuredLabel(existing[key])}`);
  if (has) {
    const choice = await promptPlain(
      rl,
      "Press Enter to keep existing, or type replace:",
    );
    if (!choice || choice.toLowerCase() !== "replace") {
      return existing[key];
    }
  }
  if (generateOption) {
    const gen = await promptPlain(rl, "Generate encryption key? [Y/n]");
    if (!gen || gen.toLowerCase().startsWith("y")) {
      return crypto.randomBytes(32).toString("hex");
    }
  }
  rl.pause();
  const value = hidden
    ? await promptHiddenSilent(`${label} (hidden): `)
    : await promptPlain(rl, `${label}:`);
  rl.resume();
  return value.trim() || existing[key] || "";
}

try {
  next.KCCC_GOOGLE_CLIENT_ID = await promptKeepOrReplace(
    "Google Client ID",
    "KCCC_GOOGLE_CLIENT_ID",
    { hidden: true },
  );
  next.KCCC_GOOGLE_CLIENT_SECRET = await promptKeepOrReplace(
    "Google Client Secret",
    "KCCC_GOOGLE_CLIENT_SECRET",
    { hidden: true },
  );
  next.KCCC_GOOGLE_OAUTH_REDIRECT_URI = await promptKeepOrReplace(
    "OAuth redirect URI",
    "KCCC_GOOGLE_OAUTH_REDIRECT_URI",
    { hidden: false },
  );
  if (!next.KCCC_GOOGLE_OAUTH_REDIRECT_URI) {
    next.KCCC_GOOGLE_OAUTH_REDIRECT_URI =
      "http://localhost:3000/api/integrations/google/calendar/callback";
  }
  next.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY = await promptKeepOrReplace(
    "Token encryption key",
    "KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY",
    { hidden: true, generateOption: true },
  );
  next.KCCC_GOOGLE_MAPS_ROUTES_API_KEY = await promptKeepOrReplace(
    "Google Routes API key",
    "KCCC_GOOGLE_MAPS_ROUTES_API_KEY",
    { hidden: true },
  );
  next.KCCC_GOOGLE_CALENDAR_ID = await promptKeepOrReplace(
    "Google Calendar ID",
    "KCCC_GOOGLE_CALENDAR_ID",
    { hidden: false },
  );
  if (!next.KCCC_GOOGLE_CALENDAR_ID) next.KCCC_GOOGLE_CALENDAR_ID = "primary";

  const enableRoutes = await promptPlain(
    rl,
    "Enable Google Routes integration locally now? [y/N]",
  );
  if (enableRoutes.toLowerCase().startsWith("y")) {
    next.KCCC_GOOGLE_ROUTES_ENABLED = "true";
  } else if (!next.KCCC_GOOGLE_ROUTES_ENABLED) {
    next.KCCC_GOOGLE_ROUTES_ENABLED = "false";
  }

  const enableSync = await promptPlain(
    rl,
    "Enable Google Calendar sync apply locally? [y/N] (default N — dry-run remains default)",
  );
  if (enableSync.toLowerCase().startsWith("y")) {
    next.KCCC_GOOGLE_SYNC_ENABLED = "true";
  } else if (!next.KCCC_GOOGLE_SYNC_ENABLED) {
    next.KCCC_GOOGLE_SYNC_ENABLED = "false";
  }

  if (!next.KCCC_GOOGLE_HISTORY_START) {
    next.KCCC_GOOGLE_HISTORY_START = "2025-11-01T00:00:00-05:00";
  }

  writeEnvAtomic(next);

  console.log("\nGoogle Client ID ........ " + configuredLabel(next.KCCC_GOOGLE_CLIENT_ID));
  console.log("Google Client Secret .... " + configuredLabel(next.KCCC_GOOGLE_CLIENT_SECRET));
  console.log("Encryption Key .......... " + configuredLabel(next.KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY));
  console.log("Routes API Key .......... " + configuredLabel(next.KCCC_GOOGLE_MAPS_ROUTES_API_KEY));
  console.log("Calendar ID ............. CONFIGURED");
  console.log(".env.local ................ UPDATED SAFELY");
  console.log("Tracked by Git ............ NO");
  console.log("Secret printed ............ NO");
} finally {
  rl.close();
  try {
    if (fs.existsSync(envLocalTmp)) fs.unlinkSync(envLocalTmp);
  } catch {
    // ignore
  }
}
