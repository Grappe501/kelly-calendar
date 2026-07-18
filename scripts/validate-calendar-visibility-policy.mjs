import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(repoRoot, "data/calendar_visibility_policy.json");

const VISIBILITY = new Set([
  "FULL",
  "LIMITED",
  "TITLE_LOCATION",
  "BUSY_WITH_CATEGORY",
  "BUSY_ONLY",
  "HIDDEN_FROM_UNAUTHENTICATED",
  "PUBLIC",
]);

const LOCATION = new Set(["EXACT", "VENUE", "CITY", "COUNTY", "REGION", "HIDDEN"]);

let failed = false;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

if (!fs.existsSync(policyPath)) {
  fail("data/calendar_visibility_policy.json missing");
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));

if (policy.version !== "1.0") fail("policy version must be 1.0");
else pass("version 1.0");

if (policy.default_authenticated_campaign_visibility !== "TITLE_LOCATION") {
  fail("default authenticated visibility must be TITLE_LOCATION");
} else pass("default authenticated TITLE_LOCATION");

if (!VISIBILITY.has(policy.default_unauthenticated_visibility)) {
  fail("invalid unauthenticated visibility");
} else pass("unauthenticated visibility");

if (policy.deliver_protected_fields_to_client !== false) {
  fail("protected fields must not be delivered to client");
} else pass("protected fields not delivered");

if (policy.show_calendar_name !== true) fail("show_calendar_name must be true");
else pass("calendar name visible");

if (policy.show_safe_event_title !== true) fail("show_safe_event_title must be true");
else pass("safe title visible");

if (policy.show_general_location_when_available !== true) {
  fail("show_general_location_when_available must be true");
} else pass("general location when available");

if (!LOCATION.has(policy.location_default) || policy.location_default !== "CITY") {
  fail("location_default must be CITY");
} else pass("location default CITY");

if (policy.protected_personal_fallback !== "BUSY_ONLY") {
  fail("protected personal fallback must be BUSY_ONLY");
} else pass("protected personal BUSY_ONLY");

if (policy.occupied_time_always_visible_to_authenticated !== true) {
  fail("occupied time must remain visible");
} else pass("occupied time always visible");

const requiredModules = [
  "src/lib/calendar-security/resolve-event-visibility.ts",
  "src/lib/calendar-security/sanitize-event-for-viewer.ts",
  "src/lib/calendar-security/safe-event-view.ts",
  "src/components/calendar/safe-event-block.tsx",
  "src/app/system/visibility/page.tsx",
  "src/app/api/system/visibility/route.ts",
];

for (const rel of requiredModules) {
  if (!fs.existsSync(path.join(repoRoot, rel))) fail(`missing ${rel}`);
  else pass(rel);
}

if (failed) process.exit(1);
console.log("Calendar visibility policy validation passed.");
