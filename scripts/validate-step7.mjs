/**
 * Step 7.1 — Executive Command structural gates.
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

const files = [
  "src/lib/missions/executive-command.ts",
  "src/server/services/executive-command-service.ts",
  "src/server/services/executive-command-ai.ts",
  "src/app/api/command-summary/command/route.ts",
  "src/app/command/page.tsx",
  "src/components/command/ExecutiveCommandView.tsx",
  "develop_notes/KCCC_STEP_07_1_EXECUTIVE_COMMAND.md",
];
for (const rel of files) {
  if (exists(rel)) pass(rel);
  else fail(`missing ${rel}`);
}

const lib = read("src/lib/missions/executive-command.ts");
if (
  lib.includes("buildExecutiveCommand") &&
  lib.includes("buildDeterministicExecutiveBriefing") &&
  lib.includes("volunteersAssigned") &&
  lib.includes("executiveInbox")
) {
  pass("7.1 pure Executive Command builder present");
} else {
  fail("7.1 Executive Command builder incomplete");
}

const view = read("src/components/command/ExecutiveCommandView.tsx");
for (const heading of [
  "Today’s Campaign",
  "Campaign Health",
  "Executive Inbox",
  "Geographic Operations",
  "Campaign Rhythm",
  "Executive Briefing",
]) {
  if (view.includes(heading)) pass(`UI section ${heading}`);
  else fail(`UI missing ${heading}`);
}

if (view.includes("Volunteers (unknown)")) {
  pass("7.1 honest unknown for volunteers");
} else {
  fail("7.1 must not invent volunteer totals");
}

const ai = read("src/server/services/executive-command-ai.ts");
if (
  ai.includes('feature: "executive-command"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("7.1 AI audit attribution present");
} else {
  fail("7.1 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/command")')) {
  pass("/command maps to More nav");
} else {
  fail("/command nav mapping missing");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.current_step === "KCCC-STEP-07-CAMPAIGN-OPERATIONS" ||
  build.step7_status === "open"
) {
  pass("Step 7 open");
} else {
  fail("Step 7 not open");
}

if (build.step7_increment === "7.1-executive-command" || build.executive_command_enabled) {
  pass("7.1 increment tracked");
} else {
  fail("7.1 increment not tracked in build_state");
}

if (failed) {
  console.error(`Step 7 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 7.1 structural validation passed.");
