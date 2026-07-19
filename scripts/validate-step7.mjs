/**
 * Step 7.1 + 7.2 structural gates.
 */
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
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files71 = [
  "src/lib/missions/executive-command.ts",
  "src/server/services/executive-command-service.ts",
  "src/app/command/page.tsx",
  "src/components/command/ExecutiveCommandView.tsx",
];
for (const rel of files71) {
  if (exists(rel)) pass(`7.1 ${rel}`);
  else fail(`7.1 missing ${rel}`);
}

const files72 = [
  "src/lib/missions/field-operations.ts",
  "src/server/services/field-operations-service.ts",
  "src/server/services/field-operations-ai.ts",
  "src/app/api/command-summary/field/route.ts",
  "src/app/field/page.tsx",
  "src/components/field/FieldOperationsView.tsx",
  "src/components/field/FieldCheckIns.tsx",
  "develop_notes/KCCC_STEP_07_2_FIELD_OPERATIONS.md",
];
for (const rel of files72) {
  if (exists(rel)) pass(`7.2 ${rel}`);
  else fail(`7.2 missing ${rel}`);
}

const field = read("src/lib/missions/field-operations.ts");
if (
  field.includes("buildFieldOperationsHome") &&
  field.includes("helpQueue") &&
  field.includes("executiveFeed") &&
  field.includes("fieldCheckInToDayAction") &&
  field.includes("deriveFieldEscalation")
) {
  pass("7.2 field ops pure contracts present");
} else {
  fail("7.2 field ops contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("fieldFeed") && exec.includes("Field Operations")) {
  pass("7.2 Executive Command consumes fieldFeed");
} else if (exec.includes("fieldFeed")) {
  pass("7.2 Executive Command consumes fieldFeed");
} else {
  fail("7.2 Executive Command missing fieldFeed integration");
}

const execService = read("src/server/services/executive-command-service.ts");
if (execService.includes("buildFieldOperationsHome") && execService.includes("fieldFeed")) {
  pass("7.2 executive service wires field feed");
} else {
  fail("7.2 executive service missing field feed wiring");
}

const view = read("src/components/field/FieldOperationsView.tsx");
for (const heading of [
  "Who needs help?",
  "Operational heat",
  "Team cards",
  "Field snapshot",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const checkIns = read("src/components/field/FieldCheckIns.tsx");
if (
  checkIns.includes("ON_SITE") &&
  checkIns.includes("mission-day") &&
  checkIns.includes("expectedVersion")
) {
  pass("7.2 check-ins use authenticated mission-day mutations");
} else {
  fail("7.2 check-ins not wired to mission-day");
}

const ai = read("src/server/services/field-operations-ai.ts");
if (
  ai.includes('feature: "field-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.2 AI audit attribution present");
} else {
  fail("7.2 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/field")')) pass("/field maps to More");
else fail("/field nav mapping missing");

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("consume information") &&
  charter.includes("produce information")
) {
  pass("integration principle locked in charter");
} else {
  fail("integration principle missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (build.field_operations_enabled || build.step7_increment === "7.2-field-operations") {
  pass("7.2 increment tracked");
} else {
  fail("7.2 increment not tracked in build_state");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1/7.2 structural validation passed.");
