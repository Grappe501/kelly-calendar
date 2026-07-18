import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const authz = fs.readFileSync(path.join(root, "src/server/auth/authorization.ts"), "utf8");
const roles = fs.readFileSync(path.join(root, "src/lib/auth/system-roles.ts"), "utf8");

const checks = [
  [roles.includes("roleHasFullCalendarAccess"), "leadership administer helper"],
  [roles.includes("roleMayMutate"), "mutator role helper"],
  [authz.includes("Default deny") || authz.includes("default deny") || authz.includes("Default deny"), "default deny path"],
  [authz.includes("CONFLICT_OVERRIDE"), "override restricted"],
  [authz.includes("minRankForAction"), "action rank matrix"],
];

let failed = 0;
for (const [ok, name] of checks) {
  if (ok) console.log("PASS:", name);
  else {
    console.error("FAIL:", name);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
