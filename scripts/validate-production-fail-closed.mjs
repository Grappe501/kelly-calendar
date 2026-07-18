import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const checks = [
  {
    file: "src/lib/auth/session-secret-policy.ts",
    needles: [
      "isProductionAuthRuntime",
      "assertProductionSessionSecretOrThrow",
      "development_default_or_forbidden",
    ],
  },
  {
    file: "src/lib/auth/session-cookie.ts",
    needles: ["assertProductionSessionSecretOrThrow", "classifyAppSessionSecret"],
  },
  {
    file: "scripts/seed-auth-users.mjs",
    needles: ["REFUSED: auth:seed is blocked", "KCCC_DEPLOYMENT_PROOF_MODE"],
  },
  {
    file: "scripts/validate-netlify-auth-env.mjs",
    needles: ["development/default session secret prohibited"],
  },
];

let failed = 0;
for (const { file, needles } of checks) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`FAIL: missing ${needle} in ${file}`);
      failed += 1;
    } else {
      console.log(`PASS: ${file} contains ${needle}`);
    }
  }
}

// Forbid naive fallback patterns in session modules
const sessionFiles = [
  "src/lib/auth/session-cookie.ts",
  "src/lib/auth/session-cookie-edge.ts",
  "src/server/auth/provider.ts",
];
for (const file of sessionFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (/APP_SESSION_SECRET\s*\?\?\s*["']/.test(text)) {
    console.error(`FAIL: fallback secret pattern in ${file}`);
    failed += 1;
  } else {
    console.log(`PASS: no ?? secret fallback in ${file}`);
  }
}

if (failed) process.exit(1);
console.log("PASS: production fail-closed controls present");
