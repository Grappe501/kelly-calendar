/**
 * Step 7.1–7.7 structural gates.
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
  ["7.6", "src/app/logistics/page.tsx"],
  ["7.7", "src/lib/missions/finance-operations.ts"],
  ["7.7", "src/server/services/finance-operations-service.ts"],
  ["7.7", "src/server/services/finance-operations-ai.ts"],
  ["7.7", "src/app/api/command-summary/finance/route.ts"],
  ["7.7", "src/app/finance/page.tsx"],
  ["7.7", "src/components/finance/FinanceOperationsView.tsx"],
  ["7.7", "develop_notes/KCCC_STEP_07_7_FINANCE_OPERATIONS.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const finance = read("src/lib/missions/finance-operations.ts");
if (
  finance.includes("buildFinanceOperationsHome") &&
  finance.includes("deriveResourceState") &&
  finance.includes("CommitmentDualState") &&
  finance.includes("executiveFeed") &&
  finance.includes("logisticsFeed") &&
  finance.includes("countyFeed") &&
  finance.includes("communicationsFeed") &&
  finance.includes("volunteerFeed") &&
  finance.includes("fieldFeed")
) {
  pass("7.7 finance contracts present");
} else {
  fail("7.7 finance contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("financeFeed")) pass("7.7 Executive consumes financeFeed");
else fail("7.7 Executive missing financeFeed");

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildFinanceOperationsHome") &&
  execService.includes("financeFeed")
) {
  pass("7.7 executive service wires finance");
} else {
  fail("7.7 executive service missing finance");
}

const countyService = read("src/server/services/county-operations-service.ts");
if (countyService.includes("financeFeed")) pass("7.7 county consumes finance");
else fail("7.7 county missing finance");

const view = read("src/components/finance/FinanceOperationsView.tsx");
for (const heading of [
  "Do we have the resources",
  "Resource snapshot",
  "operational state and a resource state",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const ai = read("src/server/services/finance-operations-ai.ts");
if (
  ai.includes('feature: "finance-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.7 AI audit attribution present");
} else {
  fail("7.7 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/finance")')) pass("/finance maps to More");
else fail("/finance nav missing");

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("operational state and a resource state") &&
  charter.includes("minimum readiness of all required operational domains")
) {
  pass("dual-state + min-readiness doctrine locked");
} else {
  fail("doctrine missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.finance_operations_enabled ||
  build.step7_increment === "7.7-finance-operations"
) {
  pass("7.7 increment tracked");
} else {
  fail("7.7 increment not tracked");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.7 structural validation passed.");
