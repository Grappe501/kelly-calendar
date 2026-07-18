import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Compile-free validation: ensure source files exist and registry exports names.
const required = [
  "src/features/operational-intelligence/workflow-definitions/registry.ts",
  "src/features/operational-intelligence/workflow-definitions/definitions.ts",
  "src/features/operational-intelligence/types/workflow-types.ts",
];

let failed = false;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("FAIL: missing", rel);
    failed = true;
  } else console.log("PASS:", rel);
}

const defs = fs.readFileSync(
  path.join(root, "src/features/operational-intelligence/workflow-definitions/definitions.ts"),
  "utf8",
);
for (const name of [
  "County Visit",
  "Festival Appearance",
  "Fundraiser",
  "Candidate Forum",
  "Debate",
  "Press Interview",
  "Social Media Recording",
  "Travel Block",
  "Protected Personal Time",
]) {
  if (!defs.includes(name)) {
    console.error("FAIL: missing workflow name", name);
    failed = true;
  } else console.log("PASS: workflow", name);
}

void pathToFileURL;
if (failed) process.exit(1);
console.log("Workflow definition validation passed.");
