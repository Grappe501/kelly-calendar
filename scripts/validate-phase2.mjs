/**
 * Phase 2 structural gates — CERTIFIED (2.1–2.5 ACCEPTED).
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
  ["2.5", "src/lib/missions/petition-ballot-operations.ts"],
  ["2.5", "src/app/petition/page.tsx"],
  ["2.5", "develop_notes/KCCC_PHASE_02_5_PETITION_BALLOT_OPERATIONS.md"],
  ["cert", "develop_notes/KCCC_PHASE_02_CERTIFICATION.md"],
  ["cert", "develop_notes/KCCC_PHASE_03_CHARTER.md"],
  ["const", "develop_notes/KCCC_CONSTITUTION_v1.0.md"],
  ["freeze", "develop_notes/KCCC_ARCHITECTURE_FREEZE_v1.0.md"],
  ["gov", "develop_notes/KCCC_GOVERNANCE_STATE_v1.0.md"],
  ["rel", "develop_notes/KCCC_ARCHITECTURE_1.0_BASELINE_RELEASE.md"],
  ["close", "develop_notes/KCCC_ARCHITECTURE_1.0_PROGRAM_CLOSE.md"],
  ["exit", "develop_notes/KCCC_PHASE_03_EXIT_REVIEW.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const constitution = read("develop_notes/KCCC_CONSTITUTION_v1.0.md");
if (
  constitution.includes("BASELINE RELEASE") &&
  constitution.includes("No duplicate ownership") &&
  constitution.includes("No AI writes to canonical state") &&
  constitution.includes("LEVEL A") &&
  constitution.includes("LEVEL E") &&
  constitution.includes("Approve → Execute") &&
  constitution.includes("Formal RFC") &&
  constitution.includes("Architecture vs application versioning")
) {
  pass("Constitution v1.0 baseline release + change control");
} else {
  fail("Constitution v1.0 incomplete");
}

const governance = read("develop_notes/KCCC_GOVERNANCE_STATE_v1.0.md");
if (
  governance.includes("CLOSED") &&
  governance.includes("NOT AUTHORIZED") &&
  governance.includes("NOT STARTED") &&
  governance.includes("Proposal Required") &&
  governance.includes("RFC Required") &&
  governance.includes("0.8.4-petition")
) {
  pass("Governance State v1.0 present (program closed)");
} else {
  fail("Governance State v1.0 incomplete");
}

const release = read("develop_notes/KCCC_ARCHITECTURE_1.0_BASELINE_RELEASE.md");
if (
  release.includes("Lifecycle State") &&
  release.includes("CLOSED") &&
  release.includes("NOT AUTHORIZED") &&
  release.includes("2dbc1d9")
) {
  pass("Architecture 1.0 Baseline Release declaration present");
} else {
  fail("Baseline Release declaration incomplete");
}

const programClose = read("develop_notes/KCCC_ARCHITECTURE_1.0_PROGRAM_CLOSE.md");
if (
  programClose.includes("Lifecycle State .............. CLOSED") &&
  programClose.includes("2dbc1d9") &&
  programClose.includes("PHASE 3 EXIT REVIEW")
) {
  pass("Architecture 1.0 Program Close recorded");
} else {
  fail("Program Close incomplete");
}

const exitReview = read("develop_notes/KCCC_PHASE_03_EXIT_REVIEW.md");
if (
  exitReview.includes("NOT STARTED") &&
  exitReview.includes("Phase 3 Authorized") &&
  exitReview.includes("Trust") &&
  exitReview.includes("Identity")
) {
  pass("Phase 3 Exit Review present (NOT STARTED)");
} else {
  fail("Phase 3 Exit Review incomplete");
}

const petition = read("src/lib/missions/petition-ballot-operations.ts");
if (
  petition.includes("buildPetitionBallotOperationsHome") &&
  petition.includes("execution truth") &&
  petition.includes("candidateFeed") &&
  petition.includes("countyFeed") &&
  petition.includes("volunteerFeed") &&
  petition.includes("communicationsFeed") &&
  petition.includes("intelligenceFeed")
) {
  pass("2.5 Petition contracts present");
} else {
  fail("2.5 Petition contracts missing");
}

const petitionDoc = read(
  "develop_notes/KCCC_PHASE_02_5_PETITION_BALLOT_OPERATIONS.md",
);
if (petitionDoc.includes("ACCEPTED")) pass("2.5 Petition ACCEPTED recorded");
else fail("2.5 Petition acceptance missing from docs");

const cert = read("develop_notes/KCCC_PHASE_02_CERTIFICATION.md");
if (
  cert.includes("PHASE 2 CERTIFIED") &&
  cert.includes("PRODUCTION READY") &&
  cert.includes("0.8.4-petition") &&
  cert.includes("Do **not** open Phase 2.6")
) {
  pass("Phase 2 certification record present");
} else {
  fail("Phase 2 certification incomplete");
}

const phase3 = read("develop_notes/KCCC_PHASE_03_CHARTER.md");
if (
  phase3.includes("Architecture Review") &&
  phase3.includes("NOT AUTHORIZED") &&
  phase3.includes("Trusted Connected Platform") &&
  phase3.includes("No external integration may become the canonical owner") &&
  phase3.includes("Phase 3A") &&
  phase3.includes("Phase 3B") &&
  phase3.includes("Phase 3C") &&
  phase3.includes("Phase 3D") &&
  phase3.includes("Approve → Execute") &&
  phase3.includes("Integration Trust Model")
) {
  pass("Phase 3 charter (Architecture Review / NOT AUTHORIZED)");
} else {
  fail("Phase 3 charter missing or incomplete");
}

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("CERTIFIED") &&
  charter.includes("coordinate campaign strategy") &&
  charter.includes("ACCEPTED / COMPLETE")
) {
  pass("Phase 2 charter CERTIFIED + doctrine locked");
} else {
  fail("Phase 2 charter incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.candidate_operations_accepted === true &&
  build.debate_media_operations_accepted === true &&
  build.fundraising_operations_accepted === true &&
  build.gotv_operations_accepted === true &&
  build.petition_ballot_operations_accepted === true
) {
  pass("2.1–2.5 ACCEPTED");
} else {
  fail("2.1–2.5 acceptance missing");
}

if (
  build.phase_2_status === "CERTIFIED" &&
  build.phase_2_production_ready === true &&
  build.phase_2_version === "0.8.4-petition"
) {
  pass("Phase 2 CERTIFIED / PRODUCTION READY");
} else {
  fail("Phase 2 certification missing from build_state");
}

if (
  build.architecture_version === "1.0" &&
  build.architecture_lifecycle === "CLOSED" &&
  build.architecture_baseline_released === true &&
  build.architecture_1_0_close_tip === "2dbc1d9" &&
  build.constitutional_layer_sealed === true &&
  build.architecture_immutable_except_rfc === true &&
  build.project_state === "architecture_review" &&
  build.architecture_review_status === "active" &&
  build.implementation_status === "not_authorized" &&
  build.phase_3_implementation_authorized === false &&
  build.phase_3_exit_review_status === "not_started" &&
  build.constitution_canonical === true &&
  build.architecture_freeze_canonical === true &&
  build.governance_state_canonical === true &&
  build.breaking_changes === "rfc_required" &&
  build.versioning_tracks_separated === true &&
  build.application_version === "0.8.4-petition" &&
  build.phase_3_status === "architecture_review" &&
  build.phase_3_implementation_locked === true &&
  build.phase_3_implementation_started === false &&
  build.phase3_external_not_canonical_principle === true &&
  build.candidate_data_ready === false &&
  build.real_candidate_data_enabled === false &&
  build.ai_enabled === false
) {
  pass("Architecture 1.0 PROGRAM CLOSED; Exit Review not started; Phase 3 not authorized");
} else {
  fail("Program close / Exit Review gate incorrect");
}

const constants = read("src/lib/system/constants.ts");
if (
  constants.includes('PHASE_2_STATUS = "CERTIFIED"') &&
  constants.includes("ARCHITECTURE_REVIEW") &&
  constants.includes("PROGRAM_CLOSED") &&
  constants.includes("NOT_AUTHORIZED") &&
  constants.includes("NOT_STARTED") &&
  constants.includes("2dbc1d9") &&
  constants.includes("0.8.4-petition")
) {
  pass("constants reflect program closed / exit review not started");
} else {
  fail("constants missing program closed state");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log(
  "Phase 2 structural validation passed (Architecture 1.0 PROGRAM CLOSED at 2dbc1d9; Phase 3 Exit Review NOT STARTED; implementation NOT AUTHORIZED).",
);
