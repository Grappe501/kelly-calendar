/**
 * Step 7.1–7.4 structural gates.
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
  "src/app/field/page.tsx",
  "src/components/field/FieldOperationsView.tsx",
];
for (const rel of files72) {
  if (exists(rel)) pass(`7.2 ${rel}`);
  else fail(`7.2 missing ${rel}`);
}

const files73 = [
  "src/lib/missions/county-operations.ts",
  "src/server/services/county-operations-service.ts",
  "src/app/counties/page.tsx",
  "src/components/counties/CountyOperationsView.tsx",
];
for (const rel of files73) {
  if (exists(rel)) pass(`7.3 ${rel}`);
  else fail(`7.3 missing ${rel}`);
}

const files74 = [
  "src/lib/missions/volunteer-operations.ts",
  "src/server/services/volunteer-operations-service.ts",
  "src/server/services/volunteer-operations-ai.ts",
  "src/app/api/command-summary/volunteers/route.ts",
  "src/app/volunteers/page.tsx",
  "src/components/volunteers/VolunteerOperationsView.tsx",
  "develop_notes/KCCC_STEP_07_4_VOLUNTEER_OPERATIONS.md",
];
for (const rel of files74) {
  if (exists(rel)) pass(`7.4 ${rel}`);
  else fail(`7.4 missing ${rel}`);
}

const volunteer = read("src/lib/missions/volunteer-operations.ts");
if (
  volunteer.includes("buildVolunteerOperationsHome") &&
  volunteer.includes("availableVolunteers") &&
  volunteer.includes("executiveFeed") &&
  volunteer.includes("countyFeed") &&
  volunteer.includes("fieldFeed") &&
  volunteer.includes("first-class")
) {
  pass("7.4 volunteer ops pure contracts present");
} else {
  fail("7.4 volunteer ops contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("fieldFeed") && exec.includes("countyFeed") && exec.includes("volunteerFeed")) {
  pass("7.4 Executive Command consumes field + county + volunteer feeds");
} else {
  fail("7.4 Executive Command missing volunteerFeed");
}

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildVolunteerOperationsHome") &&
  execService.includes("volunteerFeed")
) {
  pass("7.4 executive service wires volunteer feed");
} else {
  fail("7.4 executive service missing volunteer wiring");
}

const fieldService = read("src/server/services/field-operations-service.ts");
if (fieldService.includes("volunteerFieldFeed") || fieldService.includes("buildVolunteerOperationsHome")) {
  pass("7.4 field service consumes volunteer feed");
} else {
  fail("7.4 field service missing volunteer consume");
}

const countyService = read("src/server/services/county-operations-service.ts");
if (countyService.includes("volunteerFeed") && countyService.includes("buildVolunteerOperationsHome")) {
  pass("7.4 county service consumes volunteer feed");
} else {
  fail("7.4 county service missing volunteer consume");
}

const volView = read("src/components/volunteers/VolunteerOperationsView.tsx");
for (const heading of [
  "Do we have enough people",
  "Capacity snapshot",
  "Recruitment priority",
  "First-class Unknowns",
]) {
  if (volView.includes(heading)) pass(`UI vol ${heading}`);
  else fail(`UI vol missing ${heading}`);
}

const volAi = read("src/server/services/volunteer-operations-ai.ts");
if (
  volAi.includes('feature: "volunteer-operations"') &&
  volAi.includes('application: "kelly-calendar"')
) {
  pass("7.4 AI audit attribution present");
} else {
  fail("7.4 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/volunteers")')) pass("/volunteers maps to More");
else fail("/volunteers nav mapping missing");

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("exactly one canonical source") &&
  charter.includes("Unknown is a first-class operational state")
) {
  pass("canonical-source + Unknown principles locked in charter");
} else {
  fail("charter principles incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.volunteer_operations_enabled ||
  build.step7_increment === "7.4-volunteer-operations"
) {
  pass("7.4 increment tracked");
} else {
  fail("7.4 increment not tracked in build_state");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.4 structural validation passed.");
