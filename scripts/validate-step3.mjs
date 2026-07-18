import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const required = [
  "src/lib/env/load-server-environment.ts",
  "src/lib/env/public-environment.ts",
  "src/lib/env/server-environment.ts",
  "src/lib/env/redact-environment.ts",
  "src/lib/security/headers.ts",
  "src/lib/security/safe-error.ts",
  "src/lib/security/safe-redirect.ts",
  "src/lib/security/origin.ts",
  "src/lib/security/cookies.ts",
  "src/lib/security/rate-limit.ts",
  "src/lib/logging/logger.ts",
  "src/lib/db/connection-diagnostic.ts",
  "src/lib/campaign/availability-policy.ts",
  "src/middleware.ts",
  "src/app/system/environment/page.tsx",
  "src/app/system/security/page.tsx",
  "src/app/api/system/environment/route.ts",
  "src/app/api/system/security/route.ts",
  "scripts/validate-environment.mjs",
  "scripts/verify-client-bundle-secrets.mjs",
  "scripts/inspect-security-headers.mjs",
  "scripts/validate-step3.mjs",
  "develop_notes/KCCC_STEP_03_IMPLEMENTATION_REPORT.md",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(repoRoot, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const schema = fs.readFileSync(path.join(repoRoot, "prisma/schema.prisma"), "utf8");
if (/^\s*model\s+/m.test(schema)) fail("prisma models must not exist yet");
else pass("no prisma models");

const migrations = path.join(repoRoot, "prisma/migrations");
if (fs.existsSync(migrations) && fs.readdirSync(migrations).length) {
  fail("prisma migrations must not be added in Step 3");
} else {
  pass("no prisma migrations");
}

const buildState = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/build_state.json"), "utf8"),
);
if (buildState.current_step !== "KCCC-STEP-03-ENV-SECURITY") {
  fail("build_state current_step must be Step 3");
} else pass("build_state step 3");
if (buildState.current_step_status !== "complete") fail("build_state not complete");
else pass("build_state complete");
if (buildState.candidate_data_ready !== false) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");
if (buildState.authentication_complete !== false) fail("authentication_complete must be false");
else pass("authentication incomplete");

const availability = fs.readFileSync(
  path.join(repoRoot, "src/lib/campaign/availability-policy.ts"),
  "utf8",
);
if (!availability.includes("08:00") || !availability.includes("Little Rock")) {
  fail("standing availability policy missing work blocks or Tuesday Little Rock");
} else {
  pass("standing availability policy present");
}

if (failed) process.exit(1);
console.log("Step 3 validation passed.");
