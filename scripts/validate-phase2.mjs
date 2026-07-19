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
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const constitution = read("develop_notes/KCCC_CONSTITUTION_v1.0.md");
if (
  constitution.includes("Architecture Version:** 1.0") &&
  constitution.includes("No duplicate ownership") &&
  constitution.includes("No AI writes to canonical state") &&
  constitution.includes("LEVEL A") &&
  constitution.includes("LEVEL E") &&
  constitution.includes("Approve → Execute")
) {
  pass("Constitution v1.0 present with prohibitions + certification levels");
} else {
  fail("Constitution v1.0 incomplete");
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
  phase3.includes("implementation LOCKED") &&
  phase3.includes("Trusted Connected Platform") &&
  phase3.includes("No external integration may become the canonical owner") &&
  phase3.includes("Phase 3A") &&
  phase3.includes("Phase 3B") &&
  phase3.includes("Phase 3C") &&
  phase3.includes("Phase 3D") &&
  phase3.includes("Approve → Execute") &&
  phase3.includes("Integration Trust Model")
) {
  pass("Phase 3 Trusted Connected Platform charter (Architecture Review / locked)");
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
  build.architecture_status === "frozen_through_phase_2" &&
  build.project_state === "architecture_review" &&
  build.implementation_status === "locked" &&
  build.phase_3_status === "architecture_review" &&
  build.phase_3_implementation_locked === true &&
  build.phase_3_implementation_started === false &&
  build.phase3_external_not_canonical_principle === true &&
  build.candidate_data_ready === false &&
  build.real_candidate_data_enabled === false &&
  build.ai_enabled === false
) {
  pass("Architecture 1.0 frozen; Architecture Review; implementation locked");
} else {
  fail("Architecture freeze / Phase 3 review gate incorrect");
}

const constants = read("src/lib/system/constants.ts");
if (
  constants.includes('PHASE_2_STATUS = "CERTIFIED"') &&
  constants.includes("ARCHITECTURE_REVIEW") &&
  constants.includes("FROZEN_THROUGH_PHASE_2") &&
  constants.includes("Trusted Connected Platform")
) {
  pass("constants reflect Architecture Review / freeze");
} else {
  fail("constants missing Architecture Review / freeze");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log(
  "Phase 2 structural validation passed (Architecture 1.0 FROZEN; Phase 3 Architecture Review; implementation LOCKED).",
);
