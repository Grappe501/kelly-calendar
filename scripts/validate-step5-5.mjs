import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;
function pass(m) {
  console.log("PASS:", m);
}
function fail(m) {
  console.error("FAIL:", m);
  failed = true;
}

const required = [
  "src/features/operational-intelligence/workflow-definitions/registry.ts",
  "src/features/operational-intelligence/rules/rule-registry.ts",
  "src/features/operational-intelligence/services/readiness-service.ts",
  "src/features/operational-intelligence/services/timeline-service.ts",
  "src/features/operational-intelligence/services/conflict-service.ts",
  "src/app/system/step-5-5/page.tsx",
  "develop_notes/KCCC_STEP_05_5_IMPLEMENTATION_REPORT.md",
  "prisma/migrations/20260718170000_operational_intelligence_foundation/migration.sql",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

const build = JSON.parse(fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"));
if (build.ai_enabled === true) fail("ai must remain disabled");
else pass("ai disabled");
if (build.candidate_data_ready === true) fail("candidate_data_ready must stay false");
else pass("candidate_data_ready remains false");
if (build.autonomous_event_changes === true) fail("autonomous changes forbidden");
else pass("no autonomous event changes");
if (
  build.current_step !== "KCCC-STEP-05.5-OPERATIONAL-INTELLIGENCE" &&
  build.current_step !== "KCCC-STEP-04-AUTH-RBAC"
) {
  fail("current_step unexpected");
} else pass(`current_step is ${build.current_step}`);

const sql = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260718170000_operational_intelligence_foundation/migration.sql",
  ),
  "utf8",
);
if (/CREATE TABLE\s+"?public"?\./i.test(sql)) fail("public tables");
else pass("OI migration stays in kelly_calendar");

if (failed) process.exit(1);
console.log("Step 5.5 validation passed.");
