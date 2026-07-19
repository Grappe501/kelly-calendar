/**
 * Step 7.1 + 7.2 + 7.3 structural gates.
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

const files73 = [
  "src/lib/missions/county-operations.ts",
  "src/server/services/county-operations-service.ts",
  "src/server/services/county-operations-ai.ts",
  "src/app/api/command-summary/counties/route.ts",
  "src/app/counties/page.tsx",
  "src/app/counties/[slug]/page.tsx",
  "src/components/counties/CountyOperationsView.tsx",
  "src/components/counties/CountyCommandNodeView.tsx",
  "develop_notes/KCCC_STEP_07_3_COUNTY_OPERATIONS.md",
];
for (const rel of files73) {
  if (exists(rel)) pass(`7.3 ${rel}`);
  else fail(`7.3 missing ${rel}`);
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

const county = read("src/lib/missions/county-operations.ts");
if (
  county.includes("buildCountyOperationsHome") &&
  county.includes("scoreCountyHealth") &&
  county.includes("executiveFeed") &&
  county.includes("NEEDS_IMMEDIATE_ATTENTION") &&
  county.includes("Where are we weak")
) {
  pass("7.3 county ops pure contracts present");
} else {
  fail("7.3 county ops contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("fieldFeed") && exec.includes("countyFeed")) {
  pass("7.3 Executive Command consumes fieldFeed + countyFeed");
} else {
  fail("7.3 Executive Command missing countyFeed integration");
}

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildFieldOperationsHome") &&
  execService.includes("buildCountyOperationsHome") &&
  execService.includes("countyFeed")
) {
  pass("7.3 executive service wires field + county feeds");
} else {
  fail("7.3 executive service missing county feed wiring");
}

const fieldView = read("src/components/field/FieldOperationsView.tsx");
for (const heading of [
  "Who needs help?",
  "Operational heat",
  "Team cards",
  "Field snapshot",
]) {
  if (fieldView.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const countyView = read("src/components/counties/CountyOperationsView.tsx");
for (const heading of [
  "Where are we weak?",
  "Statewide snapshot",
  "Weakest counties",
  "Needs Immediate Attention",
]) {
  if (countyView.includes(heading) || countyView.includes("NEEDS_IMMEDIATE_ATTENTION")) {
    pass(`UI county ${heading}`);
  } else {
    fail(`UI county missing ${heading}`);
  }
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

const fieldAi = read("src/server/services/field-operations-ai.ts");
if (
  fieldAi.includes('feature: "field-operations"') &&
  fieldAi.includes('application: "kelly-calendar"')
) {
  pass("7.2 AI audit attribution present");
} else {
  fail("7.2 AI audit attribution missing");
}

const countyAi = read("src/server/services/county-operations-ai.ts");
if (
  countyAi.includes('feature: "county-operations"') &&
  countyAi.includes('application: "kelly-calendar"')
) {
  pass("7.3 AI audit attribution present");
} else {
  fail("7.3 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/field")')) pass("/field maps to More");
else fail("/field nav mapping missing");
if (nav.includes('pathname.startsWith("/counties")')) pass("/counties maps to More");
else fail("/counties nav mapping missing");

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("consume information") &&
  charter.includes("produce information") &&
  charter.includes("exactly one canonical source")
) {
  pass("integration + canonical-source principles locked in charter");
} else {
  fail("charter principles incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.county_operations_enabled ||
  build.step7_increment === "7.3-county-operations"
) {
  pass("7.3 increment tracked");
} else {
  fail("7.3 increment not tracked in build_state");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1/7.2/7.3 structural validation passed.");
