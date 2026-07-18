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
  "src/lib/calendar-security/resolve-event-visibility.ts",
  "src/features/calendar-import/run-import.ts",
  "src/features/calendar-import/staging-store.ts",
  "src/features/event-drafts/draft-store.ts",
  "src/features/event-drafts/planning-suggestions.ts",
  "src/app/import/google-calendar/page.tsx",
  "src/app/import/google-calendar/review/page.tsx",
  "src/app/add/quick/page.tsx",
  "src/app/add/full/page.tsx",
  "src/app/system/imports/page.tsx",
  "src/app/api/import/google-calendar/stage/route.ts",
  "src/app/api/drafts/events/route.ts",
  "data/calendar_visibility_policy.json",
  "data/event_templates.json",
  "data/ingest_staging/.gitignore",
  "develop_notes/KCCC_CALENDAR_VISIBILITY_DOCTRINE.md",
  "develop_notes/KCCC_GOOGLE_CALENDAR_HISTORICAL_IMPORT_PROTOCOL.md",
  "develop_notes/KCCC_FAST_EVENT_ENTRY_STANDARD.md",
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
} else pass("no prisma migrations");

const buildState = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/build_state.json"), "utf8"),
);
if (buildState.current_step !== "KCCC-STEP-03-SECURE-INGEST-FAST-ENTRY") {
  fail("build_state current_step must be revised Step 3");
} else pass("build_state revised step 3");
if (buildState.current_step_status !== "complete") fail("build_state not complete");
else pass("build_state complete");
if (buildState.google_historical_import_foundation !== "complete") {
  fail("google import foundation incomplete");
} else pass("google import foundation complete");
if (buildState.quick_event_entry !== "complete") fail("quick entry incomplete");
else pass("quick entry complete");
if (buildState.candidate_data_ready !== false) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");
if (buildState.authentication_complete !== false) fail("authentication_complete must be false");
else pass("authentication incomplete");
if (buildState.database_mutations_authorized !== false) fail("mutations must be unauthorized");
else pass("mutations unauthorized");
if (buildState.ai_enabled !== false) fail("ai must be disabled");
else pass("ai disabled");
if (buildState.google_historical_import_floor !== "2025-11-01") {
  fail("import floor must be 2025-11-01");
} else pass("import floor 2025-11-01");

if (failed) process.exit(1);
console.log("Step 3 validation passed.");
