/**
 * Phase 2 structural gates (2.1–2.3).
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
  ["2.2", "src/lib/missions/debate-media-operations.ts"],
  ["2.2", "src/app/debate-media/page.tsx"],
  ["2.3", "src/lib/missions/fundraising-operations.ts"],
  ["2.3", "src/server/services/fundraising-operations-service.ts"],
  ["2.3", "src/server/services/fundraising-operations-ai.ts"],
  ["2.3", "src/app/api/command-summary/fundraising/route.ts"],
  ["2.3", "src/app/fundraising/page.tsx"],
  ["2.3", "src/components/fundraising/FundraisingOperationsView.tsx"],
  ["2.3", "develop_notes/KCCC_PHASE_02_3_FUNDRAISING_OPERATIONS.md"],
  ["2.3", "tests/unit/missions/fundraising-operations.test.ts"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const fr = read("src/lib/missions/fundraising-operations.ts");
if (
  fr.includes("buildFundraisingOperationsHome") &&
  fr.includes("sustainably generate the resources") &&
  fr.includes("Finance owns resource state") &&
  fr.includes("candidateFeed") &&
  fr.includes("communicationsFeed") &&
  fr.includes("intelligenceFeed") &&
  fr.includes("combineOperationalReadiness")
) {
  pass("2.3 fundraising contracts present");
} else {
  fail("2.3 fundraising contracts missing");
}

const candidate = read("src/lib/missions/candidate-operations.ts");
if (candidate.includes("fundraisingConsume") || candidate.includes("fundraisingFeed")) {
  pass("2.3 Candidate consumes Fundraising");
} else {
  fail("2.3 Candidate missing fundraising consume");
}

const comms = read("src/lib/missions/communications-operations.ts");
if (comms.includes("fundraisingConsume")) {
  pass("2.3 Communications consumes Fundraising");
} else {
  fail("2.3 Communications missing fundraisingConsume");
}

const intel = read("src/lib/missions/intelligence-operations.ts");
if (
  intel.includes("fundraisingFeed") &&
  intel.includes("FUNDRAISING_PIPELINE") &&
  intel.includes('"fundraising"')
) {
  pass("2.3 Intelligence consumes Fundraising");
} else {
  fail("2.3 Intelligence missing fundraising feed");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("fundraisingFeed")) {
  pass("2.3 Executive consumes fundraisingFeed");
} else {
  fail("2.3 Executive missing fundraisingFeed");
}

const view = read("src/components/fundraising/FundraisingOperationsView.tsx");
for (const phrase of [
  "sustainably generate the resources",
  "Fundraising readiness",
  "Pipeline Health",
  "First-class Unknowns",
  "Finance owns resource state",
]) {
  if (view.includes(phrase)) pass(`UI ${phrase}`);
  else fail(`UI missing ${phrase}`);
}

const ai = read("src/server/services/fundraising-operations-ai.ts");
if (
  ai.includes('feature: "fundraising-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("2.3 AI audit attribution present");
} else {
  fail("2.3 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes("/fundraising")) pass("/fundraising maps to More");
else fail("/fundraising nav prefix missing");

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("experiences and workflows") &&
  charter.includes("ACCEPTED / COMPLETE") &&
  charter.includes("2.3 Fundraising")
) {
  pass("Phase 2 doctrine #3 + sequencing locked");
} else {
  fail("Phase 2 charter incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.candidate_operations_accepted === true &&
  build.debate_media_operations_accepted === true
) {
  pass("2.1 + 2.2 ACCEPTED");
} else {
  fail("2.1/2.2 acceptance missing");
}

if (
  build.phase_2_increment === "2.3-fundraising-operations" ||
  build.fundraising_operations_enabled === true
) {
  pass("2.3 increment tracked");
} else {
  fail("2.3 increment not tracked");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log("Phase 2 structural validation passed (2.1–2.2 ACCEPTED, 2.3 OPEN).");
