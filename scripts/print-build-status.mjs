import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./lib/load-env-files.mjs";

const buildState = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "data/build_state.json"), "utf8"),
);

console.log("Kelly Campaign Command Calendar — Build Status");
console.log(`Current step: ${buildState.current_step}`);
console.log(`Status: ${buildState.current_step_status}`);
console.log(`Completed: ${(buildState.completed_steps ?? []).join(", ")}`);
console.log(`Next: ${buildState.next_step}`);
console.log(`Overall: ${buildState.overall_completion_percent ?? 0}%`);
console.log(`Updated: ${buildState.updated_at ?? "n/a"}`);
