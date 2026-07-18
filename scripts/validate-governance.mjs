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
  "develop_notes/KCCC_STEP_05_5_IMPLEMENTATION_REPORT.md",
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

if (buildState.current_step !== "KCCC-STEP-05.5-OPERATIONAL-INTELLIGENCE") {
  console.error("FAIL: build_state current_step must be Step 5.5");
  failed = true;
} else {
  console.log("PASS: build_state current_step is Step 5.5");
}

if (!["partial", "complete"].includes(buildState.current_step_status)) {
  console.error("FAIL: build_state current_step_status must be partial or complete");
  failed = true;
} else {
  console.log(`PASS: build_state marked ${buildState.current_step_status}`);
}

if (buildState.authentication_complete === true) {
  console.error("FAIL: authentication_complete must remain false until Step 4");
  failed = true;
} else {
  console.log("PASS: authentication_complete remains false");
}

if (buildState.database_mutations_authorized === true) {
  console.error("FAIL: database_mutations_authorized must remain false until Step 4");
  failed = true;
} else {
  console.log("PASS: mutations remain unauthorized");
}

if (buildState.ai_enabled === true || buildState.autonomous_event_changes === true) {
  console.error("FAIL: AI / autonomous changes must remain disabled");
  failed = true;
} else {
  console.log("PASS: AI and autonomous changes disabled");
}

if (failed) process.exit(1);
console.log("Governance validation passed.");
