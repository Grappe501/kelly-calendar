/**
 * Step 7.1–7.8 + 7.10 structural gates.
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
  ["7.8", "src/lib/missions/compliance-operations.ts"],
  ["7.8", "src/app/compliance/page.tsx"],
  ["7.10", "src/lib/missions/intelligence-operations.ts"],
  ["7.10", "src/server/services/intelligence-operations-service.ts"],
  ["7.10", "src/server/services/intelligence-operations-ai.ts"],
  ["7.10", "src/app/api/command-summary/intelligence/route.ts"],
  ["7.10", "src/app/intelligence/page.tsx"],
  ["7.10", "src/components/intelligence/IntelligenceOperationsView.tsx"],
  ["7.10", "develop_notes/KCCC_STEP_07_10_OPERATIONAL_INTELLIGENCE.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const intelligence = read("src/lib/missions/intelligence-operations.ts");
if (
  intelligence.includes("buildOperationalIntelligenceHome") &&
  intelligence.includes("interpretationOnly") &&
  intelligence.includes("never replaces or overrides") &&
  intelligence.includes("executiveFeed") &&
  intelligence.includes("canonicalFact") &&
  intelligence.includes("buildEmergingRisks")
) {
  pass("7.10 intelligence contracts present");
} else {
  fail("7.10 intelligence contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("intelligenceFeed")) {
  pass("7.10 Executive consumes intelligenceFeed");
} else {
  fail("7.10 Executive missing intelligenceFeed");
}

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildOperationalIntelligenceHome") &&
  execService.includes("intelligenceFeed")
) {
  pass("7.10 executive service wires intelligence");
} else {
  fail("7.10 executive service missing intelligence");
}

const view = read("src/components/intelligence/IntelligenceOperationsView.tsx");
for (const heading of [
  "patterns, risks, and opportunities",
  "Intelligence snapshot",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}
if (
  view.includes("never") &&
  view.includes("replaces") &&
  view.includes("overrides")
) {
  pass("UI non-override doctrine present");
} else {
  fail("UI missing non-override doctrine");
}

const ai = read("src/server/services/intelligence-operations-ai.ts");
if (
  ai.includes('feature: "operational-intelligence"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.10 AI audit attribution present");
} else {
  fail("7.10 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/intelligence")')) {
  pass("/intelligence maps to More");
} else {
  fail("/intelligence nav missing");
}

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("never replaces or overrides them") &&
  charter.includes("Compliance is a readiness domain")
) {
  pass("intelligence non-override + compliance doctrine locked");
} else {
  fail("doctrine missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.operational_intelligence_enabled ||
  build.step7_increment === "7.10-operational-intelligence"
) {
  pass("7.10 increment tracked");
} else {
  fail("7.10 increment not tracked");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.8 + 7.10 structural validation passed.");
