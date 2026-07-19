/**
 * Step 7.1–7.6 structural gates.
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

const required = [
  ["7.6", "src/lib/missions/logistics-operations.ts"],
  ["7.6", "src/server/services/logistics-operations-service.ts"],
  ["7.6", "src/server/services/logistics-operations-ai.ts"],
  ["7.6", "src/app/api/command-summary/logistics/route.ts"],
  ["7.6", "src/app/logistics/page.tsx"],
  ["7.6", "src/components/logistics/LogisticsOperationsView.tsx"],
  ["7.6", "develop_notes/KCCC_STEP_07_6_LOGISTICS_OPERATIONS.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const logistics = read("src/lib/missions/logistics-operations.ts");
if (
  logistics.includes("buildLogisticsOperationsHome") &&
  logistics.includes("combineOperationalReadiness") &&
  logistics.includes("executiveFeed") &&
  logistics.includes("fieldFeed") &&
  logistics.includes("communicationsFeed") &&
  logistics.includes("volunteerFeed")
) {
  pass("7.6 logistics contracts present");
} else {
  fail("7.6 logistics contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("logisticsFeed")) pass("7.6 Executive consumes logisticsFeed");
else fail("7.6 Executive missing logisticsFeed");

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildLogisticsOperationsHome") &&
  execService.includes("logisticsFeed")
) {
  pass("7.6 executive service wires logistics");
} else {
  fail("7.6 executive service missing logistics");
}

const fieldService = read("src/server/services/field-operations-service.ts");
if (fieldService.includes("logisticsFieldFeed")) {
  pass("7.6 field consumes logistics");
} else {
  fail("7.6 field missing logistics");
}

const view = read("src/components/logistics/LogisticsOperationsView.tsx");
for (const heading of [
  "Can we actually execute",
  "Logistics snapshot",
  "minimum of required domains",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const ai = read("src/server/services/logistics-operations-ai.ts");
if (
  ai.includes('feature: "logistics-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.6 AI audit attribution present");
} else {
  fail("7.6 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/logistics")')) pass("/logistics maps to More");
else fail("/logistics nav missing");

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (charter.includes("minimum readiness of all required operational domains")) {
  pass("min-readiness doctrine locked");
} else {
  fail("min-readiness doctrine missing");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.logistics_operations_enabled ||
  build.step7_increment === "7.6-logistics-operations"
) {
  pass("7.6 increment tracked");
} else {
  fail("7.6 increment not tracked");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.6 structural validation passed.");
