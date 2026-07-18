import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mut = fs.readFileSync(
  path.join(root, "src/server/repositories/event-mutation-repository.ts"),
  "utf8",
);
const checks = [
  [mut.includes("expectedVersion"), "expectedVersion checks"],
  [mut.includes("ConflictError"), "409 conflict error"],
  [mut.includes("version: { increment: 1 }") || mut.includes("version: { increment"), "version increment"],
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
