/**
 * Push local Routes key + enabled flag to linked Netlify site via REST API.
 * Never prints secret values. Never puts secrets in shell argv intentionally.
 *
 * Usage (after local doctor PASS):
 *   node scripts/run-with-h-drive-env.cjs node scripts/push-routes-key-netlify-api.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadGoogleEnv } from "./lib/google-cli-env.mjs";

const SITE_ID = "7d3d021a-ccf1-401f-800f-8e1d1671445c";

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
      "User-Agent": "kccc-routes-env-push",
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

async function upsert(token, accountId, key, value, isSecret) {
  const q = `?site_id=${encodeURIComponent(SITE_ID)}`;
  const payload = {
    key,
    scopes: ["builds", "functions", "runtime", "post-processing"],
    values: [{ value, context: "all" }],
    ...(isSecret ? {} : {}),
  };
  // Avoid is_secret on create (plan/structure rejection); create then best-effort secretize via CLI is out of scope here.
  let result = await api(token, "POST", `/accounts/${accountId}/env${q}`, [payload]);
  if (result.ok || result.status === 201) {
    return { action: "created", status: result.status };
  }
  result = await api(token, "PUT", `/accounts/${accountId}/env/${encodeURIComponent(key)}${q}`, {
    scopes: payload.scopes,
    values: payload.values,
  });
  if (result.ok) return { action: "updated", status: result.status };
  return {
    action: "failed",
    status: result.status,
    detail: String(result.json?.message || result.text || "")
      .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
      .slice(0, 160),
  };
}

const env = await loadGoogleEnv();
if (!env.routesKey || !env.routesEnabled) {
  console.error("FAIL: local Routes key/enabled not ready");
  process.exit(1);
}

const token = readNetlifyToken();
if (!token) {
  console.error("FAIL: Netlify auth token not found");
  process.exit(1);
}

const site = await api(token, "GET", `/sites/${SITE_ID}`);
const accountId = site.json?.account_slug || site.json?.account_id;
if (!accountId) {
  console.error("FAIL: account id missing");
  process.exit(1);
}

console.log(`Linked site ................. ${site.json?.name || "kelly-calendar"}`);
console.log("Secret printed .............. NO");

const keyValue = process.env.KCCC_GOOGLE_MAPS_ROUTES_API_KEY;
const r1 = await upsert(token, accountId, "KCCC_GOOGLE_MAPS_ROUTES_API_KEY", keyValue, true);
const r2 = await upsert(token, accountId, "KCCC_GOOGLE_ROUTES_ENABLED", "true", false);

console.log(`KCCC_GOOGLE_MAPS_ROUTES_API_KEY . ${r1.action.toUpperCase()} (http ${r1.status})`);
if (r1.detail) console.log(`  detail: ${r1.detail}`);
console.log(`KCCC_GOOGLE_ROUTES_ENABLED ...... ${r2.action.toUpperCase()} (http ${r2.status})`);
if (r2.detail) console.log(`  detail: ${r2.detail}`);

if (r1.action === "failed" || r2.action === "failed") process.exit(1);

const build = await api(token, "POST", `/sites/${SITE_ID}/builds`, {});
if (!build.ok) {
  console.error(`FAIL: redeploy trigger http ${build.status}`);
  process.exit(1);
}
console.log(`Redeploy build id ........... ${build.json?.id || "unknown"}`);
console.log(`Redeploy state .............. ${build.json?.state || "queued"}`);
process.exit(0);
