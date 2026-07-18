import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actor = fs.readFileSync(path.join(root, "src/server/auth/actor.ts"), "utf8");
const session = fs.readFileSync(path.join(root, "src/server/auth/session.ts"), "utf8");

const checks = [
  [actor.includes("requireAuthenticatedActor"), "requireAuthenticatedActor"],
  [actor.includes("getOptionalAuthenticatedActor"), "getOptionalAuthenticatedActor"],
  [actor.includes("teamMemberships"), "team memberships on actor"],
  [session.includes("revokedAt"), "revoked session check"],
  [session.includes("expiresAt"), "expiry check"],
  [!actor.includes("body.userId"), "no body.userId actor"],
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
