/**
 * Ensure Prisma schema keeps a single canonical Event model.
 * Fails if competing top-level event entity names appear.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const canonicalPath = path.join(root, "src", "lib", "calendar", "canonical-event.ts");

const FORBIDDEN = [
  "CalendarEvent",
  "CampaignEvent",
  "MissionEvent",
  "ScheduleEvent",
  "MeetingEvent",
  "OpsEvent",
  "FieldEvent",
];

if (!fs.existsSync(schemaPath)) {
  console.error("FAIL: prisma/schema.prisma missing");
  process.exit(1);
}
if (!fs.existsSync(canonicalPath)) {
  console.error("FAIL: src/lib/calendar/canonical-event.ts missing");
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, "utf8");
const modelNames = [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1]);

if (!modelNames.includes("Event")) {
  console.error("FAIL: canonical model Event missing from schema");
  process.exit(1);
}
console.log("PASS: canonical Prisma model Event present");

let failed = false;
for (const name of FORBIDDEN) {
  if (modelNames.includes(name)) {
    console.error(`FAIL: forbidden competing model ${name}`);
    failed = true;
  } else {
    console.log(`PASS: no competing model ${name}`);
  }
}

if (!/model Event\s*\{/.test(schema)) {
  console.error("FAIL: Event model block not found");
  failed = true;
}

if (!schema.includes("campaignMission")) {
  console.error("FAIL: Event.campaignMission relation missing (Mission must hang off Event)");
  failed = true;
} else {
  console.log("PASS: CampaignMission attaches to Event (not a parallel Event)");
}

const canonicalSrc = fs.readFileSync(canonicalPath, "utf8");
if (!canonicalSrc.includes("FORBIDDEN_COMPETING_EVENT_MODEL_NAMES")) {
  console.error("FAIL: canonical-event.ts missing forbidden name lock");
  failed = true;
} else {
  console.log("PASS: canonical-event.ts lock present");
}

if (!canonicalSrc.includes("deriveEventOperationalLifecycle")) {
  console.error("FAIL: lifecycle derivation missing");
  failed = true;
} else {
  console.log("PASS: operational lifecycle derivation present");
}

const archDoc = path.join(
  root,
  "develop_notes",
  "KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md",
);
if (!fs.existsSync(archDoc)) {
  console.error("FAIL: architecture document missing");
  failed = true;
} else {
  console.log("PASS: architecture document present");
}

if (failed) process.exit(1);
console.log("Canonical Event validation passed.");
