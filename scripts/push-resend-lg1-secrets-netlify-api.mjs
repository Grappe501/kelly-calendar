/**
 * Push local Resend LG-1 secrets to linked Netlify site via REST API.
 * Reads values from .env.local into process memory; never prints them;
 * never places secret values in shell argv.
 *
 * Usage (after local configure):
 *   npm run resend:secrets:push-netlify
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ID = "7d3d021a-ccf1-401f-800f-8e1d1671445c";

const REQUIRED = [
  "KCCC_RESEND_API_KEY",
  "KCCC_RESEND_WEBHOOK_SECRET",
  "KCCC_RESEND_FROM_EMAIL",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readNetlifyToken() {
  if (process.env.NETLIFY_AUTH_TOKEN?.trim()) {
    return process.env.NETLIFY_AUTH_TOKEN.trim();
  }
  const candidates = [
    path.join(os.homedir(), ".netlify", "config.json"),
    path.join(os.homedir(), "AppData", "Roaming", "netlify", "Config", "config.json"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
      for (const u of Object.values(cfg.users || {})) {
        if (u?.auth?.token) return String(u.auth.token);
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function api(token, method, urlPath, body) {
  const res = await fetch(`https://api.netlify.com/api/v1${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "kccc-resend-lg1-env-push",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 300) };
}

async function upsert(token, accountId, key, value) {
  const q = `?site_id=${encodeURIComponent(SITE_ID)}`;
  const payload = {
    key,
    scopes: ["builds", "functions", "runtime", "post-processing"],
    values: [{ value, context: "production" }, { value, context: "all" }],
  };
  // Prefer production + all so CLI/local prod context and builds both see keys.
  let result = await api(token, "POST", `/accounts/${accountId}/env${q}`, [
    {
      key,
      scopes: payload.scopes,
      values: [{ value, context: "all" }],
      is_secret: true,
    },
  ]);
  if (result.ok || result.status === 201) {
    return { action: "created", status: result.status };
  }
  // Retry without is_secret if plan rejects
  if (result.status >= 400) {
    result = await api(token, "POST", `/accounts/${accountId}/env${q}`, [
      {
        key,
        scopes: payload.scopes,
        values: [{ value, context: "all" }],
      },
    ]);
    if (result.ok || result.status === 201) {
      return { action: "created", status: result.status };
    }
  }
  result = await api(
    token,
    "PUT",
    `/accounts/${accountId}/env/${encodeURIComponent(key)}${q}`,
    {
      scopes: payload.scopes,
      values: [{ value, context: "all" }],
    },
  );
  if (result.ok) return { action: "updated", status: result.status };
  return {
    action: "failed",
    status: result.status,
    detail: String(result.json?.message || result.text || "")
      .replace(/re_[A-Za-z0-9_]+/g, "[redacted]")
      .replace(/whsec_[A-Za-z0-9_]+/gi, "[redacted]")
      .slice(0, 160),
  };
}

loadEnvFile(path.join(root, ".env.local"));

const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
if (missing.length) {
  console.error("FAIL: required Resend keys missing in .env.local");
  for (const k of missing) console.error(`  ${k}: NOT CONFIGURED`);
  console.error("Run: npm run resend:secrets:configure");
  process.exit(1);
}

const token = readNetlifyToken();
if (!token) {
  console.error("FAIL: Netlify auth token not found");
  console.error("Run netlify login, or set NETLIFY_AUTH_TOKEN in the process env.");
  process.exit(1);
}

const site = await api(token, "GET", `/sites/${SITE_ID}`);
const accountId = site.json?.account_slug || site.json?.account_id;
if (!accountId) {
  console.error("FAIL: account id missing for kelly-calendar site");
  process.exit(1);
}

if (String(site.json?.name || "") !== "kelly-calendar") {
  console.error("FAIL: refused — linked site name is not kelly-calendar");
  process.exit(1);
}

console.log(`Linked site ................. ${site.json.name}`);
console.log("Secret printed .............. NO");
console.log("Shell argv secrets .......... NO (API JSON body only)");

const results = [];
for (const key of REQUIRED) {
  const r = await upsert(token, accountId, key, process.env[key].trim());
  results.push({ key, ...r });
  console.log(`${key.padEnd(32, ".")} ${r.action.toUpperCase()} (http ${r.status})`);
  if (r.detail) console.log(`  detail: ${r.detail}`);
}

const providerKey = process.env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim();
if (providerKey === "resend") {
  const r = await upsert(token, accountId, "KCCC_COMMUNICATIONS_PROVIDER_KEY", "resend");
  results.push({ key: "KCCC_COMMUNICATIONS_PROVIDER_KEY", ...r });
  console.log(
    `KCCC_COMMUNICATIONS_PROVIDER_KEY.. ${r.action.toUpperCase()} (http ${r.status})`,
  );
}

if (results.some((r) => r.action === "failed")) {
  console.error("FAIL: one or more env upserts failed");
  console.error("Fallback: enter the same keys in Netlify UI (Environment variables).");
  process.exit(1);
}

console.log("");
console.log("Netlify env upsert ............ PASS (presence only; values not printed)");
console.log("Redeploy required ............. YES (functions pick up env)");
console.log("Suggested: npm run deploy:netlify:prod");
console.log("Then: npm run resend:phase-b:probe");
