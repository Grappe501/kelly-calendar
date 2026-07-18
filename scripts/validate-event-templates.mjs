import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const rel of [
  "data/event_templates.json",
  "data/packing_templates.json",
  "data/program_flow_templates.json",
]) {
  const data = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  if (!data.version) {
    console.error("FAIL:", rel);
    process.exit(1);
  }
  console.log("PASS:", rel);
}
console.log("Event templates validation passed.");
