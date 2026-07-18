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
  "develop_notes/KCCC_STEP_03_IMPLEMENTATION_REPORT.md",
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

if (buildState.current_step !== "KCCC-STEP-03-ENV-SECURITY") {
  console.error("FAIL: build_state current_step must be KCCC-STEP-03-ENV-SECURITY");
  failed = true;
} else {
  console.log("PASS: build_state current_step is Step 3");
}

if (buildState.current_step_status !== "complete") {
  console.error("FAIL: build_state current_step_status must be complete");
  failed = true;
} else {
  console.log("PASS: build_state marked complete");
}

if (!Array.isArray(buildState.completed_steps) || buildState.completed_steps.length < 3) {
  console.error("FAIL: completed_steps must include Steps 1–3");
  failed = true;
} else {
  console.log("PASS: completed_steps present");
}

if (failed) process.exit(1);
console.log("Governance validation passed.");
