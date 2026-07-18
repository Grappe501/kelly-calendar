import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function pass(m) {
  console.log("PASS:", m);
}
function fail(m) {
  console.error("FAIL:", m);
  failed += 1;
}

const required = [
  "src/server/auth/actor.ts",
  "src/server/auth/authorization.ts",
  "src/server/auth/actions.ts",
  "src/server/auth/api-mutation.ts",
  "src/server/repositories/event-mutation-repository.ts",
  "src/server/services/event-service.ts",
  "src/server/services/event-plan-service.ts",
  "src/server/services/authenticated-ops-service.ts",
  "src/app/api/events/route.ts",
  "src/app/api/events/[eventId]/route.ts",
  "src/app/api/events/[eventId]/workflow/apply/route.ts",
  "src/app/api/approvals/[approvalId]/approve/route.ts",
  "src/app/system/step-5-6/page.tsx",
  "develop_notes/KCCC_STEP_05_6_IMPLEMENTATION_REPORT.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(rel);
  else fail(`missing ${rel}`);
}

const eventsRoute = fs.readFileSync(path.join(root, "src/app/api/events/route.ts"), "utf8");
if (eventsRoute.includes("requireActiveAuthenticatedActor") || eventsRoute.includes("withAuthenticatedMutation")) {
  pass("event create uses authenticated mutation wrapper");
} else fail("event create missing authenticated wrapper");

if (eventsRoute.includes("body.userId") || eventsRoute.includes("actorUserId")) {
  fail("client-supplied actor identity detected in events route");
} else pass("no client actor identity in events route");

const build = JSON.parse(fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must remain false");
else pass("candidate_data_ready false");
if (!build.completed_steps?.includes("KCCC-STEP-04-AUTH-RBAC")) fail("Step 4 must remain complete");
else pass("Step 4 complete");
if (build.completed_steps?.includes("KCCC-STEP-06-MOBILE-COMMAND-SHELL")) {
  fail("Step 6 must not be marked complete");
} else pass("Step 6 not started");

if (failed) {
  console.error(`Step 5.6 validation FAILED (${failed}).`);
  process.exit(1);
}
console.log("Step 5.6 validation passed.");
