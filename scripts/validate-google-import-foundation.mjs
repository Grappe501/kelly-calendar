import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;
const req = [
  "src/features/calendar-import/source-validation.ts",
  "src/features/calendar-import/parse-ical.ts",
  "src/features/calendar-import/normalize-google-event.ts",
  "src/features/calendar-import/deduplicate-events.ts",
  "src/features/calendar-import/expand-recurrence.ts",
  "src/features/calendar-import/staging-store.ts",
  "src/features/calendar-import/providers/google-public-ical.ts",
  "src/features/calendar-import/providers/google-calendar-api.ts",
  "src/app/import/google-calendar/page.tsx",
  "src/app/api/import/google-calendar/validate-source/route.ts",
  "src/app/api/import/google-calendar/preview/route.ts",
  "src/app/api/import/google-calendar/stage/route.ts",
  "data/ingest_staging/.gitignore",
];

for (const rel of req) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("FAIL:", rel);
    failed = true;
  } else console.log("PASS:", rel);
}

const limits = fs.readFileSync(
  path.join(root, "src/features/calendar-import/import-limits.ts"),
  "utf8",
);
if (!limits.includes("2025-11-01")) {
  console.error("FAIL: historical floor missing");
  failed = true;
} else console.log("PASS: historical floor 2025-11-01");

if (failed) process.exit(1);
console.log("Google import foundation validation passed.");
