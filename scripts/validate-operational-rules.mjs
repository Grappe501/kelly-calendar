import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(
  root,
  "src/features/operational-intelligence/rules/rule-registry.ts",
);
const text = fs.readFileSync(file, "utf8");
let failed = false;
for (const id of [
  "rule_festival_pack_and_staff",
  "rule_fundraiser_compliance",
  "rule_debate_prep",
  "rule_travel_buffer",
  "rule_protected_suppress_public",
]) {
  if (!text.includes(id)) {
    console.error("FAIL: missing rule", id);
    failed = true;
  } else console.log("PASS:", id);
}
if (!text.includes("precedenceRank")) {
  console.error("FAIL: precedence missing");
  failed = true;
}
if (failed) process.exit(1);
console.log("Operational rules validation passed.");
