/**
 * Phase 2 structural gates (2.1–2.4).
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
  ["2.3", "src/lib/missions/fundraising-operations.ts"],
  ["2.4", "src/lib/missions/gotv-operations.ts"],
  ["2.4", "src/server/services/gotv-operations-service.ts"],
  ["2.4", "src/server/services/gotv-operations-ai.ts"],
  ["2.4", "src/app/api/command-summary/gotv/route.ts"],
  ["2.4", "src/app/gotv/page.tsx"],
  ["2.4", "src/components/gotv/GotvOperationsView.tsx"],
  ["2.4", "develop_notes/KCCC_PHASE_02_4_GOTV_OPERATIONS.md"],
  ["2.4", "tests/unit/missions/gotv-operations.test.ts"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const gotv = read("src/lib/missions/gotv-operations.ts");
if (
  gotv.includes("buildGotvOperationsHome") &&
  gotv.includes("converting support into turnout") &&
  gotv.includes("does not replicate") &&
  gotv.includes("candidateFeed") &&
  gotv.includes("countyFeed") &&
  gotv.includes("volunteerFeed") &&
  gotv.includes("communicationsFeed") &&
  gotv.includes("intelligenceFeed") &&
  gotv.includes("combineOperationalReadiness")
) {
  pass("2.4 GOTV contracts present");
} else {
  fail("2.4 GOTV contracts missing");
}

const candidate = read("src/lib/missions/candidate-operations.ts");
if (candidate.includes("gotvConsume") || candidate.includes("gotvFeed")) {
  pass("2.4 Candidate consumes GOTV");
} else {
  fail("2.4 Candidate missing GOTV consume");
}

const county = read("src/lib/missions/county-operations.ts");
if (county.includes("gotvConsume")) pass("2.4 County consumes GOTV");
else fail("2.4 County missing gotvConsume");

const vol = read("src/lib/missions/volunteer-operations.ts");
if (vol.includes("gotvConsume")) pass("2.4 Volunteer consumes GOTV");
else fail("2.4 Volunteer missing gotvConsume");

const comms = read("src/lib/missions/communications-operations.ts");
if (comms.includes("gotvConsume")) pass("2.4 Communications consumes GOTV");
else fail("2.4 Communications missing gotvConsume");

const intel = read("src/lib/missions/intelligence-operations.ts");
if (intel.includes("gotvFeed") && intel.includes("GOTV_TURNOUT")) {
  pass("2.4 Intelligence consumes GOTV");
} else {
  fail("2.4 Intelligence missing GOTV feed");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("gotvFeed")) pass("2.4 Executive consumes gotvFeed");
else fail("2.4 Executive missing gotvFeed");

const view = read("src/components/gotv/GotvOperationsView.tsx");
for (const phrase of [
  "converting support into turnout",
  "GOTV readiness",
  "Coverage Gaps",
  "Turnout Risk",
  "First-class Unknowns",
  "does not replicate those domains",
]) {
  if (view.includes(phrase)) pass(`UI ${phrase}`);
  else fail(`UI missing ${phrase}`);
}

const ai = read("src/server/services/gotv-operations-ai.ts");
if (
  ai.includes('feature: "gotv-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("2.4 AI audit attribution present");
} else {
  fail("2.4 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes("/gotv")) pass("/gotv maps to More");
else fail("/gotv nav prefix missing");

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("coordinate execution across operational domains") &&
  charter.includes("2.4 GOTV")
) {
  pass("Phase 2 doctrine #4 + sequencing locked");
} else {
  fail("Phase 2 charter incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.fundraising_operations_accepted === true &&
  build.debate_media_operations_accepted === true &&
  build.candidate_operations_accepted === true
) {
  pass("2.1–2.3 ACCEPTED");
} else {
  fail("2.1–2.3 acceptance missing");
}

if (
  build.phase_2_increment === "2.4-gotv-operations" ||
  build.gotv_operations_enabled === true
) {
  pass("2.4 increment tracked");
} else {
  fail("2.4 increment not tracked");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log("Phase 2 structural validation passed (2.1–2.3 ACCEPTED, 2.4 OPEN).");
