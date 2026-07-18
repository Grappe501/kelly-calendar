import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(
  root,
  "src/features/operational-intelligence/services/operational-summary-service.ts",
);
if (!fs.existsSync(file)) {
  console.error("FAIL: missing operational summary service");
  process.exit(1);
}
const text = fs.readFileSync(file, "utf8");
if (!text.includes("buildTodayCommandSummary")) {
  console.error("FAIL: missing buildTodayCommandSummary");
  process.exit(1);
}
console.log("PASS: operational summary service");
console.log("Operational summary validation passed.");
