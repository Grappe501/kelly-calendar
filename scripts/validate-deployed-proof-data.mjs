import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = JSON.parse(
  fs.readFileSync(path.join(root, "data/build_state.json"), "utf8"),
);

if (build.candidate_data_ready === true || build.real_candidate_data_enabled === true) {
  console.error("FAIL: candidate data enabled during Step 5.7");
  process.exit(1);
}
console.log("PASS: candidate_data_ready false");

if (!process.env.KCCC_DEPLOY_URL?.trim()) {
  console.error("BLOCKED — OPERATOR ACTION REQUIRED");
  console.error("Deployed synthetic proof fixtures not yet verified (no KCCC_DEPLOY_URL).");
  process.exit(1);
}

console.error("BLOCKED — OPERATOR ACTION REQUIRED");
console.error("Confirm synthetic-only proof calendar/event after live mutations.");
process.exit(1);
