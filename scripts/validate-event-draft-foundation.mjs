import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = [
  "src/features/event-drafts/draft-types.ts",
  "src/features/event-drafts/draft-schema.ts",
  "src/features/event-drafts/draft-store.ts",
  "src/features/event-drafts/event-presets.ts",
  "src/features/event-drafts/planning-suggestions.ts",
  "src/app/add/quick/page.tsx",
  "src/app/add/full/page.tsx",
  "src/app/api/drafts/events/route.ts",
];

let failed = false;
for (const rel of req) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("FAIL:", rel);
    failed = true;
  } else console.log("PASS:", rel);
}

const ai = fs.readFileSync(
  path.join(root, "src/features/event-drafts/planning-suggestions.ts"),
  "utf8",
);
if (!ai.includes("aiEnabled: false")) {
  console.error("FAIL: AI must remain disabled by default");
  failed = true;
} else console.log("PASS: AI disabled by default");

if (failed) process.exit(1);
console.log("Event draft foundation validation passed.");
