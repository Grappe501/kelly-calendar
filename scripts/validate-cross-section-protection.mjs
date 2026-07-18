import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projection = fs.readFileSync(
  path.join(root, "src/server/services/event-visibility-service.ts"),
  "utf8",
);
const authz = fs.readFileSync(path.join(root, "src/server/auth/authorization.ts"), "utf8");

const checks = [
  [projection.includes("protectedSectionsOmitted"), "projection omits protected sections"],
  [projection.includes("canViewFundraising") || projection.includes("canViewNotes"), "capability flags"],
  [authz.includes("EVENT_COMMUNICATIONS_EDIT"), "section action exists"],
  [authz.includes("EVENT_TRAVEL_EDIT"), "travel section action exists"],
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
