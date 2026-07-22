/**
 * CC-05 Standing Availability Inputs validator (pure + structural).
 * Mirrors scripts/validate-calendar-recurrence.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
  "src/lib/calendar/availability/types.ts",
  "src/lib/calendar/availability/fingerprint.ts",
  "src/lib/calendar/availability/expand.ts",
  "src/lib/calendar/availability/evaluate.ts",
  "src/lib/calendar/availability/standing-seeds.ts",
  "src/lib/calendar/availability/index.ts",
  "src/server/services/availability-service.ts",
  "src/app/api/calendar/availability/rules/route.ts",
  "src/app/api/calendar/availability/rules/[ruleId]/route.ts",
  "src/app/api/calendar/availability/exceptions/route.ts",
  "src/app/api/calendar/availability/evaluate/route.ts",
  "src/app/api/calendar/availability/acknowledge/route.ts",
  "src/app/api/calendar/availability/preview/route.ts",
  "src/app/api/calendar/availability/seed/route.ts",
  "src/app/system/calendar/availability/page.tsx",
  "src/app/system/calendar/availability/rules/new/page.tsx",
  "src/app/system/calendar/availability/rules/[ruleId]/page.tsx",
  "src/app/system/calendar/availability/exceptions/page.tsx",
  "src/app/system/calendar/availability/preview/page.tsx",
  "src/components/events/AvailabilityWarningPanel.tsx",
  "src/components/calendar/AvailabilityOverlay.tsx",
  "prisma/migrations/20260722110000_cc05_standing_availability/migration.sql",
  "develop_notes/KCCC_CC_05_WAIVER_KELLY_2026-07-22.md",
  "develop_notes/KCCC_CC_05_STANDING_AVAILABILITY_INPUTS.md",
  "develop_notes/KCCC_CC_05_STANDING_AVAILABILITY_INPUTS_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_AVAILABILITY_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_AVAILABILITY_OPERATOR_GUIDE.md",
  "tests/unit/calendar-availability/evaluate.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "CalendarAvailabilityRule",
  "CalendarAvailabilityException",
  "CalendarAvailabilityAcknowledgement",
]) {
  if (schema.includes(`model ${model}`)) pass(`schema model ${model}`);
  else fail(`schema model ${model}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:availability:validate"])
  pass("npm script calendar:availability:validate");
else fail("npm script calendar:availability:validate");

// Never persist an OperationalConflictRecord from CC-05 code.
// (The constraint is documented in comments referencing the forbidden name;
// what matters is that no code path actually touches the Prisma model.)
const serviceSrc = fs.readFileSync(
  path.join(root, "src/server/services/availability-service.ts"),
  "utf8",
);
const codeOnly = serviceSrc
  .split("\n")
  .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
  .join("\n");
if (!/OperationalConflictRecord/.test(codeOnly))
  pass("availability-service never references OperationalConflictRecord");
else fail("availability-service references OperationalConflictRecord (forbidden)");

const Module = require("module");
const stub = path.join(root, "scripts/cli-node_modules/server-only/index.js");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};
require("tsx/cjs/api").register();

const availability = require(path.join(root, "src/lib/calendar/availability/index.ts"));
const { chicagoDateKey } = require(path.join(root, "src/lib/calendar/chicago-date.ts"));

function rule(overrides) {
  const base = {
    id: "r1",
    campaignKey: "kelly",
    subjectType: "CANDIDATE",
    subjectUserId: null,
    ruleType: "OFFICE_HOURS",
    classification: "UNAVAILABLE",
    timezone: "America/Chicago",
    effectiveStartDate: "2025-11-01",
    effectiveEndDate: null,
    startLocalTime: "08:00",
    endLocalTime: "12:00",
    weekdays: [1, 2, 3, 4, 5],
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    priority: 40,
    approvalState: "ACTIVE",
    label: "Office hours",
    locationHint: null,
    isActive: true,
  };
  const merged = { ...base, ...overrides };
  merged.ruleFingerprint = availability.computeRuleFingerprint(merged);
  return merged;
}

function exception(overrides) {
  const base = {
    id: "e1",
    campaignKey: "kelly",
    ruleId: null,
    subjectType: "CANDIDATE",
    startDate: "2026-08-01",
    endDateExclusive: "2026-08-02",
    startLocalTime: null,
    endLocalTime: null,
    isAllDay: true,
    timezone: "America/Chicago",
    classification: "AVAILABLE",
    label: "One-off opening",
    approvalState: "ACTIVE",
    isActive: true,
  };
  const merged = { ...base, ...overrides };
  merged.exceptionFingerprint = availability.computeExceptionFingerprint(merged);
  return merged;
}

// --- Preferred window ---
{
  const r = rule({
    id: "pref",
    ruleType: "PREFERRED_WINDOW",
    classification: "PREFERRED",
    startLocalTime: "12:00",
    endLocalTime: "13:00",
    priority: 60,
  });
  const result = availability.evaluateAvailability({
    rules: [r],
    exceptions: [],
    startsAt: new Date("2026-08-04T17:15:00.000Z"), // 12:15 CDT Tue
    endsAt: new Date("2026-08-04T17:45:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (result.classification === "PREFERRED") pass("Preferred window classifies PREFERRED");
  else fail(`Preferred window: ${result.classification}`);
}

// --- Unavailable overlap ---
{
  const r = rule({ id: "morning" });
  const result = availability.evaluateAvailability({
    rules: [r],
    exceptions: [],
    startsAt: new Date("2026-08-04T14:00:00.000Z"), // 09:00 CDT Tue
    endsAt: new Date("2026-08-04T15:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (
    result.classification === "UNAVAILABLE" &&
    result.findings.some((f) => f.blocksSave)
  )
    pass("Unavailable overlap blocks save");
  else fail(`Unavailable overlap: ${result.classification}`);
}

// --- Exception override (opens an otherwise unavailable window) ---
{
  const r = rule({
    id: "morning2",
    effectiveStartDate: "2025-11-01",
    weekdays: [], // every day
  });
  const ex = exception({
    id: "opening",
    startDate: "2026-08-04",
    endDateExclusive: "2026-08-05",
    classification: "AVAILABLE",
  });
  const result = availability.evaluateAvailability({
    rules: [r],
    exceptions: [ex],
    startsAt: new Date("2026-08-04T14:00:00.000Z"),
    endsAt: new Date("2026-08-04T15:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (result.classification === "AVAILABLE")
    pass("Exception overrides rule (AVAILABLE wins for the day)");
  else fail(`Exception override: ${result.classification}`);
}

// --- Touching boundary is not an overlap ---
{
  const r = rule({ id: "morning3" });
  const result = availability.evaluateAvailability({
    rules: [r],
    exceptions: [],
    // Rule 08:00-12:00 CDT Tue → 13:00-17:00 UTC. Event starts exactly at 12:00 CDT (17:00 UTC).
    startsAt: new Date("2026-08-04T17:00:00.000Z"),
    endsAt: new Date("2026-08-04T18:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (result.findings.length === 0 && result.classification !== "UNAVAILABLE")
    pass("Touching boundary does not overlap");
  else fail(`Touching boundary: ${result.classification}, findings=${result.findings.length}`);
}

// --- Buffer expands protected interval ---
{
  const r = rule({
    id: "buffered",
    ruleType: "PROTECTED_WORK",
    classification: "CONSTRAINED",
    startLocalTime: "08:00",
    endLocalTime: "12:00",
    bufferBeforeMinutes: 30,
    bufferAfterMinutes: 30,
  });
  const result = availability.evaluateAvailability({
    rules: [r],
    exceptions: [],
    // 07:45 CDT Tue = 12:45 UTC — inside the 30-minute pre-buffer only.
    startsAt: new Date("2026-08-04T12:45:00.000Z"),
    endsAt: new Date("2026-08-04T13:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (result.classification === "CONSTRAINED")
    pass("Buffer expands protected interval");
  else fail(`Buffer expansion: ${result.classification}`);
}

// --- UNKNOWN with no rules ---
{
  const result = availability.evaluateAvailability({
    rules: [],
    exceptions: [],
    startsAt: new Date("2026-08-04T14:00:00.000Z"),
    endsAt: new Date("2026-08-04T15:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (result.classification === "UNKNOWN") pass("No rules → UNKNOWN (not AVAILABLE)");
  else fail(`No rules classification: ${result.classification}`);
}

// --- DST spring forward (Chicago wall time stable) ---
{
  // 2026-03-08 is the US spring-forward date. Rule 09:00-10:00 daily.
  const r = rule({
    id: "dst",
    ruleType: "GENERAL_AVAILABILITY",
    classification: "PREFERRED",
    startLocalTime: "09:00",
    endLocalTime: "10:00",
    weekdays: [],
  });
  const expanded = availability.expandRuleIntervals({
    rule: r,
    rangeStartsAt: new Date("2026-03-07T00:00:00.000Z"),
    rangeEndsAt: new Date("2026-03-10T00:00:00.000Z"),
  });
  const iv = expanded.intervals.find(
    (candidate) => chicagoDateKey(candidate.startsAt) === "2026-03-08",
  );
  if (iv) {
    const wallHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      hour12: false,
    }).format(iv.startsAt);
    if (wallHour.replace(/[^0-9]/g, "") === "09")
      pass("DST spring-forward keeps 09:00 Chicago wall time");
    else fail(`DST spring-forward wall hour: ${wallHour}`);
  } else fail("DST spring-forward produced no interval");
}

// --- Fingerprint stability ---
{
  const a = rule({ id: "fp1" });
  const b = rule({ id: "fp1" });
  if (a.ruleFingerprint === b.ruleFingerprint) pass("Rule fingerprint stable for identical input");
  else fail("Rule fingerprint unstable");

  const c = rule({ id: "fp1", classification: "AVAILABLE" });
  if (a.ruleFingerprint !== c.ruleFingerprint)
    pass("Rule fingerprint changes when classification changes");
  else fail("Rule fingerprint did not change with classification");
}

// --- Standing seeds ---
{
  const seeds = availability.standingPolicySeedRules("kelly");
  if (Array.isArray(seeds) && seeds.length >= 4 && seeds.every((s) => s.ruleFingerprint))
    pass("Standing policy seeds produced with fingerprints");
  else fail("Standing policy seeds missing or incomplete");
}

// --- Evaluate does not mutate inputs ---
{
  const r = rule({ id: "immut" });
  const ex = exception({ id: "immut-ex" });
  const rulesSnapshot = JSON.stringify(r);
  const exceptionsSnapshot = JSON.stringify(ex);
  availability.evaluateAvailability({
    rules: [r],
    exceptions: [ex],
    startsAt: new Date("2026-08-04T14:00:00.000Z"),
    endsAt: new Date("2026-08-04T15:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (JSON.stringify(r) === rulesSnapshot && JSON.stringify(ex) === exceptionsSnapshot)
    pass("evaluateAvailability does not mutate rule/exception inputs");
  else fail("evaluateAvailability mutated inputs");
}

console.log(`\nCC-05 availability validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
