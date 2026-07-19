/**
 * Step 7.1–7.5 structural gates.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function pass(msg) {
  console.log("PASS:", msg);
}
function fail(msg) {
  console.error("FAIL:", msg);
  failed += 1;
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const required = [
  ["7.1", "src/lib/missions/executive-command.ts"],
  ["7.2", "src/lib/missions/field-operations.ts"],
  ["7.3", "src/lib/missions/county-operations.ts"],
  ["7.4", "src/lib/missions/volunteer-operations.ts"],
  ["7.5", "src/lib/missions/communications-operations.ts"],
  ["7.5", "src/server/services/communications-operations-service.ts"],
  ["7.5", "src/server/services/communications-operations-ai.ts"],
  ["7.5", "src/app/api/command-summary/communications/route.ts"],
  ["7.5", "src/app/communications/page.tsx"],
  ["7.5", "src/components/communications/CommunicationsOperationsView.tsx"],
  ["7.5", "develop_notes/KCCC_STEP_07_5_COMMUNICATIONS_OPERATIONS.md"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const comms = read("src/lib/missions/communications-operations.ts");
if (
  comms.includes("buildCommunicationsOperationsHome") &&
  comms.includes("executiveFeed") &&
  comms.includes("countyFeed") &&
  comms.includes("fieldFeed") &&
  comms.includes("volunteerFeed") &&
  comms.includes("todaysMessage")
) {
  pass("7.5 communications contracts present");
} else {
  fail("7.5 communications contracts incomplete");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("communicationsFeed") && exec.includes("volunteerFeed")) {
  pass("7.5 Executive Command consumes communicationsFeed");
} else {
  fail("7.5 Executive Command missing communicationsFeed");
}

const execService = read("src/server/services/executive-command-service.ts");
if (
  execService.includes("buildCommunicationsOperationsHome") &&
  execService.includes("communicationsFeed")
) {
  pass("7.5 executive service wires communications");
} else {
  fail("7.5 executive service missing communications");
}

const fieldService = read("src/server/services/field-operations-service.ts");
if (fieldService.includes("communicationsFieldFeed")) {
  pass("7.5 field consumes communications feed");
} else {
  fail("7.5 field missing communications consume");
}

const countyService = read("src/server/services/county-operations-service.ts");
if (countyService.includes("communicationsFeed")) {
  pass("7.5 county consumes communications feed");
} else {
  fail("7.5 county missing communications consume");
}

const volService = read("src/server/services/volunteer-operations-service.ts");
if (volService.includes("communicationsConsume") || volService.includes("volunteerFeed")) {
  pass("7.5 volunteer consumes communications feed");
} else {
  fail("7.5 volunteer missing communications consume");
}

const view = read("src/components/communications/CommunicationsOperationsView.tsx");
for (const heading of [
  "Is everyone communicating the same campaign?",
  "Communications snapshot",
  "First-class Unknowns",
]) {
  if (view.includes(heading)) pass(`UI ${heading}`);
  else fail(`UI missing ${heading}`);
}

const ai = read("src/server/services/communications-operations-ai.ts");
if (
  ai.includes('feature: "communications-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.5 AI audit attribution present");
} else {
  fail("7.5 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/communications")')) {
  pass("/communications maps to More");
} else {
  fail("/communications nav mapping missing");
}

const charter = read("develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md");
if (
  charter.includes("Every operational artifact has one owner") &&
  charter.includes("Unknown is a first-class operational state")
) {
  pass("artifact-owner + Unknown principles locked");
} else {
  fail("charter principles incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.communications_operations_enabled ||
  build.step7_increment === "7.5-communications-operations"
) {
  pass("7.5 increment tracked");
} else {
  fail("7.5 increment not tracked");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1–7.5 structural validation passed.");
