import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/load-env-files.mjs";

const required = [
  "data/build_state.json",
  "data/step_registry.json",
  "data/architecture_decisions.json",
  "data/risk_register.json",
  "data/acceptance_gates.json",
  "docs/MASTER_PRODUCT_CONSTITUTION.md",
  "docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md",
  "develop_notes/KCCC_NEW_THREAD_HANDOFF.md",
  "develop_notes/KCCC_STEP_05_6_IMPLEMENTATION_REPORT.md",
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

const expectedStep = "KCCC-STEP-05.6-AUTHENTICATED-OPERATIONS-UNLOCK";
if (buildState.current_step !== expectedStep) {
  console.error(`FAIL: build_state current_step must be ${expectedStep}`);
  failed = true;
} else {
  console.log("PASS: build_state current_step is Step 5.6");
}

if (buildState.current_step_status !== "complete") {
  console.error("FAIL: build_state current_step_status must be complete for Step 5.6");
  failed = true;
} else {
  console.log("PASS: build_state marked complete");
}

if (buildState.authentication_complete !== true) {
  console.error("FAIL: authentication_complete must be true after Step 4");
  failed = true;
} else {
  console.log("PASS: authentication_complete is true");
}

if (buildState.database_mutations_authorized !== true) {
  console.error("FAIL: database_mutations_authorized must be true after Step 5.6 unlock");
  failed = true;
} else {
  console.log("PASS: database_mutations_authorized is true");
}

if (buildState.candidate_data_ready === true || buildState.real_candidate_data_enabled === true) {
  console.error("FAIL: candidate data must remain disabled");
  failed = true;
} else {
  console.log("PASS: candidate data remains disabled");
}

if (buildState.next_step !== "KCCC-STEP-06-MOBILE-COMMAND-SHELL") {
  console.error("FAIL: next_step must be KCCC-STEP-06-MOBILE-COMMAND-SHELL");
  failed = true;
} else {
  console.log("PASS: next_step is Step 6");
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
