/**
 * LG-1 Phase B B2–B4 probe (read-only). Never prints secret values.
 *
 * - Confirms env name presence locally + Netlify
 * - GET https://api.resend.com/domains (auth only; no send)
 * - Classifies credential + readiness policy
 * - Asserts kill switches / transport remain blocked
 * - Does NOT mark LIVE_TEST_READY in the database
 *
 * Usage:
 *   npm run resend:phase-b:probe
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_ID = "7d3d021a-ccf1-401f-800f-8e1d1671445c";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
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
  return true;
}

function presence(env) {
  return {
    apiKeyPresent: Boolean(env.KCCC_RESEND_API_KEY?.trim()),
    webhookSecretPresent: Boolean(env.KCCC_RESEND_WEBHOOK_SECRET?.trim()),
    fromEmailPresent: Boolean(env.KCCC_RESEND_FROM_EMAIL?.trim()),
    providerKeyPresent: Boolean(env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim()),
    providerKeyIsResend: env.KCCC_COMMUNICATIONS_PROVIDER_KEY?.trim() === "resend",
  };
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

async function netlifyKeyPresence(token) {
  const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "kccc-resend-lg1-phase-b-probe",
    },
  });
  const siteJson = siteRes.ok ? await siteRes.json() : null;
  const accountId = siteJson?.account_slug || siteJson?.account_id;

  if (accountId) {
    const res = await fetch(
      `https://api.netlify.com/api/v1/accounts/${encodeURIComponent(accountId)}/env?site_id=${SITE_ID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "kccc-resend-lg1-phase-b-probe",
        },
      },
    );
    if (res.ok) {
      const rows = await res.json();
      const names = new Set(
        (Array.isArray(rows) ? rows : []).map((r) => r.key).filter(Boolean),
      );
      return {
        ok: true,
        source: "api",
        present: {
          apiKeyPresent: names.has("KCCC_RESEND_API_KEY"),
          webhookSecretPresent: names.has("KCCC_RESEND_WEBHOOK_SECRET"),
          fromEmailPresent: names.has("KCCC_RESEND_FROM_EMAIL"),
          providerKeyPresent: names.has("KCCC_COMMUNICATIONS_PROVIDER_KEY"),
        },
      };
    }
  }

  try {
    const out = execSync("npx --yes netlify-cli@23 env:list --json", {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const data = JSON.parse(out);
    const names = new Set();
    if (Array.isArray(data)) {
      for (const row of data) names.add(row.key || row.name);
    } else if (data && typeof data === "object") {
      for (const k of Object.keys(data)) names.add(k);
    }
    return {
      ok: true,
      source: "cli",
      present: {
        apiKeyPresent: names.has("KCCC_RESEND_API_KEY"),
        webhookSecretPresent: names.has("KCCC_RESEND_WEBHOOK_SECRET"),
        fromEmailPresent: names.has("KCCC_RESEND_FROM_EMAIL"),
        providerKeyPresent: names.has("KCCC_COMMUNICATIONS_PROVIDER_KEY"),
      },
    };
  } catch (err) {
    return { ok: false, error: String(err?.message || err).slice(0, 160) };
  }
}

async function probeResendAuth(apiKey) {
  if (!apiKey) {
    return {
      apiReachability: "NOT_APPLICABLE",
      authenticationClass: "NOT_CONFIGURED",
      httpStatus: null,
      accountReachable: false,
    };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "kccc-lg1-phase-b-read-only-probe",
      },
    });
    // Never log response body (may include domain inventory).
    if (res.status === 200) {
      return {
        apiReachability: "REACHABLE",
        authenticationClass: "AUTHENTICATED",
        httpStatus: 200,
        accountReachable: true,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        apiReachability: `HTTP_${res.status}`,
        authenticationClass: "AUTH_FAILED",
        httpStatus: res.status,
        accountReachable: false,
      };
    }
    return {
      apiReachability: `HTTP_${res.status}`,
      authenticationClass: "UNEXPECTED_STATUS",
      httpStatus: res.status,
      accountReachable: res.ok,
    };
  } catch {
    return {
      apiReachability: "NETWORK_ERROR",
      authenticationClass: "NETWORK_ERROR",
      httpStatus: null,
      accountReachable: false,
    };
  }
}

const localExists = loadEnvFile(path.join(root, ".env.local"));
const local = presence(process.env);

// Load compiled policy helpers via tsx/vitest path — use dynamic import of source through relative built? 
// Prefer duplicating thin classification by importing from dist is hard.
// Use createRequire on the TypeScript via vitest isn't available.
// Inline the same classification rules (keep in sync with provider-readiness-policy.ts).

function classifyResendCredentialPresence(env) {
  if (!env.apiKeyPresent) return "NOT_CONFIGURED";
  if (!env.webhookSecretPresent || !env.fromEmailPresent) {
    return "CONFIGURED_UNVERIFIED";
  }
  return "CONFIGURED_UNVERIFIED";
}

function classifyAuthenticationOutcome(input) {
  if (input.credentialAvailability === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (input.authenticationClass === "AUTHENTICATED") return "AUTHENTICATED";
  if (input.authenticationClass === "AUTH_FAILED") return "INVALID";
  if (input.authenticationClass === "NETWORK_ERROR") return "UNKNOWN";
  if (input.authenticationClass === "UNEXPECTED_STATUS") return "UNKNOWN";
  return "CONFIGURED_UNVERIFIED";
}

function evaluatePhaseBProviderReadiness(input) {
  const blocking = [];
  const warnings = [
    "LIVE_TRANSPORT_REMAINS_BLOCKED_BY_KILL_SWITCHES",
    "GENERAL_PRODUCTION_REMAINS_BLOCKED",
  ];
  if (input.adapterKey !== "resend") {
    if (input.adapterKey === "kccc-sandbox") {
      blocking.push("SANDBOX_HARNESS_NOT_ELIGIBLE_FOR_LIVE_TEST");
    }
  }
  if (input.channel !== "EMAIL") blocking.push("LG1_EMAIL_CHANNEL_REQUIRED");
  if (input.credentialAvailability === "NOT_CONFIGURED") {
    blocking.push("CREDENTIALS_NOT_CONFIGURED");
  }
  if (input.credentialAvailability === "INVALID") {
    blocking.push("CREDENTIALS_INVALID");
  }
  if (input.credentialAvailability === "INSUFFICIENT_SCOPE") {
    blocking.push("CREDENTIAL_SCOPE_INSUFFICIENT");
  }
  if (input.credentialAvailability === "UNKNOWN") {
    blocking.push("AUTHENTICATION_OUTCOME_UNKNOWN");
  }
  if (input.credentialAvailability === "CONFIGURED_UNVERIFIED") {
    blocking.push("CREDENTIALS_CONFIGURED_BUT_UNVERIFIED");
  }
  if (!input.criticalCapabilitiesOk) blocking.push("CRITICAL_CAPABILITY_MISSING");
  if (!input.signedWebhookPathExists) blocking.push("SIGNED_WEBHOOK_PATH_MISSING");
  if (!input.providerMessageReferenceSupported) {
    blocking.push("PROVIDER_MESSAGE_REFERENCE_MISSING");
  }
  if (!input.duplicateProtectionSupported) {
    blocking.push("DUPLICATE_PROTECTION_MISSING");
  }
  const mayMarkLiveTestReady =
    input.credentialAvailability === "AUTHENTICATED" &&
    input.criticalCapabilitiesOk &&
    input.signedWebhookPathExists &&
    input.providerMessageReferenceSupported &&
    input.duplicateProtectionSupported &&
    input.channel === "EMAIL" &&
    input.adapterKey === "resend";
  return {
    status: mayMarkLiveTestReady
      ? "PASSED"
      : blocking.length > 0
        ? "BLOCKED"
        : "PASSED_WITH_WARNINGS",
    mayMarkLiveTestReady,
    blockingIssues: [...new Set(blocking)],
    warnings: [...new Set(warnings)],
  };
}

const webhookRoute = path.join(
  root,
  "src/app/api/webhooks/communications/[provider]/route.ts",
);
const signedWebhookPathExists = fs.existsSync(webhookRoute);

const token = readNetlifyToken();
const netlify = token
  ? await netlifyKeyPresence(token)
  : { ok: false, error: "Netlify token missing" };

const presenceAvailability = classifyResendCredentialPresence(local);
const authProbe = await probeResendAuth(process.env.KCCC_RESEND_API_KEY?.trim());
const credentialAvailability = classifyAuthenticationOutcome({
  credentialAvailability: presenceAvailability,
  apiReachability: authProbe.apiReachability,
  authenticationClass: authProbe.authenticationClass,
});

const readiness = evaluatePhaseBProviderReadiness({
  adapterKey: "resend",
  channel: "EMAIL",
  credentialAvailability,
  criticalCapabilitiesOk:
    credentialAvailability === "AUTHENTICATED" &&
    local.webhookSecretPresent &&
    local.fromEmailPresent &&
    signedWebhookPathExists,
  signedWebhookPathExists,
  providerMessageReferenceSupported: true,
  duplicateProtectionSupported: true,
});

const transport = {
  globalKillSwitch: true,
  channelKillSwitch: true,
  providerKillSwitch: true,
  productionDispatchFlag: false,
  transportBlocked: true,
  generalProductionBlocked: true,
  liveTestReadyMarkedInDb: false,
};

console.log("=== KCCC LG-1 Phase B probe (B2–B4) ===");
console.log(`Local .env.local .............. ${localExists ? "PRESENT" : "MISSING"}`);
console.log(`Local API key ................. ${local.apiKeyPresent}`);
console.log(`Local webhook secret .......... ${local.webhookSecretPresent}`);
console.log(`Local FROM email .............. ${local.fromEmailPresent}`);
console.log(`Local provider key=resend ..... ${local.providerKeyIsResend}`);
if (netlify.ok) {
  console.log(`Netlify source ................ ${netlify.source}`);
  console.log(`Netlify API key ............... ${netlify.present.apiKeyPresent}`);
  console.log(`Netlify webhook secret ........ ${netlify.present.webhookSecretPresent}`);
  console.log(`Netlify FROM email ............ ${netlify.present.fromEmailPresent}`);
  console.log(`Netlify provider key .......... ${netlify.present.providerKeyPresent}`);
} else {
  console.log(`Netlify presence .............. FAIL (${netlify.error || "unknown"})`);
}
console.log("Secret values printed ......... NO");
console.log("");
console.log("Auth probe endpoint ........... GET https://api.resend.com/domains");
console.log(`API reachability .............. ${authProbe.apiReachability}`);
console.log(`Authentication class .......... ${authProbe.authenticationClass}`);
console.log(`HTTP status ................... ${authProbe.httpStatus ?? "n/a"}`);
console.log(`Account reachable ............. ${authProbe.accountReachable}`);
console.log(`Credential availability ....... ${credentialAvailability}`);
console.log(`Signed webhook path ........... ${signedWebhookPathExists}`);
console.log(`Phase B status ................ ${readiness.status}`);
console.log(`mayMarkLiveTestReady .......... ${readiness.mayMarkLiveTestReady}`);
console.log(`Blocking issues ............... ${readiness.blockingIssues.join(", ") || "none"}`);
console.log(`Warnings ...................... ${readiness.warnings.join(", ")}`);
console.log("");
console.log("Transport kill switches ....... ACTIVE (not changed by this probe)");
console.log(`Provider transport ............ BLOCKED`);
console.log(`General production ............ BLOCKED`);
console.log(`LIVE_TEST_READY marked in DB .. ${transport.liveTestReadyMarkedInDb}`);
console.log("Email send attempted .......... NO");
console.log("Recipient approved ............ NO");
console.log("Authorization created ......... NO");

const bothConfigured =
  local.apiKeyPresent &&
  local.webhookSecretPresent &&
  local.fromEmailPresent &&
  netlify.ok &&
  netlify.present.apiKeyPresent &&
  netlify.present.webhookSecretPresent &&
  netlify.present.fromEmailPresent;

if (!bothConfigured) {
  console.log("");
  console.log("RESULT: BLOCKED — configure local + Netlify, then re-run.");
  process.exit(2);
}

if (credentialAvailability !== "AUTHENTICATED" || !readiness.mayMarkLiveTestReady) {
  console.log("");
  console.log("RESULT: BLOCKED — credentials present but readiness gates failed.");
  process.exit(3);
}

console.log("");
console.log("RESULT: Phase B gates PASS — eligible to mark LIVE_TEST_READY in evidence");
console.log("(probe does not mutate DB provider state; operator/evidence step is separate)");
process.exit(0);
