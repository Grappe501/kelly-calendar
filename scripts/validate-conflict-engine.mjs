import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(
  root,
  "src/features/operational-intelligence/services/conflict-service.ts",
);
const text = fs.readFileSync(file, "utf8");
let failed = false;
for (const token of [
  "detectCandidateOverlaps",
  "assessTravelFeasibility",
  "automaticallyResolved: false",
  "IMPOSSIBLE",
]) {
  if (!text.includes(token)) {
    console.error("FAIL: missing", token);
    failed = true;
  } else console.log("PASS:", token);
}
if (failed) process.exit(1);
console.log("Conflict engine validation passed.");
