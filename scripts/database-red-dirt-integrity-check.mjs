import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proofs = path.join(root, "develop_notes/database_proofs");
const beforePath = path.join(proofs, "reddirt-structure-before.json");
const afterPath = path.join(proofs, "reddirt-structure-after.json");

if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
  console.error("FAIL: missing before/after RedDirt structural snapshots");
  console.error("Run: npm run db:snapshot before && …migrate… && npm run db:snapshot after");
  process.exit(1);
}

const before = JSON.parse(fs.readFileSync(beforePath, "utf8"));
const after = JSON.parse(fs.readFileSync(afterPath, "utf8"));

const report = {
  generatedAt: new Date().toISOString(),
  beforeSignature: before.columnSignature,
  afterSignature: after.columnSignature,
  beforeTableCount: before.tableCount,
  afterTableCount: after.tableCount,
  structuralDifference: before.columnSignature === after.columnSignature ? 0 : 1,
  note: "Compares non-kelly_calendar schemas only.",
};

fs.writeFileSync(
  path.join(proofs, "reddirt-integrity-latest.json"),
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));

if (report.structuralDifference !== 0) {
  console.error("FAIL: RedDirt-owned structural signature changed");
  process.exit(1);
}
console.log("PASS: RedDirt structural difference = 0");
