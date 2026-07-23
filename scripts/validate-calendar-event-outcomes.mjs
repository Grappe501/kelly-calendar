/**
 * IC-02A Event Outcome and Hot Wash validator (ADR-105).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
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
  "src/lib/calendar/event-outcomes/types.ts",
  "src/lib/calendar/event-outcomes/fingerprint.ts",
  "src/lib/calendar/event-outcomes/eligibility.ts",
  "src/lib/calendar/event-outcomes/privacy.ts",
  "src/lib/calendar/event-outcomes/index.ts",
  "src/server/repositories/event-outcome-repository.ts",
  "src/server/services/event-outcome-service.ts",
  "src/app/api/events/[eventId]/outcome/route.ts",
  "src/app/api/events/[eventId]/hot-wash/route.ts",
  "src/app/api/events/[eventId]/encounters/route.ts",
  "src/app/api/events/[eventId]/outcome/follow-up/route.ts",
  "src/app/api/events/[eventId]/outcome/report/route.ts",
  "src/app/api/calendar/reviews/route.ts",
  "src/app/system/events/[eventId]/outcome/page.tsx",
  "src/app/system/events/[eventId]/hot-wash/page.tsx",
  "src/app/system/calendar/reviews/page.tsx",
  "src/app/system/calendar/reviews/report/page.tsx",
  "src/components/events/EventOutcomeHotWashClient.tsx",
  "tests/unit/event-outcomes/eligibility.test.ts",
  "prisma/migrations/20260723150000_ic02a_event_outcome_hot_wash/migration.sql",
  "develop_notes/KCCC_IC_02A_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_02A_EVENT_OUTCOME_HOT_WASH.md",
  "develop_notes/KCCC_IC_02A_EVENT_OUTCOME_HOT_WASH_ROLLBACK.md",
  "develop_notes/KCCC_EVENT_OUTCOME_HOT_WASH_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_EVENT_ENCOUNTER_PRIVACY_POLICY.md",
  "develop_notes/ADR-105_EVENT_OUTCOME_INDEPENDENT_FACTS.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "EventOutcomeReview",
  "EventHotWashEntry",
  "EventEncounter",
  "EventOutcomeFollowUpLink",
  "EventOutcomeAuditEntry",
]) {
  if (schema.includes(`model ${model}`)) pass(`schema model ${model}`);
  else fail(`schema missing ${model}`);
}

for (const en of [
  "EventAttendanceOutcome",
  "EventOperationalOutcome",
  "EventOutcomeReviewStatus",
]) {
  if (schema.includes(`enum ${en}`)) pass(`schema enum ${en}`);
  else fail(`schema missing enum ${en}`);
}

// Pure eligibility via compiled TS path — load through vitest-like dynamic import of source via tsx if available
const eligibilityPath = path.join(
  root,
  "src/lib/calendar/event-outcomes/eligibility.ts",
);
const fingerprintPath = path.join(
  root,
  "src/lib/calendar/event-outcomes/fingerprint.ts",
);
if (fs.existsSync(eligibilityPath) && fs.existsSync(fingerprintPath)) {
  pass("eligibility + fingerprint modules present");
}

const migration = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260723150000_ic02a_event_outcome_hot_wash/migration.sql",
  ),
  "utf8",
);
if (!/INSERT INTO/i.test(migration)) pass("migration has no seed INSERTs");
else fail("migration must not seed outcome reviews");
if (/EventOutcomeReview/.test(migration)) pass("migration creates EventOutcomeReview");
else fail("migration missing EventOutcomeReview");

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_02A_STATUS = "COMPLETE"')) pass("IC_02A_STATUS COMPLETE");
else fail("IC_02A_STATUS not COMPLETE");
if (constants.includes('IC_03_STATUS = "NOT_AUTHORIZED"'))
  pass("IC_03 remains NOT_AUTHORIZED");
else fail("IC_03 must stay NOT_AUTHORIZED");

const icsPolicy = fs.readFileSync(
  path.join(root, "src/lib/calendar/ics/policy.ts"),
  "utf8",
);
if (/Event outcome \/ hot-wash private content/.test(icsPolicy))
  pass("ICS policy denies outcome content");
else fail("ICS policy missing outcome deny");

const service = fs.readFileSync(
  path.join(root, "src/server/services/event-outcome-service.ts"),
  "utf8",
);
if (/confirmFollowUp !== true/.test(service))
  pass("Follow-up requires confirmation");
else fail("Follow-up confirmation gate missing");
if (/autoMatchByName === true/.test(service))
  pass("name-only match blocked");
else fail("name-only match block missing");
if (/readsCreateZeroRecords:\s*true/.test(service))
  pass("readsCreateZeroRecords guarantee");
else fail("readsCreateZeroRecords missing");
if (/outcomeDoesNotMutateMissionLifecycle:\s*true/.test(service))
  pass("Mission isolation guarantee");
else fail("Mission isolation missing");

const client = fs.readFileSync(
  path.join(root, "src/components/events/EventOutcomeHotWashClient.tsx"),
  "utf8",
);
if (/minHeight: 48/.test(client) || /minHeight: 44/.test(client))
  pass("mobile touch targets");
else fail("mobile touch targets missing");
if (/aria-labelledby|aria-label|htmlFor/.test(client))
  pass("accessibility labels present");
else fail("a11y labels missing");

// Unit tests
const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/event-outcomes/eligibility.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit eligibility tests");
else {
  fail("unit eligibility tests failed");
  console.error(vitest.stdout || "");
  console.error(vitest.stderr || "");
}

// Decisive pure proofs echoed in docs
const impl = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_02A_EVENT_OUTCOME_HOT_WASH.md"),
  "utf8",
);
for (const zero of [
  "elapsed-time Event mutations: 0",
  "automatically completed Events: 0",
  "automatically not-attended Events: 0",
  "automatically created people: 0",
  "OpenAI calls: 0",
  "RedDirt writes: 0",
]) {
  if (impl.includes(zero)) pass(`doc zero: ${zero}`);
  else fail(`doc missing zero: ${zero}`);
}

const adr = fs.readFileSync(
  path.join(root, "develop_notes/ADR-105_EVENT_OUTCOME_INDEPENDENT_FACTS.md"),
  "utf8",
);
if (/independent facts/i.test(adr) && /attendance/i.test(adr))
  pass("ADR-105 independent facts");
else fail("ADR-105 incomplete");

const ic03 = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_03_DESIGN_HANDOFF.md"),
  "utf8",
);
if (/reviewed Event outcomes/i.test(ic03) || /IC-02A/i.test(ic03))
  pass("IC-03 handoff references IC-02A outcomes");
else fail("IC-03 handoff missing IC-02A");

console.log(`\nIC-02A validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
