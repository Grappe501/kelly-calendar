/**
 * CC-11 Calendar Health validator (ADR-099).
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
  "src/lib/calendar/health/bounds.ts",
  "src/lib/calendar/health/doctrine.ts",
  "src/lib/calendar/health/types.ts",
  "src/lib/calendar/health/index.ts",
  "src/server/services/calendar-health-service.ts",
  "src/app/api/calendar/health/route.ts",
  "src/app/api/calendar/health/runs/route.ts",
  "src/app/api/calendar/health/runs/[runId]/route.ts",
  "src/app/api/calendar/health/findings/route.ts",
  "src/app/api/calendar/health/findings/[findingId]/route.ts",
  "src/app/api/calendar/health/alerts/route.ts",
  "src/app/api/calendar/health/alerts/[alertId]/acknowledge/route.ts",
  "src/app/api/calendar/health/alerts/[alertId]/suppress/route.ts",
  "src/app/api/calendar/health/export/route.ts",
  "src/app/api/calendar/health/schedule/route.ts",
  "src/app/api/internal/calendar/health/scheduled/route.ts",
  "src/app/system/calendar/health/page.tsx",
  "src/app/system/calendar/health/runs/page.tsx",
  "src/app/system/calendar/health/runs/[runId]/page.tsx",
  "src/app/system/calendar/health/findings/page.tsx",
  "src/app/system/calendar/health/findings/[findingId]/page.tsx",
  "src/app/system/calendar/health/alerts/page.tsx",
  "src/app/system/calendar/health/schedule/page.tsx",
  "prisma/migrations/20260723100000_cc11_calendar_health/migration.sql",
  "develop_notes/KCCC_CC_11_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_CC_11_CALENDAR_HEALTH_FORENSIC_AUTOMATION.md",
  "develop_notes/KCCC_CC_11_CALENDAR_HEALTH_FORENSIC_AUTOMATION_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_HEALTH_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_HEALTH_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_CALENDAR_HEALTH_SCHEDULER_RUNBOOK.md",
  "develop_notes/KCCC_CC_12_DESIGN_HANDOFF.md",
  "tests/unit/calendar-health/doctrine.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "model CalendarHealthRun",
  "model CalendarHealthFinding",
  "model CalendarHealthAlert",
  "model CalendarHealthCheckpoint",
]) {
  if (schema.includes(model)) pass(model);
  else fail(`schema missing ${model}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:health:validate"]) pass("npm script");
else fail("npm script calendar:health:validate");

const service = fs.readFileSync(
  path.join(root, "src/server/services/calendar-health-service.ts"),
  "utf8",
);

for (const forbidden of [
  "prisma.event.delete",
  "prisma.event.update",
  "prisma.event.create",
  "prisma.campaignMission.delete",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

for (const forbidden of [
  "rotateSubscription",
  "revokeSubscription",
  "rotateFeed",
  "revokeFeed",
  "prisma.calendarSubscriptionFeed.update",
  "prisma.calendarSubscriptionFeed.create",
  "prisma.calendarSubscriptionFeed.delete",
]) {
  if (service.includes(forbidden)) fail(`service contains feed mutate ${forbidden}`);
  else pass(`service free of feed mutate ${forbidden}`);
}

function hasAutomaticallyResolvedWrite(src) {
  const stripped = src
    .replace(/where:\s*\{\s*automaticallyResolved:\s*true\s*\}/g, "where:{}")
    .replace(/`[^`]*automaticallyResolved[^`]*`/g, "``")
    .replace(/"[^"]*automaticallyResolved[^"]*"/g, '""')
    .replace(/'[^']*automaticallyResolved[^']*'/g, "''");
  return /automaticallyResolved\s*:/.test(stripped);
}

if (hasAutomaticallyResolvedWrite(service)) {
  fail("service contains automaticallyResolved writes");
} else {
  pass("service free of automaticallyResolved writes");
}

const constants = fs.readFileSync(path.join(root, "src/lib/system/constants.ts"), "utf8");
const cc11Ok =
  constants.includes('CC_11_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_11_STATUS = "COMPLETE"');
if (cc11Ok) pass("CC_11_STATUS IN_PROGRESS or COMPLETE");
else fail("CC_11_STATUS must be IN_PROGRESS or COMPLETE");

if (
  constants.includes('CC_12_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_12_STATUS = "COMPLETE"') ||
  constants.includes('CC_12_STATUS = "NOT_AUTHORIZED"')
) {
  pass("CC_12 status gated or authorized");
} else {
  fail("CC_12 status missing from constants");
}

if (
  constants.includes("ADR-099") ||
  constants.includes("CC_11_AUTHORIZATION")
) {
  pass("ADR-099 / CC-11 authorization referenced");
} else {
  fail("ADR-099 / CC-11 authorization missing from constants");
}

if (constants.includes('CC_10_STATUS = "COMPLETE"')) pass("CC-10 remains COMPLETE");
else fail("CC-10 must remain COMPLETE");

const publicPaths = fs.readFileSync(
  path.join(root, "src/lib/auth/public-paths.ts"),
  "utf8",
);
if (publicPaths.includes("/api/internal/calendar/health/")) {
  pass("public path for internal health");
} else {
  fail("missing public path /api/internal/calendar/health/");
}

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/calendar-health/doctrine.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-health doctrine tests");
else {
  fail("unit calendar-health doctrine tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

console.log(`\nCC-11 calendar-health validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
