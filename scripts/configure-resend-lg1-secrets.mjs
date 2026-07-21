/**
 * Interactive LG-1 Resend secret installer.
 * Writes only to kelly-calendar/.env.local. Never prints secret values.
 *
 * Usage:
 *   npm run resend:secrets:configure
 *
 * After local configure, push to Netlify (values from .env.local via API body):
 *   npm run resend:secrets:push-netlify
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");
const envLocalTmp = path.join(root, ".env.local.tmp.kccc-resend");

const KEYS = [
  "KCCC_RESEND_API_KEY",
  "KCCC_RESEND_WEBHOOK_SECRET",
  "KCCC_RESEND_FROM_EMAIL",
];

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

function promptHiddenSilent(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    if (typeof stdin.setRawMode !== "function") {
      const rl = readline.createInterface({
        input: stdin,
        output: process.stdout,
      });
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

const existing = fs.existsSync(envLocal)
  ? parseEnv(fs.readFileSync(envLocal, "utf8"))
  : {};
const next = { ...existing };

console.log("KCCC LG-1 Resend secret configure");
console.log("Values write only to .env.local and are never printed.");
console.log("");
console.log("Webhook endpoint for this deployment (configure secret against this URL):");
console.log("  https://kelly-calendar.netlify.app/api/webhooks/communications/resend");
console.log("FROM email must belong to the intended LG-1 sender/domain (Phase C verifies).");
console.log("Do not invent a temporary sender merely to pass presence checks.");
console.log("");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptKeepOrReplace(label, key, { hidden = true, email = false } = {}) {
  const has = Boolean(existing[key]?.trim());
  console.log(`${label.padEnd(32, ".")} ${configuredLabel(existing[key])}`);
  if (has) {
    const choice = await promptPlain(
      rl,
      "Press Enter to keep existing, or type replace:",
    );
    if (!choice || choice.toLowerCase() !== "replace") {
      return existing[key];
    }
  }
  rl.pause();
  const value = hidden
    ? await promptHiddenSilent(`${label} (hidden): `)
    : await promptPlain(rl, `${label}:`);
  rl.resume();
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    console.error(`FAIL: ${key} empty`);
    process.exit(1);
  }
  if (email && !trimmed.includes("@")) {
    console.error("FAIL: FROM email must contain @");
    process.exit(1);
  }
  return trimmed;
}

try {
  next.KCCC_RESEND_API_KEY = await promptKeepOrReplace(
    "Resend API key",
    "KCCC_RESEND_API_KEY",
    { hidden: true },
  );
  next.KCCC_RESEND_WEBHOOK_SECRET = await promptKeepOrReplace(
    "Resend webhook secret",
    "KCCC_RESEND_WEBHOOK_SECRET",
    { hidden: true },
  );
  next.KCCC_RESEND_FROM_EMAIL = await promptKeepOrReplace(
    "Resend FROM email",
    "KCCC_RESEND_FROM_EMAIL",
    { hidden: true, email: true },
  );

  const setProvider = await promptPlain(
    rl,
    "Set KCCC_COMMUNICATIONS_PROVIDER_KEY=resend locally? [y/N]",
  );
  if (setProvider.toLowerCase().startsWith("y")) {
    next.KCCC_COMMUNICATIONS_PROVIDER_KEY = "resend";
  }

  writeEnvAtomic(next);

  console.log("");
  for (const key of KEYS) {
    console.log(`${key.padEnd(32, ".")} ${configuredLabel(next[key])}`);
  }
  console.log(
    `KCCC_COMMUNICATIONS_PROVIDER_KEY.. ${configuredLabel(next.KCCC_COMMUNICATIONS_PROVIDER_KEY)}`,
  );
  console.log(".env.local ...................... UPDATED SAFELY");
  console.log("Tracked by Git .................. NO");
  console.log("Secret printed .................. NO");
  console.log("Kill switches changed ........... NO");
  console.log("Next: npm run resend:secrets:push-netlify");
  console.log("Then: npm run resend:phase-b:probe");
} finally {
  rl.close();
  try {
    if (fs.existsSync(envLocalTmp)) fs.unlinkSync(envLocalTmp);
  } catch {
    // ignore
  }
}
