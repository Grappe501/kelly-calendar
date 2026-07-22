/**
 * CC-07 Unified Search / Filters / Saved Views validator (ADR-095).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let failed = 0;
let passed = 0;

function pass(msg) {
  console.log("PASS:", msg);
  passed += 1;
}
function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}

const required = [
  "src/lib/calendar/search/types.ts",
  "src/lib/calendar/search/normalize.ts",
  "src/lib/calendar/search/query-contract.ts",
  "src/lib/calendar/search/match.ts",
  "src/lib/calendar/search/index.ts",
  "src/server/services/calendar-search-service.ts",
  "src/server/services/calendar-saved-view-service.ts",
  "src/app/api/calendar/search/route.ts",
  "src/app/api/calendar/search/normalize/route.ts",
  "src/app/api/calendar/search/facets/route.ts",
  "src/app/api/calendar/saved-views/route.ts",
  "src/app/api/calendar/saved-views/[viewId]/route.ts",
  "src/app/api/calendar/saved-views/[viewId]/duplicate/route.ts",
  "src/app/api/calendar/saved-views/[viewId]/pin/route.ts",
  "src/app/api/calendar/saved-views/[viewId]/archive/route.ts",
  "src/app/api/calendar/saved-views/[viewId]/restore/route.ts",
  "src/components/calendar/search/CalendarSearchChrome.tsx",
  "src/app/system/calendar/saved-views/page.tsx",
  "src/app/system/calendar/saved-views/[viewId]/page.tsx",
  "prisma/migrations/20260722140000_cc07_saved_views_query_contract/migration.sql",
  "develop_notes/KCCC_CC_07_AUTHORIZATION_KELLY_2026-07-22.md",
  "develop_notes/KCCC_STANDING_KELLY_EXECUTION_AUTHORIZATION_2026-07-22.md",
  "develop_notes/KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS.md",
  "develop_notes/KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_SEARCH_FILTER_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_SAVED_VIEWS_OPERATOR_GUIDE.md",
  "tests/unit/calendar-search/query-contract.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const savedBlock = schema.slice(
  schema.indexOf("model CalendarSavedView"),
  schema.indexOf("model CalendarViewLayer"),
);
for (const field of [
  "queryJson",
  "querySchemaVersion",
  "visibility",
  "roleScope",
  "isPinned",
  "staleState",
  "campaignKey",
]) {
  if (new RegExp(`\\b${field}\\b`).test(savedBlock)) pass(`CalendarSavedView.${field}`);
  else fail(`CalendarSavedView missing ${field}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:search:validate"]) pass("npm script calendar:search:validate");
else fail("npm script calendar:search:validate");

const FORBIDDEN = [
  "prisma.event.update",
  "prisma.event.delete",
  "prisma.event.create",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
  "recomputeConflictsForRange",
  "recomputeConflictsForEvent",
];
function codeOnly(src) {
  return src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");
}
for (const rel of [
  "src/server/services/calendar-search-service.ts",
  "src/lib/calendar/search/query-contract.ts",
  "src/lib/calendar/search/match.ts",
]) {
  const src = codeOnly(fs.readFileSync(path.join(root, rel), "utf8"));
  for (const token of FORBIDDEN) {
    if (src.includes(token)) fail(`${rel} must not contain ${token}`);
    else pass(`${rel} free of ${token}`);
  }
}

// Pure contract behavior via vitest unit file
const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/calendar-search/query-contract.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-search tests");
else {
  fail("unit calendar-search tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

// Constants posture
const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('CC_07_STATUS = "COMPLETE"') || constants.includes('CC_07_STATUS = "IN_PROGRESS"')) {
  pass("CC_07_STATUS set");
} else fail("CC_07_STATUS not authorized/in progress/complete");
if (constants.includes("ADR-094") || constants.includes("STANDING_KELLY_EXECUTION_ADR")) {
  pass("standing execution ADR referenced");
} else fail("standing execution ADR missing from constants");
// After CC-08/CC-09 ships, the next locked build remains gated.
if (
  constants.includes('CC_10_STATUS = "NOT_AUTHORIZED"') ||
  constants.includes('CC_09_STATUS = "NOT_AUTHORIZED"') ||
  constants.includes('CC_08_STATUS = "NOT_AUTHORIZED"')
) {
  pass("next Calendar Completion build remains gated");
} else {
  fail("CC-10 (or prior lock) must remain not authorized");
}

console.log(`\nCC-07 search validator: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
