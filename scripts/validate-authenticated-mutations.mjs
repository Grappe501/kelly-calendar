import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/server/repositories/event-mutation-repository.ts",
  "src/server/services/event-service.ts",
  "src/server/services/event-plan-service.ts",
  "src/server/services/authenticated-ops-service.ts",
];

let failed = 0;
for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes("withTransaction") || text.includes("prisma.event.create") || text.includes("createCanonicalEvent") || text.includes("replaceSection") || text.includes("applyWorkflowToEvent")) {
    console.log("PASS: live mutation implementation present in", rel);
  } else {
    console.error("FAIL: expected live mutation logic in", rel);
    failed += 1;
  }
  if (/actorUserId\s*=\s*body/.test(text) || /body\.userId/.test(text)) {
    console.error("FAIL: client actor identity in", rel);
    failed += 1;
  }
}
process.exit(failed ? 1 : 0);
