import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defs = fs.readFileSync(
  path.join(root, "src/features/operational-intelligence/workflow-definitions/definitions.ts"),
  "utf8",
);
const fromQuoted = [...defs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const fromIds = [...defs.matchAll(/id:\s*"wf_([^"]+)"/g)].map((m) => m[1]);
const fromArrayTuples = [...defs.matchAll(/\["([a-z0-9-]+)",\s*"/g)].map((m) => m[1]);
const unique = [...new Set([...fromQuoted, ...fromIds, ...fromArrayTuples])];
const report = {
  generatedAt: new Date().toISOString(),
  workflowCount: unique.length,
  slugs: unique.sort(),
};
const out = path.join(root, "develop_notes/database_proofs/workflow-coverage-latest.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (unique.length < 20) {
  console.error("FAIL: expected at least 20 workflows");
  process.exit(1);
}
console.log("Workflow coverage report written.");
