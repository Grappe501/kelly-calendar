/**
 * CC-04 Recurrence & Occurrence Exceptions validator (pure + structural).
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
  "src/lib/calendar/recurrence/index.ts",
  "src/lib/calendar/recurrence/limits.ts",
  "src/lib/calendar/recurrence/occurrence-key.ts",
  "src/lib/calendar/recurrence/parse-rrule.ts",
  "src/lib/calendar/recurrence/expand.ts",
  "src/server/services/recurrence-series-service.ts",
  "src/app/api/calendar/recurrence/route.ts",
  "src/app/api/calendar/series/[seriesId]/route.ts",
  "src/app/api/events/[eventId]/occurrence/route.ts",
  "src/app/calendar/series/[seriesId]/page.tsx",
  "prisma/migrations/20260722090000_cc04_recurrence_exceptions/migration.sql",
  "develop_notes/KCCC_CC_04_RECURRENCE_OCCURRENCE_EXCEPTIONS.md",
  "develop_notes/KCCC_CC_04_RECURRENCE_OCCURRENCE_EXCEPTIONS_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_RECURRENCE_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_RECURRENCE_OPERATOR_GUIDE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of ["CalendarRecurrenceSeries", "CalendarOccurrenceException"]) {
  if (schema.includes(`model ${model}`)) pass(`schema model ${model}`);
  else fail(`schema model ${model}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.dependencies?.rrule) pass("rrule dependency present");
else fail("rrule dependency missing");
if (pkg.scripts?.["calendar:recurrence:validate"])
  pass("npm script calendar:recurrence:validate");
else fail("npm script calendar:recurrence:validate");

const Module = require("module");
const stub = path.join(root, "scripts/cli-node_modules/server-only/index.js");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};
require("tsx/cjs/api").register();

const recurrence = require(path.join(root, "src/lib/calendar/recurrence/index.ts"));

// --- Rule parsing ---
{
  const daily = recurrence.parseRecurrenceRule("FREQ=DAILY;COUNT=5");
  if (daily.ok && daily.freq === "DAILY" && daily.count === 5) pass("Parse DAILY COUNT");
  else fail("Parse DAILY COUNT");
}
{
  const weekly = recurrence.parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR");
  if (weekly.ok && weekly.byweekday.length === 3) pass("Parse WEEKLY BYDAY");
  else fail("Parse WEEKLY BYDAY");
}
{
  const monthly = recurrence.parseRecurrenceRule("FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3");
  if (monthly.ok && monthly.freq === "MONTHLY") pass("Parse MONTHLY BYMONTHDAY");
  else fail("Parse MONTHLY BYMONTHDAY");
}
{
  const yearly = recurrence.parseRecurrenceRule("FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=4;COUNT=2");
  if (yearly.ok && yearly.freq === "YEARLY") pass("Parse YEARLY");
  else fail("Parse YEARLY");
}
{
  const bad = recurrence.parseRecurrenceRule("FREQ=HOURLY;COUNT=3");
  if (!bad.ok) pass("Reject unsupported HOURLY");
  else fail("Reject unsupported HOURLY");
}
{
  const huge = recurrence.parseRecurrenceRule("FREQ=DAILY;COUNT=9999");
  if (!huge.ok) pass("Reject excessive COUNT");
  else fail("Reject excessive COUNT");
}
{
  const a = recurrence.parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=1;BYDAY=TU");
  const b = recurrence.parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=1;BYDAY=TU");
  if (a.ok && b.ok && a.normalized === b.normalized) pass("Stable normalized fingerprint input");
  else fail("Stable normalized");
}

// --- Occurrence identity ---
{
  const k1 = recurrence.buildOccurrenceKey({
    seriesId: "s1",
    originalLocalStart: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
  });
  const k2 = recurrence.buildOccurrenceKey({
    seriesId: "s1",
    originalLocalStart: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (k1 === k2 && k1.length === 32) pass("Stable occurrence key");
  else fail("Stable occurrence key");
}
{
  const a = recurrence.buildOccurrenceKey({
    seriesId: "s1",
    originalLocalStart: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
  });
  const b = recurrence.buildOccurrenceKey({
    seriesId: "s2",
    originalLocalStart: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (a !== b) pass("Different series do not collide");
  else fail("Different series collide");
}
{
  const k = recurrence.buildOccurrenceKey({
    seriesId: "s1",
    originalLocalStart: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (!/secret|title|password/i.test(k)) pass("Key has no sensitive content");
  else fail("Key sensitive");
}

// --- Expansion ---
{
  const exp = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-weekly",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=TU;COUNT=4",
    dtstartLocal: "2026-07-21T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 60,
    maxOccurrences: 4,
  });
  if (exp.ok && exp.occurrences.length === 4) pass("Weekly expansion COUNT=4");
  else fail(`Weekly expansion: ${exp.ok ? exp.occurrences.length : exp.message}`);
}
{
  const a = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-idemp",
    rrule: "FREQ=WEEKLY;COUNT=3",
    dtstartLocal: "2026-08-03T10:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 30,
  });
  const b = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-idemp",
    rrule: "FREQ=WEEKLY;COUNT=3",
    dtstartLocal: "2026-08-03T10:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 30,
  });
  if (
    a.ok &&
    b.ok &&
    a.occurrences.map((o) => o.occurrenceKey).join() ===
      b.occurrences.map((o) => o.occurrenceKey).join()
  )
    pass("Repeat expansion idempotent keys");
  else fail("Repeat expansion idempotent");
}
{
  const exp = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-trunc",
    rrule: "FREQ=DAILY;COUNT=100",
    dtstartLocal: "2026-07-01T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 15,
    maxOccurrences: 10,
  });
  if (exp.ok && exp.truncated && exp.occurrences.length === 10)
    pass("Truncation at maxOccurrences");
  else fail("Truncation");
}
{
  const exp = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-ex",
    rrule: "FREQ=DAILY;COUNT=5",
    dtstartLocal: "2026-07-01T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 30,
    exdatesLocal: ["2026-07-02T09:00"],
  });
  if (exp.ok && exp.occurrences.length === 4) pass("EXDATE removes one occurrence");
  else fail(`EXDATE: ${exp.ok ? exp.occurrences.length : exp.message}`);
}

// --- DST-stable local weekly across spring 2026 ---
{
  // Tuesdays 09:00 Chicago across March DST
  const exp = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-dst",
    rrule: "FREQ=WEEKLY;BYDAY=TU;COUNT=6",
    dtstartLocal: "2026-03-03T09:00",
    timezone: "America/Chicago",
    isAllDay: false,
    durationMinutes: 60,
  });
  if (exp.ok) {
    const walls = exp.occurrences.map((o) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(o.startsAt);
      const h = parts.find((p) => p.type === "hour")?.value;
      const m = parts.find((p) => p.type === "minute")?.value;
      return `${h}:${m}`;
    });
    if (walls.every((w) => w === "09:00")) pass("DST-stable local 09:00 across spring");
    else fail(`DST walls: ${walls.join(",")}`);
  } else fail(`DST expand: ${exp.message}`);
}

// --- All-day ---
{
  const exp = recurrence.expandRecurrenceOccurrences({
    seriesId: "s-allday",
    rrule: "FREQ=WEEKLY;COUNT=3",
    dtstartLocal: "2026-07-21",
    timezone: "America/Chicago",
    isAllDay: true,
    durationMinutes: 24 * 60,
  });
  if (exp.ok && exp.occurrences.length === 3 && exp.occurrences.every((o) => !o.originalLocalStart.includes("T")))
    pass("All-day recurrence date keys");
  else fail("All-day recurrence");
}

// Authority model documented in API constants via doctrine file
const doctrine = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_CALENDAR_RECURRENCE_DOCTRINE.md"),
  "utf8",
);
if (doctrine.includes("Model B") || doctrine.includes("materialized"))
  pass("Doctrine documents Model B");
else fail("Doctrine Model B");

console.log(`\nCC-04 recurrence validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
