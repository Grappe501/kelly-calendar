import fs from "node:fs";
import path from "node:path";
import { root } from "./lib/db-env.mjs";

const proofs = path.join(root, "develop_notes/database_proofs");
const before = path.join(proofs, "reddirt-structure-before.json");
const after = path.join(proofs, "reddirt-structure-after.json");

let reddirtDiff = "not_compared";
if (fs.existsSync(before) && fs.existsSync(after)) {
  const a = JSON.parse(fs.readFileSync(before, "utf8"));
  const b = JSON.parse(fs.readFileSync(after, "utf8"));
  reddirtDiff =
    a.columnSignature === b.columnSignature && a.tableCount === b.tableCount
      ? 0
      : "CHANGED";
}

const report = {
  generatedAt: new Date().toISOString(),
  schema: "kelly_calendar",
  authenticationComplete: false,
  mutationsAuthorized: false,
  candidateDataReady: false,
  liveCalendarDataEnabled: false,
  reddirtStructureDifference: reddirtDiff,
  note: "Step 5 schema foundation; Step 4 AUTH required before live mutations.",
};

fs.writeFileSync(path.join(proofs, "readiness-latest.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
