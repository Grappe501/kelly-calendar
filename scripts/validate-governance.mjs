import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/load-env-files.mjs";

const required = [
  "data/build_state.json",
  "data/step_registry.json",
  "data/architecture_decisions.json",
  "data/risk_register.json",
  "data/acceptance_gates.json",
  "data/netlify_target.json",
  "docs/MASTER_PRODUCT_CONSTITUTION.md",
  "docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md",
  "develop_notes/KCCC_NEW_THREAD_HANDOFF.md",
  "develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md",
  "develop_notes/KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md",
  "develop_notes/KCCC_EA_8_SECURITY_CLOSEOUT_PLAN.md",
  "develop_notes/KCCC_EA_8_SECURITY_CLOSEOUT_EVIDENCE.md",
  "develop_notes/KCCC_STEP_05_6_IMPLEMENTATION_REPORT.md",
  "develop_notes/KCCC_STEP_05_7_NETLIFY_AUTH_AND_LIVE_MUTATION_PROOF.md",
  "develop_notes/KCCC_STEP_05_7_IMPLEMENTATION_REPORT.md",
  "develop_notes/KCCC_STEP_05_7_OPERATOR_ACCEPTANCE.md",
];

let failed = false;

for (const rel of required) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) {
    console.error(`FAIL: missing ${rel}`);
    failed = true;
  } else {
    console.log(`PASS: found ${rel}`);
  }
}

const buildState = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/build_state.json"), "utf8"),
);

const step57 = "KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF";
const step06 = "KCCC-STEP-06-MOBILE-COMMAND-SHELL";
const ea8 = "KCCC-EA-8-SECURITY";
const ea9 = "KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL";
const allowedCurrent = new Set([step57, step06, ea8, ea9]);
if (!allowedCurrent.has(buildState.current_step)) {
  console.error(
    `FAIL: build_state current_step must be one of ${[...allowedCurrent].join(", ")}`,
  );
  failed = true;
} else {
  console.log(`PASS: build_state current_step is ${buildState.current_step}`);
}

const allowedStatuses = new Set([
  "blocked",
  "partial",
  "complete",
  "ready",
  "in_progress",
  "closeout_in_progress",
]);
if (!allowedStatuses.has(buildState.current_step_status)) {
  console.error(
    "FAIL: current_step_status must be blocked|partial|complete|ready|in_progress|closeout_in_progress",
  );
  failed = true;
} else {
  console.log(`PASS: build_state marked ${buildState.current_step_status}`);
}

if (buildState.authentication_complete !== true) {
  console.error("FAIL: authentication_complete must be true");
  failed = true;
} else {
  console.log("PASS: authentication_complete is true");
}

if (buildState.database_mutations_authorized !== true) {
  console.error("FAIL: database_mutations_authorized must be true");
  failed = true;
} else {
  console.log("PASS: database_mutations_authorized is true");
}

if (
  buildState.candidate_data_ready !== true ||
  buildState.real_candidate_data_enabled !== true
) {
  console.error("FAIL: candidate data must be certified true after EA-8 closeout");
  failed = true;
} else {
  console.log("PASS: candidate data certified");
}

if (buildState.current_step === ea9 || buildState.current_step === ea8) {
  if (
    buildState.calendar_recovery_build_id !==
    "KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0"
  ) {
    console.error("FAIL: calendar recovery build id missing or wrong");
    failed = true;
  } else {
    console.log("PASS: calendar recovery build id present");
  }
  if (buildState.communications_os_track_status !== "frozen") {
    console.error("FAIL: communications OS must be frozen during recovery");
    failed = true;
  } else {
    console.log("PASS: communications OS frozen");
  }
  if (buildState.step_8_closeout_status !== "complete") {
    console.error("FAIL: step_8_closeout_status must be complete");
    failed = true;
  } else {
    console.log("PASS: Step 8 closeout complete");
  }
  if (
    buildState.next_engineering_deliverable !==
    "KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL-1.0"
  ) {
    console.error("FAIL: next engineering deliverable must be EA-9 model build");
    failed = true;
  } else {
    console.log("PASS: next engineering deliverable is EA-9");
  }
} else if (
  buildState.operator_acceptance_recorded === true &&
  buildState.current_step === step57 &&
  buildState.current_step_status !== "complete"
) {
  console.error("FAIL: Step 5.7 acceptance recorded but step not complete");
  failed = true;
} else if (
  buildState.operator_acceptance_recorded === true &&
  buildState.completed_steps?.includes(step57)
) {
  console.log("PASS: Step 5.7 operator acceptance retained after promotion");
}

if (
  buildState.ai_enabled === true ||
  buildState.autonomous_event_changes === true ||
  buildState.autonomous_ai_enabled === true ||
  buildState.autonomous_scheduling_enabled === true
) {
  console.error("FAIL: AI / autonomous changes must remain disabled");
  failed = true;
} else {
  console.log("PASS: AI and autonomous changes disabled");
}

if (failed) process.exit(1);
console.log("Governance validation passed.");
