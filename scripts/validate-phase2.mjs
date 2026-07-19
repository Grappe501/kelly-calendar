/**
 * Phase 2 structural gates (2.1 Candidate + 2.2 Debate & Media).
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
  ["2.1", "src/lib/missions/candidate-operations.ts"],
  ["2.1", "src/app/candidate/page.tsx"],
  ["2.2", "src/lib/missions/debate-media-operations.ts"],
  ["2.2", "src/server/services/debate-media-operations-service.ts"],
  ["2.2", "src/server/services/debate-media-operations-ai.ts"],
  ["2.2", "src/app/api/command-summary/debate-media/route.ts"],
  ["2.2", "src/app/debate-media/page.tsx"],
  ["2.2", "src/components/debate-media/DebateMediaOperationsView.tsx"],
  ["2.2", "develop_notes/KCCC_PHASE_02_2_DEBATE_MEDIA_OPERATIONS.md"],
  ["2.2", "tests/unit/missions/debate-media-operations.test.ts"],
];
for (const [label, rel] of required) {
  if (exists(rel)) pass(`${label} ${rel}`);
  else fail(`${label} missing ${rel}`);
}

const debate = read("src/lib/missions/debate-media-operations.ts");
if (
  debate.includes("buildDebateMediaOperationsHome") &&
  debate.includes("Are we prepared for every public communication") &&
  debate.includes("not a parallel communications system") &&
  debate.includes("candidateFeed") &&
  debate.includes("communicationsFeed") &&
  debate.includes("intelligenceFeed") &&
  debate.includes("combineOperationalReadiness")
) {
  pass("2.2 debate-media contracts present");
} else {
  fail("2.2 debate-media contracts missing");
}

const candidate = read("src/lib/missions/candidate-operations.ts");
if (candidate.includes("debateMediaConsume") || candidate.includes("debateMediaFeed")) {
  pass("2.2 Candidate consumes Debate & Media");
} else {
  fail("2.2 Candidate missing debate/media consume");
}

const comms = read("src/lib/missions/communications-operations.ts");
if (comms.includes("debateMediaConsume")) {
  pass("2.2 Communications consumes Debate & Media");
} else {
  fail("2.2 Communications missing debateMediaConsume");
}

const intel = read("src/lib/missions/intelligence-operations.ts");
if (
  intel.includes("debateMediaFeed") &&
  intel.includes("MEDIA_PREPARATION") &&
  intel.includes("debate_media")
) {
  pass("2.2 Intelligence consumes Debate & Media");
} else {
  fail("2.2 Intelligence missing debate/media feed");
}

const exec = read("src/lib/missions/executive-command.ts");
if (exec.includes("debateMediaFeed")) {
  pass("2.2 Executive consumes debateMediaFeed");
} else {
  fail("2.2 Executive missing debateMediaFeed");
}

const view = read("src/components/debate-media/DebateMediaOperationsView.tsx");
for (const phrase of [
  "Are we prepared for every public communication",
  "Media preparedness",
  "Media calendar",
  "First-class Unknowns",
  "not a parallel communications system",
]) {
  if (view.includes(phrase)) pass(`UI ${phrase}`);
  else fail(`UI missing ${phrase}`);
}

const ai = read("src/server/services/debate-media-operations-ai.ts");
if (
  ai.includes('feature: "debate-media-operations"') &&
  ai.includes('application: "kelly-calendar"')
) {
  pass("2.2 AI audit attribution present");
} else {
  fail("2.2 AI audit attribution missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes("/debate-media")) pass("/debate-media maps to More");
else fail("/debate-media nav prefix missing");

const charter = read("develop_notes/KCCC_PHASE_02_CHARTER.md");
if (
  charter.includes("orchestrate Phase 1") &&
  charter.includes("assemble operational context") &&
  charter.includes("ACCEPTED / COMPLETE")
) {
  pass("Phase 2 doctrine + 2.1 ACCEPT locked");
} else {
  fail("Phase 2 charter incomplete");
}

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (build.candidate_operations_accepted === true) {
  pass("2.1 ACCEPTED");
} else {
  fail("2.1 not marked accepted");
}

if (
  build.phase_2_increment === "2.2-debate-media-operations" ||
  build.debate_media_operations_enabled === true
) {
  pass("2.2 increment tracked");
} else {
  fail("2.2 increment not tracked");
}

if (failed) {
  console.error(`Phase 2 validation failed (${failed})`);
  process.exit(1);
}
console.log("Phase 2 structural validation passed (2.1 ACCEPTED, 2.2 OPEN).");
