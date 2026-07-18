import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "data/netlify_target.json");

if (!fs.existsSync(targetPath)) {
  console.error("FAIL: missing data/netlify_target.json");
  process.exit(1);
}

const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));
console.log("PASS: netlify_target.json present");
console.log(`repository: ${target.repository}`);
console.log(`productionBranch: ${target.productionBranch}`);
console.log(`buildCommand: ${target.buildCommand}`);
console.log(`nodeVersion: ${target.nodeVersion}`);

let blocked = false;
for (const key of ["siteName", "siteId", "productionUrl"]) {
  if (!target[key]) {
    console.error(`BLOCKED: ${key} not verified`);
    blocked = true;
  } else {
    console.log(`PASS: ${key} recorded`);
  }
}

if (target.status !== "verified") {
  console.error(`BLOCKED: netlify target status=${target.status}`);
  blocked = true;
}

if (blocked) {
  console.error("BLOCKED — CANONICAL NETLIFY SITE NOT VERIFIED");
  process.exit(1);
}
console.log("PASS: Netlify target verified");
