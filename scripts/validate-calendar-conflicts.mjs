/**
 * CC-06 Conflict Engine — Calendar Slice validator (ADR-092).
 * Mirrors scripts/validate-calendar-availability.mjs.
 *
 * Proves (structurally + behaviorally):
 *  - Required files/schema fields/npm script exist.
 *  - The conflict engine never mutates Event/Mission state (no forbidden
 *    Event/Mission write calls in the detector or engine/ops-service code).
 *  - ACKNOWLEDGED never sets `status` (never clears a blocker).
 *  - `automaticallyResolved` is always `false`, never `true`.
 *  - TRAVEL_INFEASIBLE only fires from stored minutes — UNKNOWN (no stored
 *    fact) is always skipped, never flagged.
 *  - TIME_OVERLAP uses half-open interval semantics (touching boundary is
 *    not an overlap).
 *  - conflictKey is stable regardless of entity-id ordering.
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
  "src/features/operational-intelligence/services/conflict-service.ts",
  "src/server/services/conflict-engine-service.ts",
  "src/server/services/authenticated-ops-service.ts",
  "src/app/api/conflicts/route.ts",
  "src/app/api/conflicts/[conflictId]/acknowledge/route.ts",
  "src/app/api/conflicts/[conflictId]/override/route.ts",
  "src/app/api/conflicts/[conflictId]/resolve/route.ts",
  "src/app/api/conflicts/[conflictId]/not-applicable/route.ts",
  "src/app/api/events/[eventId]/conflicts/route.ts",
  "src/app/api/calendar/conflicts/recompute/route.ts",
  "src/app/system/conflicts/page.tsx",
  "src/components/calendar/conflicts/ConflictQueuePanel.tsx",
  "src/components/events/EventConflictsPanel.tsx",
  "prisma/migrations/20260722120000_cc06_conflict_engine/migration.sql",
  "develop_notes/KCCC_CC_06_AUTHORIZATION_KELLY_2026-07-22.md",
  "develop_notes/KCCC_CC_06_CONFLICT_ENGINE.md",
  "develop_notes/KCCC_CC_06_CONFLICT_ENGINE_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_CONFLICT_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_CONFLICT_OPERATOR_GUIDE.md",
  "tests/unit/calendar-conflicts/detectors.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

// --- Schema additive fields ---
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (schema.includes("model OperationalConflictRecord")) {
  pass("schema model OperationalConflictRecord");
  const recordBlock = schema.slice(
    schema.indexOf("model OperationalConflictRecord"),
    schema.indexOf("model OperationalConflictAction"),
  );
  for (const field of [
    "campaignKey",
    "factFingerprint",
    "disposition",
    "dispositionReason",
    "lastEvaluatedAt",
    "stale",
  ]) {
    if (new RegExp(`\\b${field}\\b`).test(recordBlock)) pass(`OperationalConflictRecord.${field}`);
    else fail(`OperationalConflictRecord missing ${field}`);
  }
} else {
  fail("schema model OperationalConflictRecord missing");
}
if (schema.includes("model OperationalConflictAction")) {
  pass("schema model OperationalConflictAction");
  const actionBlock = schema.slice(schema.indexOf("model OperationalConflictAction"));
  if (/\bdisposition\b/.test(actionBlock.slice(0, actionBlock.indexOf("@@schema"))))
    pass("OperationalConflictAction.disposition");
  else fail("OperationalConflictAction missing disposition");
} else {
  fail("schema model OperationalConflictAction missing");
}

// --- npm script ---
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:conflicts:validate"]) pass("npm script calendar:conflicts:validate");
else fail("npm script calendar:conflicts:validate");

// --- Never mutate Event/Mission state ---
const FORBIDDEN_EVENT_MUTATIONS = [
  "updateCanonicalEvent",
  "archiveCanonicalEvent",
  "restoreCanonicalEvent",
  "changePrimaryCalendar",
  "prisma.event.update",
  "prisma.event.delete",
  "prisma.event.create",
  "prisma.mission.update",
  "prisma.mission.create",
  "prisma.mission.delete",
];
function codeOnlyLines(src) {
  return src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");
}
for (const rel of [
  "src/features/operational-intelligence/services/conflict-service.ts",
  "src/server/services/conflict-engine-service.ts",
]) {
  const src = codeOnlyLines(fs.readFileSync(path.join(root, rel), "utf8"));
  const hit = FORBIDDEN_EVENT_MUTATIONS.find((needle) => src.includes(needle));
  if (!hit) pass(`${rel} never mutates Event/Mission state`);
  else fail(`${rel} references forbidden Event/Mission mutation: ${hit}`);
}

// --- ACKNOWLEDGED never clears a blocker (never sets `status`) ---
{
  const opsSrc = fs.readFileSync(
    path.join(root, "src/server/services/authenticated-ops-service.ts"),
    "utf8",
  );
  const fnStart = opsSrc.indexOf("export async function acknowledgeConflict");
  const fnEnd = opsSrc.indexOf("\nexport async function", fnStart + 1);
  const fnBody = opsSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
  const updateCallStart = fnBody.indexOf("operationalConflictRecord.update");
  const updateCallBody = fnBody.slice(updateCallStart, updateCallStart + 400);
  if (fnStart !== -1 && !/\bstatus\s*:/.test(updateCallBody))
    pass("acknowledgeConflict never sets `status` (blocker remains open)");
  else fail("acknowledgeConflict sets `status` — would incorrectly clear a blocker");
}

// --- automaticallyResolved is always false ---
{
  const serviceSrc = fs.readFileSync(
    path.join(root, "src/features/operational-intelligence/services/conflict-service.ts"),
    "utf8",
  );
  const engineSrc = fs.readFileSync(
    path.join(root, "src/server/services/conflict-engine-service.ts"),
    "utf8",
  );
  const combined = serviceSrc + "\n" + engineSrc;
  if (/automaticallyResolved:\s*true/.test(combined))
    fail("found `automaticallyResolved: true` — must always be false");
  else pass("automaticallyResolved is never set to true");
  if (/automaticallyResolved:\s*false/.test(combined))
    pass("automaticallyResolved: false is present");
  else fail("automaticallyResolved: false not found");
}

// --- Behavioral checks against the pure detectors (tsx, no DB) ---
const stub = path.join(root, "scripts/cli-node_modules/server-only/index.js");
const Module = require("module");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stub;
  return original.call(this, request, parent, isMain, options);
};
require("tsx/cjs/api").register();

const conflictService = require(
  path.join(root, "src/features/operational-intelligence/services/conflict-service.ts"),
);

// Half-open overlap: touching boundary is not an overlap.
{
  const events = [
    { id: "a", label: "A", startsAt: new Date("2026-08-01T10:00:00Z"), endsAt: new Date("2026-08-01T11:00:00Z"), status: "CONFIRMED" },
    { id: "b", label: "B", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z"), status: "CONFIRMED" },
  ];
  const conflicts = conflictService.detectTimeOverlapConflicts(events);
  if (conflicts.length === 0) pass("TIME_OVERLAP: touching boundary is not an overlap (half-open)");
  else fail(`TIME_OVERLAP: touching boundary produced ${conflicts.length} conflict(s)`);
}

// True overlap detected, severity reflects confirmation state.
{
  const events = [
    { id: "a", label: "A", startsAt: new Date("2026-08-01T10:00:00Z"), endsAt: new Date("2026-08-01T11:30:00Z"), status: "CONFIRMED" },
    { id: "b", label: "B", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z"), status: "CONFIRMED" },
  ];
  const conflicts = conflictService.detectTimeOverlapConflicts(events);
  if (conflicts.length === 1 && conflicts[0].severity === "CRITICAL")
    pass("TIME_OVERLAP: true overlap of two confirmed events is CRITICAL");
  else fail(`TIME_OVERLAP: expected 1 CRITICAL conflict, got ${JSON.stringify(conflicts)}`);
}

// conflictKey stable regardless of entity-id ordering.
{
  const overlapStartsAt = new Date("2026-08-01T11:00:00Z");
  const overlapEndsAt = new Date("2026-08-01T11:30:00Z");
  const k1 = conflictService.computeConflictKey({
    conflictType: "TIME_OVERLAP",
    entityIds: ["b", "a"],
    overlapStartsAt,
    overlapEndsAt,
  });
  const k2 = conflictService.computeConflictKey({
    conflictType: "TIME_OVERLAP",
    entityIds: ["a", "b"],
    overlapStartsAt,
    overlapEndsAt,
  });
  if (k1 === k2) pass("conflictKey is stable regardless of entity-id ordering");
  else fail(`conflictKey unstable: ${k1} !== ${k2}`);
}

// Inactive/declined events excluded from TIME_OVERLAP.
{
  const events = [
    { id: "a", label: "A", startsAt: new Date("2026-08-01T10:00:00Z"), endsAt: new Date("2026-08-01T11:30:00Z"), status: "CANCELLED" },
    { id: "b", label: "B", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z"), status: "CONFIRMED" },
  ];
  const conflicts = conflictService.detectTimeOverlapConflicts(events);
  if (conflicts.length === 0) pass("TIME_OVERLAP: CANCELLED events excluded");
  else fail(`TIME_OVERLAP: CANCELLED event still produced a conflict`);
}

// TRAVEL_INFEASIBLE — UNKNOWN (no stored minutes) is always skipped, never flagged.
{
  const conflicts = conflictService.detectTravelInfeasibleConflicts([
    {
      previousEvent: { id: "p", label: "Prev", endsAt: new Date("2026-08-01T10:00:00Z") },
      nextEvent: { id: "n", label: "Next", startsAt: new Date("2026-08-01T10:05:00Z") },
      estimatedTravelMinutes: null,
      bufferMinutes: null,
    },
  ]);
  if (conflicts.length === 0) pass("TRAVEL_INFEASIBLE: UNKNOWN (no stored minutes) never flagged");
  else fail("TRAVEL_INFEASIBLE: flagged a conflict with no stored travel minutes");
}

// TRAVEL_INFEASIBLE — fires only from stored facts when infeasible.
{
  const conflicts = conflictService.detectTravelInfeasibleConflicts([
    {
      previousEvent: { id: "p", label: "Prev", endsAt: new Date("2026-08-01T10:00:00Z") },
      nextEvent: { id: "n", label: "Next", startsAt: new Date("2026-08-01T10:05:00Z") },
      estimatedTravelMinutes: 60,
      bufferMinutes: 15,
    },
  ]);
  if (conflicts.length === 1 && conflicts[0].conflictType === "TRAVEL_INFEASIBLE")
    pass("TRAVEL_INFEASIBLE: fires from stored facts when infeasible");
  else fail(`TRAVEL_INFEASIBLE: expected 1 conflict, got ${JSON.stringify(conflicts)}`);
}

// AVAILABILITY_VIOLATION — only from UNAVAILABLE findings.
{
  const finding = {
    key: "f1",
    classification: "UNAVAILABLE",
    severity: "blocking",
    explanation: "Standing office hours",
    blocksSave: true,
    requiresAcknowledgement: true,
    overlapStartsAt: new Date("2026-08-01T10:00:00Z"),
    overlapEndsAt: new Date("2026-08-01T11:00:00Z"),
    ruleId: "rule1",
  };
  const conflicts = conflictService.detectAvailabilityViolationConflicts([
    { event: { id: "e1", label: "Event 1" }, finding },
  ]);
  if (conflicts.length === 1 && conflicts[0].conflictType === "AVAILABILITY_VIOLATION")
    pass("AVAILABILITY_VIOLATION: fires from an UNAVAILABLE finding");
  else fail(`AVAILABILITY_VIOLATION: expected 1 conflict, got ${JSON.stringify(conflicts)}`);

  const nonBlocking = conflictService.detectAvailabilityViolationConflicts([
    { event: { id: "e1", label: "Event 1" }, finding: { ...finding, classification: "PREFERRED" } },
  ]);
  if (nonBlocking.length === 0) pass("AVAILABILITY_VIOLATION: PREFERRED findings never flagged");
  else fail("AVAILABILITY_VIOLATION: PREFERRED finding incorrectly flagged");
}

// BUFFER_CONFLICT — only from explicit buffer rule types.
{
  const finding = {
    key: "f2",
    classification: "CONSTRAINED",
    severity: "warning",
    explanation: "Travel buffer compressed",
    blocksSave: false,
    requiresAcknowledgement: false,
    overlapStartsAt: new Date("2026-08-01T10:00:00Z"),
    overlapEndsAt: new Date("2026-08-01T10:30:00Z"),
    ruleId: "rule2",
  };
  const fires = conflictService.detectBufferConflicts([
    { event: { id: "e1", label: "Event 1" }, finding, ruleType: "TRAVEL_BUFFER" },
  ]);
  if (fires.length === 1 && fires[0].conflictType === "BUFFER_CONFLICT")
    pass("BUFFER_CONFLICT: fires from an explicit buffer rule type");
  else fail(`BUFFER_CONFLICT: expected 1 conflict, got ${JSON.stringify(fires)}`);

  const skipped = conflictService.detectBufferConflicts([
    { event: { id: "e1", label: "Event 1" }, finding, ruleType: "PROTECTED_WORK" },
  ]);
  if (skipped.length === 0) pass("BUFFER_CONFLICT: non-buffer rule types are out of CC-06 scope");
  else fail("BUFFER_CONFLICT: non-buffer rule type incorrectly flagged");
}

console.log(`\nCC-06 conflict engine validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
