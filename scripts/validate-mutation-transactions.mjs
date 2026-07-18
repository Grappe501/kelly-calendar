import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/server/repositories/event-mutation-repository.ts",
  "src/server/services/event-plan-service.ts",
  "src/server/services/authenticated-ops-service.ts",
  "src/server/db/transaction.ts",
];
let failed = 0;
for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes("withTransaction") || text.includes("$transaction")) {
    console.log("PASS: transactional path in", rel);
  } else {
    console.error("FAIL: no transaction helper in", rel);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
