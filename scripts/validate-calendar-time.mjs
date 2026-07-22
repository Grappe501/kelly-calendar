/**
 * CC-03 Calendar time doctrine validator.
 * Pure temporal tests — no DB mutation.
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
  "src/lib/calendar/temporal/types.ts",
  "src/lib/calendar/temporal/wall-time.ts",
  "src/lib/calendar/temporal/ranges.ts",
  "src/lib/calendar/temporal/index.ts",
  "develop_notes/KCCC_CALENDAR_TIME_DOCTRINE.md",
  "develop_notes/KCCC_CC_03_TIMEZONE_ALL_DAY_OVERNIGHT_HARDENING.md",
  "develop_notes/KCCC_CC_03_TIMEZONE_ALL_DAY_OVERNIGHT_HARDENING_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_TIME_OPERATOR_GUIDE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const Module = require("module");
const stub = path.join(root, "scripts/cli-node_modules/server-only/index.js");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};
require("tsx/cjs/api").register();

const temporal = require(path.join(root, "src/lib/calendar/temporal/index.ts"));

// --- Wall-time conversion ---
{
  const r = temporal.resolveWallTime({
    dateKey: "2026-01-15",
    time: "14:30",
    timeZone: "America/Chicago",
  });
  if (r.ok && !r.ambiguous) pass("Chicago standard wall time");
  else fail("Chicago standard wall time");
}

{
  const r = temporal.resolveWallTime({
    dateKey: "2026-01-15",
    time: "14:30",
    timeZone: "America/New_York",
  });
  if (r.ok) pass("Non-Chicago IANA timezone");
  else fail("Non-Chicago IANA timezone");
}

{
  const r = temporal.resolveWallTime({
    dateKey: "2026-01-15",
    time: "12:00",
    timeZone: "UTC",
  });
  if (r.ok && r.instant.toISOString().startsWith("2026-01-15T12:00"))
    pass("UTC input");
  else fail(`UTC input: ${r.ok ? r.instant.toISOString() : r.message}`);
}

{
  const r = temporal.resolveWallTime({
    dateKey: "2026-01-15",
    time: "09:00",
    timeZone: "Not/AZone",
  });
  if (!r.ok && r.code === "INVALID_TIMEZONE") pass("Invalid timezone rejected");
  else fail("Invalid timezone rejected");
}

{
  const a = temporal.resolveWallTime({
    dateKey: "2026-06-01",
    time: "10:00",
    timeZone: "America/Chicago",
  });
  const b = temporal.resolveWallTime({
    dateKey: "2026-06-01",
    time: "10:00",
    timeZone: "America/Chicago",
  });
  if (a.ok && b.ok && a.instant.getTime() === b.instant.getTime())
    pass("Round-trip stability");
  else fail("Round-trip stability");
}

// --- DST spring-forward (US 2026-03-08) ---
{
  const gap = temporal.resolveWallTime({
    dateKey: "2026-03-08",
    time: "02:30",
    timeZone: "America/Chicago",
  });
  if (!gap.ok && gap.code === "NONEXISTENT")
    pass("Spring-forward nonexistent time rejected");
  else fail(`Spring-forward gap: ${JSON.stringify(gap)}`);
}

{
  const before = temporal.resolveWallTime({
    dateKey: "2026-03-08",
    time: "01:30",
    timeZone: "America/Chicago",
  });
  const after = temporal.resolveWallTime({
    dateKey: "2026-03-08",
    time: "03:30",
    timeZone: "America/Chicago",
  });
  if (before.ok && after.ok) pass("Valid times immediately before/after gap");
  else fail("Valid times before/after gap");
}

{
  const span = temporal.normalizeTimedRange({
    startDateKey: "2026-03-08",
    startTime: "01:00",
    endDateKey: "2026-03-08",
    endTime: "04:00",
    timezone: "America/Chicago",
  });
  if (span.ok) {
    const mins = temporal.elapsedDurationMinutes(span.value.startsAt, span.value.endsAt);
    // 01:00 CST → 04:00 CDT is 2 elapsed hours (120 min), not 3.
    if (mins === 120) pass(`DST spring span duration ${mins}m`);
    else fail(`DST spring span duration expected 120 got ${mins}`);
  } else fail(`DST spring span: ${span.message}`);
}

// --- DST fall-back (US 2026-11-01) ---
{
  const amb = temporal.resolveWallTime({
    dateKey: "2026-11-01",
    time: "01:30",
    timeZone: "America/Chicago",
  });
  if (amb.ok && amb.ambiguous) pass("Fall-back ambiguous time detected");
  else fail(`Fall-back ambiguity: ${JSON.stringify(amb)}`);
}

{
  const earlier = temporal.resolveWallTime({
    dateKey: "2026-11-01",
    time: "01:30",
    timeZone: "America/Chicago",
    disambiguation: "EARLIER",
  });
  const later = temporal.resolveWallTime({
    dateKey: "2026-11-01",
    time: "01:30",
    timeZone: "America/Chicago",
    disambiguation: "LATER",
  });
  if (
    earlier.ok &&
    later.ok &&
    earlier.instant.getTime() < later.instant.getTime()
  )
    pass("Earlier/later DST selection");
  else fail("Earlier/later DST selection");
}

// --- Timed ranges ---
{
  const same = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "09:00",
    endDateKey: "2026-07-21",
    endTime: "10:00",
    timezone: "America/Chicago",
  });
  if (same.ok && !same.value.isMultiDay && same.value.occupiedCampaignDateKeys.length === 1)
    pass("Same-day timed Event");
  else fail("Same-day timed Event");
}

{
  const overnight = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "22:00",
    endDateKey: "2026-07-22",
    endTime: "02:00",
    timezone: "America/Chicago",
  });
  if (
    overnight.ok &&
    overnight.value.isOvernight &&
    overnight.value.occupiedCampaignDateKeys.length === 2
  )
    pass("Overnight timed Event");
  else fail(`Overnight: ${JSON.stringify(overnight)}`);
}

{
  const multi = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "09:00",
    endDateKey: "2026-07-23",
    endTime: "17:00",
    timezone: "America/Chicago",
  });
  if (multi.ok && multi.value.isMultiDay && multi.value.occupiedCampaignDateKeys.length === 3)
    pass("Multi-day timed Event");
  else fail("Multi-day timed Event");
}

{
  const bad = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "10:00",
    endDateKey: "2026-07-21",
    endTime: "09:00",
    timezone: "America/Chicago",
  });
  if (!bad.ok) pass("End before start rejected");
  else fail("End before start should reject");
}

{
  const eq = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "10:00",
    endDateKey: "2026-07-21",
    endTime: "10:00",
    timezone: "America/Chicago",
  });
  if (!eq.ok) pass("End equal to start rejected");
  else fail("End equal to start should reject");
}

{
  const midnightEnd = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "22:00",
    endDateKey: "2026-07-22",
    endTime: "00:00",
    timezone: "America/Chicago",
  });
  if (
    midnightEnd.ok &&
    midnightEnd.value.occupiedCampaignDateKeys.join(",") === "2026-07-21"
  )
    pass("Ends exactly at midnight → not on next day");
  else
    fail(
      `Midnight boundary: ${
        midnightEnd.ok
          ? midnightEnd.value.occupiedCampaignDateKeys.join(",")
          : midnightEnd.message
      }`,
    );
}

{
  const midnightStart = temporal.normalizeTimedRange({
    startDateKey: "2026-07-22",
    startTime: "00:00",
    endDateKey: "2026-07-22",
    endTime: "01:00",
    timezone: "America/Chicago",
  });
  if (
    midnightStart.ok &&
    midnightStart.value.primaryCampaignDateKey === "2026-07-22"
  )
    pass("Starts exactly at midnight belongs to that day");
  else fail("Midnight start");
}

// --- All-day ---
{
  const one = temporal.normalizeAllDayRange({
    startDateKey: "2026-07-21",
    endDateKeyInclusive: "2026-07-21",
  });
  if (one.ok && one.value.occupiedCampaignDateKeys.length === 1)
    pass("One-day all-day");
  else fail("One-day all-day");
}

{
  const multi = temporal.normalizeAllDayRange({
    startDateKey: "2026-07-21",
    endDateKeyInclusive: "2026-07-23",
  });
  if (
    multi.ok &&
    multi.value.isMultiDay &&
    multi.value.occupiedCampaignDateKeys.length === 3 &&
    multi.value.endDateKeyExclusive === "2026-07-24"
  )
    pass("Multi-day all-day exclusive end");
  else fail("Multi-day all-day");
}

{
  const intersect = temporal.eventIntersectsCampaignDay({
    startsAt: new Date("2026-07-21T05:00:00Z"),
    endsAt: new Date("2026-07-24T05:00:00Z"),
    isAllDay: true,
    dateKey: "2026-07-24",
  });
  void intersect;
}

const multiDayAllDay = temporal.normalizeAllDayRange({
  startDateKey: "2026-07-21",
  endDateKeyInclusive: "2026-07-23",
});
if (multiDayAllDay.ok) {
  const onExclusive = temporal.eventIntersectsCampaignDay({
    startsAt: multiDayAllDay.value.startsAt,
    endsAt: multiDayAllDay.value.endsAt,
    isAllDay: true,
    dateKey: "2026-07-24",
  });
  const onLast = temporal.eventIntersectsCampaignDay({
    startsAt: multiDayAllDay.value.startsAt,
    endsAt: multiDayAllDay.value.endsAt,
    isAllDay: true,
    dateKey: "2026-07-23",
  });
  if (!onExclusive && onLast) pass("All-day exclusive end not displayed");
  else fail("All-day exclusive end membership");
}

// --- Occupied-day membership spanning ---
{
  const overnight = temporal.normalizeTimedRange({
    startDateKey: "2026-07-21",
    startTime: "22:00",
    endDateKey: "2026-07-22",
    endTime: "02:00",
    timezone: "America/Chicago",
  });
  if (overnight.ok) {
    const d1 = temporal.eventIntersectsCampaignDay({
      ...overnight.value,
      dateKey: "2026-07-21",
    });
    const d2 = temporal.eventIntersectsCampaignDay({
      ...overnight.value,
      dateKey: "2026-07-22",
    });
    const d0 = temporal.eventIntersectsCampaignDay({
      ...overnight.value,
      dateKey: "2026-07-20",
    });
    if (d1 && d2 && !d0) pass("Overnight intersects both occupied days only");
    else fail("Overnight intersection");
  }
}

{
  const cls = temporal.classifyEventTemporal({
    startsAt: new Date("2026-07-21T22:00:00-05:00"),
    endsAt: new Date("2026-07-22T02:00:00-05:00"),
    timezone: "America/Chicago",
    isAllDay: false,
  });
  if (cls.classification === "VALID_OVERNIGHT") pass("Classifier VALID_OVERNIGHT");
  else fail(`Classifier got ${cls.classification}`);
}

{
  const cls = temporal.classifyEventTemporal({
    startsAt: new Date("2026-07-21T14:00:00Z"),
    endsAt: new Date("2026-07-21T15:00:00Z"),
    timezone: "",
    isAllDay: false,
  });
  if (cls.classification === "MISSING_TIMEZONE") pass("Classifier MISSING_TIMEZONE");
  else fail("Classifier MISSING_TIMEZONE");
}

// Import mapper all-day exclusive
{
  const mapper = require(path.join(root, "src/lib/calendar/import-apply-mapper.ts"));
  const fields = mapper.mapNormalizedPayloadToEventFields({
    summary: "All day picnic",
    start: { date: "2026-07-21" },
    end: { date: "2026-07-22" }, // Google exclusive
  });
  if (
    fields.isAllDay &&
    temporal.occupiedCampaignDateKeysForInterval(
      fields.startsAt,
      fields.endsAt,
      true,
    ).join(",") === "2026-07-21"
  )
    pass("Import all-day exclusive end → one occupied day");
  else fail("Import all-day exclusive");
}

{
  const mapper = require(path.join(root, "src/lib/calendar/import-apply-mapper.ts"));
  const fields = mapper.mapNormalizedPayloadToEventFields({
    summary: "NY event",
    start: { dateTime: "2026-07-21T15:00:00-04:00", timeZone: "America/New_York" },
    end: { dateTime: "2026-07-21T16:00:00-04:00", timeZone: "America/New_York" },
  });
  if (fields.timezone === "America/New_York" && !fields.isAllDay)
    pass("Import preserves explicit IANA timezone");
  else fail("Import timezone");
}

// Server TZ independence smoke: process.env.TZ shouldn't affect Chicago resolution
{
  const prev = process.env.TZ;
  process.env.TZ = "Pacific/Auckland";
  const r = temporal.resolveWallTime({
    dateKey: "2026-01-15",
    time: "09:00",
    timeZone: "America/Chicago",
  });
  process.env.TZ = prev;
  if (r.ok && r.instant.toISOString() === "2026-01-15T15:00:00.000Z")
    pass("Server timezone independence");
  else
    fail(
      `Server TZ independence got ${r.ok ? r.instant.toISOString() : r.message}`,
    );
}

console.log(`\nCC-03 time validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
