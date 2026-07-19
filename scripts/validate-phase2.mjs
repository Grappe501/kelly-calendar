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
  ["reg", "develop_notes/KCCC_ARCHITECTURE_REGISTER_v1.0.md"],
  ["final", "develop_notes/KCCC_ARCHITECTURE_1.0_FINAL_ARCHIVAL_STATE.md"],
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
  governance.includes("HISTORICAL BASELINE") &&
  governance.includes("PERMANENTLY CLOSED") &&
  governance.includes("NOT AUTHORIZED") &&
  governance.includes("NOT STARTED") &&
  governance.includes("Proposal Required") &&
  governance.includes("RFC Required") &&
  governance.includes("0.8.4-petition") &&
  governance.includes("6690ce2") &&
  governance.includes("KCCC_PHASE_03_EXIT_REVIEW")
) {
  pass("Governance State v1.0 present (permanently closed)");
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
  exitReview.includes("KCCC_PHASE_03_BUILD_DESIGN") &&
  exitReview.includes("AUTHORIZED") &&
  exitReview.includes("Implementation Authorization") &&
  exitReview.includes("Trust Model") &&
  exitReview.includes("3.9 Authorization Decision") &&
  exitReview.includes("No implementation")
) {
  pass("Phase 3 Exit Review umbrella present (governance program)");
} else {
  fail("Phase 3 Exit Review incomplete");
}

const buildDesign = "develop_notes/KCCC_PHASE_03_BUILD_DESIGN.md";
const phase3Gates = [
  "develop_notes/KCCC_PHASE3_TRUST_MODEL.md",
  "develop_notes/KCCC_PHASE3_IDENTITY_MODEL.md",
  "develop_notes/KCCC_PHASE3_AUTOMATION_GOVERNANCE.md",
  "develop_notes/KCCC_PHASE3_CAMPAIGN_BOUNDARY.md",
  "develop_notes/KCCC_PHASE3_AUDIT_AND_RECOVERY.md",
  "develop_notes/KCCC_PHASE3_RISK_ASSESSMENT.md",
  "develop_notes/KCCC_PHASE3_READINESS.md",
  "develop_notes/KCCC_PHASE3_EXECUTIVE_RECOMMENDATION.md",
  "develop_notes/KCCC_PHASE3_AUTHORIZATION_DECISION.md",
  "develop_notes/KCCC_PHASE3_TRANSITION_PLAN.md",
];
if (exists(buildDesign) && read(buildDesign).includes("No implementation permitted")) {
  pass("Phase 3 Build Design present (governance only)");
} else {
  fail("Phase 3 Build Design missing");
}
for (const rel of phase3Gates) {
  if (exists(rel)) pass(`gate ${rel}`);
  else fail(`missing ${rel}`);
}

const register = read("develop_notes/KCCC_ARCHITECTURE_REGISTER_v1.0.md");
if (
  register.includes("HISTORICAL BASELINE") &&
  register.includes("PERMANENTLY CLOSED") &&
  register.includes("6690ce2") &&
  register.includes("KCCC_PHASE_03_EXIT_REVIEW") &&
  register.includes("NOT AUTHORIZED")
) {
  pass("Architecture Register v1.0 permanently closed");
} else {
  fail("Architecture Register incomplete");
}

const finalArchival = read(
  "develop_notes/KCCC_ARCHITECTURE_1.0_FINAL_ARCHIVAL_STATE.md",
);
if (
  finalArchival.includes("HISTORICAL BASELINE") &&
  finalArchival.includes("PERMANENTLY CLOSED") &&
  finalArchival.includes("6690ce2") &&
  finalArchival.includes("cdb5a5f") &&
  finalArchival.includes("KCCC_PHASE_03_EXIT_REVIEW") &&
  finalArchival.includes("No additional architectural statements")
) {
  pass("Architecture 1.0 permanently closed archival state recorded");
} else {
  fail("Permanently closed archival state incomplete");
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
  build.architecture_status === "historical_baseline_permanently_closed" &&
  build.architecture_lifecycle === "COMPLETE" &&
  build.architecture_program_state === "PERMANENTLY_CLOSED" &&
  build.architecture_historical_baseline === true &&
  build.architecture_active_design_program === false &&
  build.architecture_1_0_further_statements_forbidden === true &&
  build.architecture_permanently_closed === true &&
  build.architecture_baseline_released === true &&
  build.architecture_register_commit === "6690ce2" &&
  build.architecture_baseline_immutable_at === "6690ce2" &&
  build.architecture_archive_seal_commit === "4252827" &&
  build.architecture_terminal_record_tip === "a64eef3" &&
  build.architecture_engineering_line_at_close === "cdb5a5f" &&
  build.architecture_archive_complete === true &&
  build.repository_tip_advances_independently === true &&
  build.architecture_register === "KCCC_ARCHITECTURE_REGISTER_v1.0" &&
  build.architecture_register_canonical === true &&
  Array.isArray(build.canonical_governance_set) &&
  build.canonical_governance_set.length === 5 &&
  build.constitutional_layer_sealed === true &&
  build.architecture_immutable_except_rfc === true &&
  build.project_state === "architecture_review" &&
  build.architecture_review_status === "active" &&
  build.implementation_status === "not_authorized" &&
  build.phase_3_implementation_authorized === false &&
  build.phase_3_planning_authorized === false &&
  build.phase_3_exit_review_status === "program_structure_open_gates_not_started" &&
  build.phase_3_build_design === "KCCC_PHASE_03_BUILD_DESIGN" &&
  build.next_architectural_deliverable === "KCCC_PHASE3_TRUST_MODEL" &&
  Array.isArray(build.phase_3_governance_program) &&
  build.phase_3_governance_program.length === 10 &&
  build.constitution_canonical === true &&
  build.architecture_freeze_canonical === true &&
  build.governance_state_canonical === true &&
  build.breaking_changes === "rfc_required" &&
  build.versioning_tracks_separated === true &&
  build.application_version === "0.8.4-petition" &&
  build.phase_3_status === "architecture_review" &&
  build.phase_3_implementation_locked === true &&
  build.phase_3_implementation_started === false &&
  build.phase_3_implementation_authorized === false &&
  build.phase_3_planning_authorized === false &&
  build.phase3_external_not_canonical_principle === true &&
  build.candidate_data_ready === false &&
  build.real_candidate_data_enabled === false &&
  build.ai_enabled === false
) {
  pass("Architecture 1.0 closed; Phase 3 governance program open (no impl)");
} else {
  fail("Architecture permanently-closed / Phase 3 program gate incorrect");
}

const constants = read("src/lib/system/constants.ts");
if (
  constants.includes('PHASE_2_STATUS = "CERTIFIED"') &&
  constants.includes("ARCHITECTURE_REVIEW") &&
  constants.includes("PERMANENTLY_CLOSED") &&
  constants.includes("NOT_AUTHORIZED") &&
  constants.includes("KCCC_PHASE_03_BUILD_DESIGN") &&
  constants.includes("KCCC_PHASE3_TRUST_MODEL") &&
  constants.includes("6690ce2") &&
  constants.includes("0.8.4-petition")
) {
  pass("constants reflect Phase 3 Build Design / Trust Model next");
} else {
  fail("constants missing Phase 3 Build Design state");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log(
  "Phase 2 structural validation passed (Architecture 1.0 CLOSED; Phase 3 Build Design OPEN; gates NOT STARTED; no implementation).",
);
