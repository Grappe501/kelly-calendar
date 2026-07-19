/**
 * Phase 2 structural gates (2.1–2.5).
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
  ["2.4", "src/lib/missions/gotv-operations.ts"],
  ["2.5", "src/lib/missions/petition-ballot-operations.ts"],
  ["2.5", "src/server/services/petition-ballot-operations-service.ts"],
  ["2.5", "src/server/services/petition-ballot-operations-ai.ts"],
  ["2.5", "src/app/api/command-summary/petition/route.ts"],
  ["2.5", "src/app/petition/page.tsx"],
  ["2.5", "src/components/petition/PetitionBallotOperationsView.tsx"],
  ["2.5", "develop_notes/KCCC_PHASE_02_5_PETITION_BALLOT_OPERATIONS.md"],
  ["2.5", "tests/unit/missions/petition-ballot-operations.test.ts"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const petition = read("src/lib/missions/petition-ballot-operations.ts");
if (
  petition.includes("buildPetitionBallotOperationsHome") &&
  petition.includes("qualify, defend, and execute") &&
  petition.includes("execution truth") &&
  petition.includes("candidateFeed") &&
  petition.includes("countyFeed") &&
  petition.includes("volunteerFeed") &&
  petition.includes("communicationsFeed") &&
  petition.includes("intelligenceFeed") &&
  petition.includes("combineOperationalReadiness")
) {
  pass("2.5 Petition contracts present");
} else {
  fail("2.5 Petition contracts missing");
}

const candidate = read("src/lib/missions/candidate-operations.ts");
if (candidate.includes("petitionConsume") || candidate.includes("petitionFeed")) {
  pass("2.5 Candidate consumes Petition");
} else {
  fail("2.5 Candidate missing Petition consume");
}

const county = read("src/lib/missions/county-operations.ts");
if (county.includes("petitionConsume")) pass("2.5 County consumes Petition");
else fail("2.5 County missing petitionConsume");

const vol = read("src/lib/missions/volunteer-operations.ts");
if (vol.includes("petitionConsume")) pass("2.5 Volunteer consumes Petition");
else fail("2.5 Volunteer missing petitionConsume");

const comms = read("src/lib/missions/communications-operations.ts");
if (comms.includes("petitionConsume")) pass("2.5 Communications consumes Petition");
else fail("2.5 Communications missing petitionConsume");

const intel = read("src/lib/missions/intelligence-operations.ts");
if (intel.includes("petitionFeed") && intel.includes("PETITION_BALLOT")) {
  pass("2.5 Intelligence consumes Petition");
} else {
  fail("2.5 Intelligence missing Petition feed");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("petitionFeed")) pass("2.5 Executive consumes petitionFeed");
else fail("2.5 Executive missing petitionFeed");

const view = read("src/components/petition/PetitionBallotOperationsView.tsx");
for (const phrase of [
  "qualify, defend, and execute",
  "Petition readiness",
  "Collection Progress",
  "Validation Risk",
  "First-class Unknowns",
  "execution truth",
]) {
  if (view.includes(phrase)) pass(`UI ${phrase}`);
  else fail(`UI missing ${phrase}`);
}

const ai = read("src/server/services/petition-ballot-operations-ai.ts");
if (
  ai.includes('feature: "petition-ballot-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("2.5 AI audit attribution present");
} else {
  fail("2.5 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes("/petition")) pass("/petition maps to More");
else fail("/petition nav prefix missing");

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("coordinate campaign strategy") &&
  charter.includes("2.5 Petition") &&
  charter.includes("2.4 GOTV")
) {
  pass("Phase 2 doctrine #5 + sequencing locked");
} else {
  fail("Phase 2 charter incomplete");
}

const gotvDoc = read("develop_notes/KCCC_PHASE_02_4_GOTV_OPERATIONS.md");
if (gotvDoc.includes("ACCEPTED")) pass("2.4 GOTV ACCEPTED recorded");
else fail("2.4 GOTV acceptance missing from docs");

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.fundraising_operations_accepted === true &&
  build.debate_media_operations_accepted === true &&
  build.candidate_operations_accepted === true &&
  build.gotv_operations_accepted === true
) {
  pass("2.1–2.4 ACCEPTED");
} else {
  fail("2.1–2.4 acceptance missing");
}

if (
  build.phase_2_increment === "2.5-petition-ballot-operations" ||
  build.petition_ballot_operations_enabled === true
) {
  pass("2.5 increment tracked");
} else {
  fail("2.5 increment not tracked");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log(
  "Phase 2 structural validation passed (2.1–2.4 ACCEPTED, 2.5 OPEN).",
);
