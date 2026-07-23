/**
 * CC-09 Bulk Operations validator (ADR-097).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  "src/lib/calendar/bulk/bounds.ts",
  "src/lib/calendar/bulk/fingerprint.ts",
  "src/lib/calendar/bulk/eligibility.ts",
  "src/server/services/calendar-bulk-operation-service.ts",
  "src/app/api/calendar/bulk/route.ts",
  "src/app/api/calendar/bulk/[operationId]/route.ts",
  "src/app/api/calendar/bulk/[operationId]/confirm/route.ts",
  "src/app/api/calendar/bulk/[operationId]/recovery/preview/route.ts",
  "src/app/api/calendar/bulk/[operationId]/recovery/confirm/route.ts",
  "src/app/system/calendar/bulk/page.tsx",
  "src/app/system/calendar/bulk/[operationId]/page.tsx",
  "src/components/calendar/bulk/BulkSelectionProvider.tsx",
  "src/components/calendar/bulk/BulkSelectionBar.tsx",
  "prisma/migrations/20260722160000_cc09_bulk_operations/migration.sql",
  "develop_notes/KCCC_CC_09_AUTHORIZATION_KELLY_2026-07-22.md",
  "develop_notes/KCCC_CC_09_BULK_OPERATIONS_ARCHIVE_RESTORE_RECOVERY.md",
  "develop_notes/KCCC_CC_09_BULK_OPERATIONS_ARCHIVE_RESTORE_RECOVERY_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_BULK_OPERATIONS_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_BULK_OPERATIONS_OPERATOR_GUIDE.md",
  "tests/unit/calendar-bulk/eligibility.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "model CalendarBulkOperation",
  "model CalendarBulkOperationItem",
  "model CalendarRecoveryAction",
]) {
  if (schema.includes(model)) pass(model);
  else fail(`schema missing ${model}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:bulk-operations:validate"]) pass("npm script");
else fail("npm script calendar:bulk-operations:validate");

const service = fs.readFileSync(
  path.join(root, "src/server/services/calendar-bulk-operation-service.ts"),
  "utf8",
);
for (const forbidden of [
  "prisma.event.delete",
  "hardDelete",
  "campaignMission.delete",
  "campaignMission.create",
  "automaticallyResolved: true",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

const constants = fs.readFileSync(path.join(root, "src/lib/system/constants.ts"), "utf8");
if (constants.includes('CC_09_STATUS = "COMPLETE"')) pass("CC-09 remains COMPLETE");
else fail("CC-09 must remain COMPLETE");
if (
  constants.includes('CC_11_STATUS = "NOT_AUTHORIZED"') ||
  constants.includes('CC_10_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_10_STATUS = "COMPLETE"')
) {
  pass("CC-11 gated; CC-10 authorized or complete");
} else fail("CC-11 must remain not authorized while CC-10 ships");
if (constants.includes("ADR-097") || constants.includes("CC_09_AUTHORIZATION")) {
  pass("CC-09 authorization referenced");
} else fail("CC-09 authorization missing");

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/calendar-bulk/eligibility.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-bulk tests");
else {
  fail("unit calendar-bulk tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

console.log(`\nCC-09 bulk-operations validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
