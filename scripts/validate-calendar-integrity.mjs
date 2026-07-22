/**
 * Structural + unit-style validation for CC-02 Calendar Integrity.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
let failed = false;

function pass(msg) {
  console.log("PASS:", msg);
}
function fail(msg) {
  console.error("FAIL:", msg);
  failed = true;
}

const required = [
  "src/lib/calendar/integrity/types.ts",
  "src/lib/calendar/integrity/normalize.ts",
  "src/lib/calendar/integrity/detectors.ts",
  "src/lib/calendar/import-provenance.ts",
  "src/server/services/calendar-integrity-service.ts",
  "src/app/system/calendar/integrity/page.tsx",
  "src/app/system/calendar/integrity/scans/page.tsx",
  "src/app/api/calendar/integrity/route.ts",
  "src/components/calendar/EventProvenancePanel.tsx",
  "prisma/migrations/20260722010000_cc02_calendar_integrity/migration.sql",
  "develop_notes/KCCC_CC_02_CALENDAR_INTEGRITY_PROVENANCE_CONSOLE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(rel);
  else fail(rel);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "CalendarIntegrityScan",
  "CalendarIntegrityFinding",
  "CalendarIntegrityDisposition",
  "CalendarIntegrityRepairAttempt",
]) {
  if (schema.includes(`model ${model}`)) pass(`schema model ${model}`);
  else fail(`schema model ${model}`);
}

// Pure detector smoke via tsx register if available
try {
  const Module = require("module");
  const stub = path.join(root, "scripts/cli-node_modules/server-only/index.js");
  const original = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === "server-only") return stub;
    return original.call(this, request, parent, isMain, options);
  };
  require("tsx/cjs/api").register();
  const { runAllIntegrityDetectors } = require(
    path.join(root, "src/lib/calendar/integrity/detectors.ts"),
  );
  const { stableIntegrityFindingKey } = require(
    path.join(root, "src/lib/calendar/integrity/normalize.ts"),
  );
  const start = new Date("2026-09-15T14:00:00-05:00");
  const end = new Date("2026-09-15T15:00:00-05:00");
  const base = {
    status: "HOLD",
    startsAt: start,
    endsAt: end,
    timezone: "America/Chicago",
    isAllDay: false,
    isImported: false,
    isRecurring: false,
    recurrenceSeriesId: null,
    recurrenceRule: null,
    originalOccurrenceAt: null,
    city: "Little Rock",
    streetAddress: null,
    privateNotes: null,
    sourceType: "MANUAL",
    primaryCalendarId: "cal1",
    primaryCalendarSlug: "public-events",
    archivedAt: null,
    createdAt: start,
    updatedAt: start,
    version: 1,
    membershipCalendarIds: ["cal1"],
    primaryMembershipCount: 1,
    statusHistory: [{ fromStatus: null, toStatus: "HOLD", reason: "Created" }],
    externalIdentityIds: [],
    importRecordIds: [],
    missionId: null,
  };
  const findings = runAllIntegrityDetectors({
    events: [
      {
        ...base,
        id: "e1",
        eventNumber: "KCCC-2026-9001",
        internalTitle: "County Fair",
        campaignDisplayTitle: "County Fair",
      },
      {
        ...base,
        id: "e2",
        eventNumber: "KCCC-2026-9002",
        internalTitle: "County Fair",
        campaignDisplayTitle: "County Fair",
      },
    ],
    identities: [],
    importRecords: [],
    importRuns: [],
  });
  const exact = findings.filter((f) => f.findingType === "EXACT_DUPLICATE_GROUP");
  if (exact.length >= 1) pass("exact duplicate detection");
  else fail("exact duplicate detection");

  const k1 = stableIntegrityFindingKey("EXACT_DUPLICATE_GROUP", ["a", "b"]);
  const k2 = stableIntegrityFindingKey("EXACT_DUPLICATE_GROUP", ["a", "b"]);
  if (k1 === k2) pass("stable finding keys");
  else fail("stable finding keys");

  // Legitimate same title different days should not be exact
  const day2 = new Date("2026-09-16T14:00:00-05:00");
  const day2end = new Date("2026-09-16T15:00:00-05:00");
  const findings2 = runAllIntegrityDetectors({
    events: [
      {
        ...base,
        id: "e1",
        eventNumber: "KCCC-2026-9001",
        internalTitle: "Weekly Staff Sync",
        campaignDisplayTitle: "Weekly Staff Sync",
      },
      {
        ...base,
        id: "e3",
        eventNumber: "KCCC-2026-9003",
        internalTitle: "Weekly Staff Sync",
        campaignDisplayTitle: "Weekly Staff Sync",
        startsAt: day2,
        endsAt: day2end,
      },
    ],
    identities: [],
    importRecords: [],
    importRuns: [],
  });
  const falseExact = findings2.filter((f) => f.findingType === "EXACT_DUPLICATE_GROUP");
  if (falseExact.length === 0) pass("legitimate repeated title not exact duplicate");
  else fail("legitimate repeated title not exact duplicate");

  const driftFindings = runAllIntegrityDetectors({
    events: [
      {
        ...base,
        id: "imp1",
        eventNumber: "KCCC-2026-9010",
        internalTitle: "Imported Rally",
        campaignDisplayTitle: "Imported Rally",
        isImported: true,
        sourceType: "GOOGLE_CALENDAR",
        updatedAt: new Date(start.getTime() + 120_000),
      },
    ],
    identities: [
      {
        id: "id1",
        externalSourceId: "src",
        externalEventId: "g1",
        fingerprint: "fp-a",
        canonicalEventId: "imp1",
        deletedAt: null,
        provider: "GOOGLE_CALENDAR",
      },
    ],
    importRecords: [],
    importRuns: [],
    eventAuditActions: { imp1: ["EVENT_UPDATE"] },
  });
  if (driftFindings.some((f) => f.findingType === "SOURCE_LOCAL_DRIFT")) {
    pass("source/local drift detection");
  } else {
    fail("source/local drift detection");
  }

  const endBefore = runAllIntegrityDetectors({
    events: [
      {
        ...base,
        id: "bad",
        eventNumber: "KCCC-2026-9011",
        internalTitle: "Broken",
        campaignDisplayTitle: "Broken",
        startsAt: end,
        endsAt: start,
      },
    ],
    identities: [],
    importRecords: [],
    importRuns: [],
  });
  if (endBefore.some((f) => f.findingType === "END_BEFORE_START")) pass("end-before-start warning");
  else fail("end-before-start warning");
} catch (err) {
  fail(`detector smoke: ${err?.message ?? err}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:integrity:validate"]) pass("npm script calendar:integrity:validate");
else fail("npm script calendar:integrity:validate");

if (failed) process.exit(1);
console.log("Calendar integrity validation passed.");
