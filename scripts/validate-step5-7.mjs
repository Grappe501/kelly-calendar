import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function pass(msg) {
  console.log("PASS:", msg);
}
function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}

const required = [
  "develop_notes/KCCC_STEP_05_7_IMPLEMENTATION_REPORT.md",
  "develop_notes/KCCC_STEP_05_7_DEPLOYMENT_RUNBOOK.md",
  "develop_notes/KCCC_STEP_05_7_OPERATOR_ACCEPTANCE.md",
  "develop_notes/KCCC_STEP_05_7_NETLIFY_AUTH_AND_LIVE_MUTATION_PROOF.md",
  "develop_notes/KCCC_NETLIFY_ENVIRONMENT_STANDARD.md",
  "develop_notes/KCCC_PRODUCTION_AUTH_VERIFICATION_STANDARD.md",
  "data/netlify_target.json",
  "src/lib/auth/session-secret-policy.ts",
  "scripts/generate-production-session-secret.mjs",
  "scripts/secret-scan.mjs",
  "scripts/validate-production-fail-closed.mjs",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(rel);
  else fail(`missing ${rel}`);
}

const build = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (build.completed_steps?.includes("KCCC-STEP-06-MOBILE-COMMAND-SHELL")) {
  fail("Step 6 must not be complete");
} else pass("Step 6 not complete");

if (build.next_step === "KCCC-STEP-06-MOBILE-COMMAND-SHELL" && !build.operator_acceptance_recorded) {
  fail("Step 6 must not be next_step before operator acceptance");
} else pass("Step 6 not promoted without acceptance");

if (
  build.current_step !== "KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF" &&
  build.next_step !== "KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF"
) {
  fail("Step 5.7 must be current or next");
} else pass("Step 5.7 is active in build_state");

const acceptance = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_STEP_05_7_OPERATOR_ACCEPTANCE.md"),
  "utf8",
);
if (/Operator decision:\s*\n\s*\[x\]\s*ACCEPT/i.test(acceptance)) {
  fail("Operator ACCEPT checked without Steve sign-off authority in this pass");
} else pass("Operator acceptance not falsely marked ACCEPT");

if (failed) process.exit(1);
console.log("Step 5.7 structural validation passed (deploy/operator gates remain separate).");
