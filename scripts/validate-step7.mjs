/**
 * Step 7.1–7.8 structural gates.
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
  ["7.7", "src/lib/missions/finance-operations.ts"],
  ["7.7", "src/app/finance/page.tsx"],
  ["7.8", "src/lib/missions/compliance-operations.ts"],
  ["7.8", "src/server/services/compliance-operations-service.ts"],
  ["7.8", "src/server/services/compliance-operations-ai.ts"],
  ["7.8", "src/app/api/command-summary/compliance/route.ts"],
  ["7.8", "src/app/compliance/page.tsx"],
  ["7.8", "src/components/compliance/ComplianceOperationsView.tsx"],
  ["7.8", "develop_notes/KCCC_STEP_07_8_COMPLIANCE_OPERATIONS.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const compliance = read("src/lib/missions/compliance-operations.ts");
if (
  compliance.includes("buildComplianceOperationsHome") &&
  compliance.includes("deriveComplianceState") &&
  compliance.includes("CommitmentTripleState") &&
  compliance.includes("executiveFeed") &&
  compliance.includes("financeFeed") &&
  compliance.includes("communicationsFeed") &&
  compliance.includes("fieldFeed") &&
  compliance.includes("countyFeed")
) {
  pass("7.8 compliance contracts present");
} else {
  fail("7.8 compliance contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("complianceFeed")) pass("7.8 Executive consumes complianceFeed");
else fail("7.8 Executive missing complianceFeed");

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildComplianceOperationsHome") &&
  execService.includes("complianceFeed")
) {
  pass("7.8 executive service wires compliance");
} else {
  fail("7.8 executive service missing compliance");
}

const fieldService = read("src/server/services/field-operations-service.ts");
if (fieldService.includes("complianceFieldFeed")) {
  pass("7.8 field consumes compliance");
} else {
  fail("7.8 field missing compliance");
}

const financeService = read("src/server/services/finance-operations-service.ts");
if (financeService.includes("complianceConsume") || financeService.includes("compliance.financeFeed")) {
  pass("7.8 finance consumes compliance");
} else {
  fail("7.8 finance missing compliance");
}

const view = read("src/components/compliance/ComplianceOperationsView.tsx");
for (const heading of [
  "legally, ethically",
  "Compliance snapshot",
  "readiness domain, not an after-the-fact audit",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const ai = read("src/server/services/compliance-operations-ai.ts");
if (
  ai.includes('feature: "compliance-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.8 AI audit attribution present");
} else {
  fail("7.8 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/compliance")')) {
  pass("/compliance maps to More");
} else {
  fail("/compliance nav missing");
}

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("Compliance is a readiness domain") &&
  charter.includes("operational state and a resource state") &&
  charter.includes("minimum readiness of all required operational domains")
) {
  pass("compliance + dual-state + min-readiness doctrine locked");
} else {
  fail("doctrine missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.compliance_operations_enabled ||
  build.step7_increment === "7.8-compliance-operations"
) {
  pass("7.8 increment tracked");
} else {
  fail("7.8 increment not tracked");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.8 structural validation passed.");
