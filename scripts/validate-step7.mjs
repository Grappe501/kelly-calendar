/**
 * Step 7.1–7.10 structural gates (incl. 7.9 constituents).
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
  ["7.10", "src/lib/missions/intelligence-operations.ts"],
  ["7.10", "src/app/intelligence/page.tsx"],
  ["7.9", "src/lib/missions/constituent-operations.ts"],
  ["7.9", "src/server/services/constituent-operations-service.ts"],
  ["7.9", "src/server/services/constituent-operations-ai.ts"],
  ["7.9", "src/app/api/command-summary/constituents/route.ts"],
  ["7.9", "src/app/constituents/page.tsx"],
  ["7.9", "src/components/constituents/ConstituentOperationsView.tsx"],
  ["7.9", "develop_notes/KCCC_STEP_07_9_CONSTITUENT_OPERATIONS.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const constituents = read("src/lib/missions/constituent-operations.ts");
if (
  constituents.includes("buildConstituentOperationsHome") &&
  constituents.includes("deriveEngagementReadiness") &&
  constituents.includes("executiveFeed") &&
  constituents.includes("countyFeed") &&
  constituents.includes("fieldFeed") &&
  constituents.includes("volunteerFeed") &&
  constituents.includes("communicationsFeed") &&
  constituents.includes("Not a generic CRM")
) {
  pass("7.9 constituent contracts present");
} else {
  fail("7.9 constituent contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("constituentFeed")) {
  pass("7.9 Executive consumes constituentFeed");
} else {
  fail("7.9 Executive missing constituentFeed");
}

const execService = read("src/server/services/executive-command-service.ts");
const phase1Stack = exists("src/server/services/phase1-ops-stack.ts")
  ? read("src/server/services/phase1-ops-stack.ts")
  : "";
if (
  execService.includes("constituentFeed") &&
  (execService.includes("buildConstituentOperationsHome") ||
    (phase1Stack.includes("buildConstituentOperationsHome") &&
      execService.includes("assemblePhase1OpsStack")))
) {
  pass("7.9 executive service wires constituents");
} else {
  fail("7.9 executive service missing constituents");
}

const view = read("src/components/constituents/ConstituentOperationsView.tsx");
for (const heading of [
  "Who are we serving",
  "Relationship snapshot",
  "Not a CRM",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const ai = read("src/server/services/constituent-operations-ai.ts");
if (
  ai.includes('feature: "constituent-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.9 AI audit attribution present");
} else {
  fail("7.9 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/constituents")')) {
  pass("/constituents maps to More");
} else {
  fail("/constituents nav missing");
}

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("improves campaign execution") &&
  charter.includes("never replaces or overrides them")
) {
  pass("decision + non-override doctrine locked");
} else {
  fail("doctrine missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.constituent_operations_enabled ||
  build.step7_increment === "7.9-constituent-operations"
) {
  pass("7.9 increment tracked");
} else {
  fail("7.9 increment not tracked");
}

if (
  build.phase_1_status === "CERTIFIED" &&
  build.constituent_operations_accepted === true &&
  (build.phase_2_status === "recommended_not_started" ||
    build.phase_2_status === "in_progress" ||
    build.phase_2_status === "open")
) {
  pass("Phase 1 CERTIFIED; Phase 2 gate intact");
} else {
  fail("Phase 1 certification / Phase 2 gate missing from build_state");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Phase 1 structural validation passed (Steps 7.1–7.10 CERTIFIED).");
