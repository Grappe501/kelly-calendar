/**
 * Phase 2.1 Candidate Operations structural gates.
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
  ["2.1", "src/lib/missions/candidate-operations.ts"],
  ["2.1", "src/server/services/candidate-operations-service.ts"],
  ["2.1", "src/server/services/candidate-operations-ai.ts"],
  ["2.1", "src/server/services/phase1-ops-stack.ts"],
  ["2.1", "src/app/api/command-summary/candidate/route.ts"],
  ["2.1", "src/app/candidate/page.tsx"],
  ["2.1", "src/components/candidate/CandidateOperationsView.tsx"],
  ["2.1", "develop_notes/KCCC_PHASE_02_CHARTER.md"],
  ["2.1", "develop_notes/KCCC_PHASE_02_1_CANDIDATE_OPERATIONS.md"],
  ["2.1", "tests/unit/missions/candidate-operations.test.ts"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const candidate = read("src/lib/missions/candidate-operations.ts");
if (
  candidate.includes("buildCandidateOperationsHome") &&
  candidate.includes("orchestrates Phase 1") &&
  candidate.includes("Good Morning Kelly") &&
  candidate.includes("executiveFeed") &&
  candidate.includes("Security") &&
  candidate.includes("Personal") &&
  candidate.includes("combineOperationalReadiness")
) {
  pass("2.1 candidate contracts present");
} else {
  fail("2.1 candidate contracts missing");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("candidateFeed") && exec.includes("Candidate Operations")) {
  pass("2.1 Executive consumes candidateFeed");
} else {
  fail("2.1 Executive missing candidateFeed");
}

const execSvc = read("src/server/services/executive-command-service.ts");
if (
  execSvc.includes("buildCandidateOperationsHome") &&
  execSvc.includes("assemblePhase1OpsStack") &&
  execSvc.includes("candidateFeed")
) {
  pass("2.1 executive service wires candidate");
} else {
  fail("2.1 executive service missing candidate wiring");
}

const view = read("src/components/candidate/CandidateOperationsView.tsx");
for (const phrase of [
  "Is the candidate prepared",
  "Candidate Brief",
  "Good Morning Kelly",
  "Candidate Readiness",
  "Candidate Inbox",
  "Candidate Binder",
  "First-class Unknowns",
  "Orchestrates Phase 1",
]) {
  if (view.includes(phrase)) pass(`UI ${phrase}`);
  else fail(`UI missing ${phrase}`);
}

const ai = read("src/server/services/candidate-operations-ai.ts");
if (
  ai.includes('feature: "candidate-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("2.1 AI audit attribution present");
} else {
  fail("2.1 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes("/candidate")) {
  pass("/candidate maps to More");
} else {
  fail("/candidate nav prefix missing");
}

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("orchestrate Phase 1") &&
  charter.includes("Is the candidate prepared")
) {
  pass("Phase 2 doctrine locked");
} else {
  fail("Phase 2 doctrine missing from charter");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.phase_2_status === "in_progress" ||
  build.phase_2_status === "open"
) {
  pass("Phase 2 open");
} else {
  fail("Phase 2 not marked open/in_progress");
}

if (
  build.candidate_operations_enabled === true ||
  build.phase_2_increment === "2.1-candidate-operations"
) {
  pass("2.1 increment tracked");
} else {
  fail("2.1 increment not tracked");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log("Phase 2.1 structural validation passed.");
