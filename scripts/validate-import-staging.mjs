import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, "data/ingest_staging");
const gi = fs.readFileSync(path.join(staging, ".gitignore"), "utf8");

if (!gi.includes("*")) {
  console.error("FAIL: staging gitignore must ignore contents");
  process.exit(1);
}
console.log("PASS: staging gitignore present");

const rootGi = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
if (!rootGi.includes("ingest_staging")) {
  console.error("FAIL: root gitignore must cover ingest_staging");
  process.exit(1);
}
console.log("PASS: root gitignore covers staging");
console.log("Import staging validation passed.");
