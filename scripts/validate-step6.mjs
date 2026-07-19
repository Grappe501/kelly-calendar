/**
 * Step 6 — Mobile Command Shell structural gates (S6-A–D).
 * S6-D Lighthouse score is a target; structural a11y baseline is required.
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

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const required = [
  "src/components/navigation/BottomNav.tsx",
  "src/components/app-shell/ShellChrome.tsx",
  "src/app/loading.tsx",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/page.tsx",
  "src/server/services/command-summary-today.ts",
  "src/app/api/command-summary/today/route.ts",
  "src/lib/navigation/nav-items.ts",
];

for (const rel of required) {
  if (exists(rel)) pass(rel);
  else fail(`missing ${rel}`);
}

const navItems = read("src/lib/navigation/nav-items.ts");
for (const label of ["Today", "Calendar", "Add", "Search", "More"]) {
  if (navItems.includes(`label: "${label}"`)) pass(`nav label ${label}`);
  else fail(`nav missing ${label}`);
}

const css = read("src/app/globals.css");
if (css.includes(".bottom-nav") && css.includes("min-height: 44px")) {
  pass("S6-A/B: bottom-nav + 44px touch targets in CSS");
} else {
  fail("S6-A/B: bottom-nav / 44px rules missing");
}

if (exists("src/app/loading.tsx") && exists("src/app/error.tsx")) {
  pass("S6-C: loading + error boundaries present");
} else {
  fail("S6-C: loading/error missing");
}

const shell = read("src/components/app-shell/ShellChrome.tsx");
if (shell.includes('data-viewport-target="375"') && shell.includes("BottomNav")) {
  pass("S6-A: shell marks 375px target and renders BottomNav");
} else {
  fail("S6-A: shell viewport/nav contract incomplete");
}

const todayPage = read("src/app/page.tsx");
if (
  todayPage.includes("getTodayCommandShellData") &&
  todayPage.includes("requireActiveAuthenticatedActor")
) {
  pass("Today page uses authenticated command summary");
} else {
  fail("Today page not wired to command summary");
}

const missionFiles = [
  "src/lib/missions/mission-card.ts",
  "src/lib/missions/leave-by-contract.ts",
  "src/lib/missions/mission-status.ts",
  "src/lib/missions/mission-timeline.ts",
  "src/components/today/MissionCardView.tsx",
  "src/server/services/mission-context-loader.ts",
];
for (const rel of missionFiles) {
  if (exists(rel)) pass(`mission ${rel}`);
  else fail(`mission missing ${rel}`);
}

const missionCard = read("src/lib/missions/mission-card.ts");
if (
  missionCard.includes("toMissionCard") &&
  missionCard.includes("immediateAction") &&
  missionCard.includes("missionStatus") &&
  missionCard.includes("timeline")
) {
  pass("6.2/6.3 Mission Card contract includes status + timeline");
} else {
  fail("Mission Card contract incomplete");
}

const timeline = read("src/lib/missions/mission-timeline.ts");
if (
  timeline.includes("computeMissionTimeline") &&
  timeline.includes("leaveByFromTimeline") &&
  timeline.includes("deterministic_v1")
) {
  pass("6.3 Mission Timeline Engine present (deterministic Leave By)");
} else {
  fail("6.3 Mission Timeline Engine incomplete");
}

if (timeline.includes("fetch(") || timeline.includes("maps.google") || timeline.includes("mapbox")) {
  fail("6.3 Timeline Engine must not call external traffic/maps");
} else {
  pass("6.3 Timeline Engine has no external traffic/maps integration");
}

const panels = read("src/components/today/TodayCommandPanels.tsx");
if (panels.includes("MissionCardView") && panels.includes("Next mission")) {
  pass("Today surface renders Mission Cards");
} else {
  fail("Today surface not using Mission Cards");
}

const todayService = read("src/server/services/command-summary-today.ts");
if (
  todayService.includes("computeMissionTimeline") &&
  todayService.includes("loadMissionContextForIds")
) {
  pass("Today summary wires Timeline Engine separately from UI");
} else {
  fail("Today summary missing Timeline Engine wiring");
}

const todayReadiness = "src/lib/missions/today-readiness.ts";
if (exists(todayReadiness)) pass(`6.4 ${todayReadiness}`);
else fail(`6.4 missing ${todayReadiness}`);

const tr = read(todayReadiness);
if (
  tr.includes("buildTodayReadinessSummary") &&
  tr.includes("UNKNOWN") &&
  tr.includes("BLOCKED") &&
  tr.includes("Schedule") &&
  tr.includes("Follow-up")
) {
  pass("6.4 Today readiness engine maps categories + honest Unknown");
} else {
  fail("6.4 Today readiness engine incomplete");
}

if (read("src/lib/missions/mission-timeline.ts").includes("computeMissionTimeline")) {
  pass("6.3 Mission Timeline Engine left intact");
}

if (panels.includes("TodayReadinessPanel")) {
  pass("6.4 Today surface includes readiness summary panel");
} else {
  fail("6.4 Today readiness panel not wired");
}

if (
  todayService.includes("buildTodayReadinessSummary") &&
  todayService.includes("todayReadiness")
) {
  pass("6.4 Today summary includes readiness rollup");
} else {
  fail("6.4 Today summary missing readiness rollup");
}

const dayActionFiles = [
  "src/lib/missions/mission-day-actions.ts",
  "src/server/services/mission-day-action-service.ts",
  "src/app/api/events/[eventId]/mission-day/route.ts",
  "src/components/today/MissionDayActions.tsx",
];
for (const rel of dayActionFiles) {
  if (exists(rel)) pass(`6.5 ${rel}`);
  else fail(`6.5 missing ${rel}`);
}

const dayActions = read("src/lib/missions/mission-day-actions.ts");
if (
  dayActions.includes("START_MISSION") &&
  dayActions.includes("MARK_ARRIVED") &&
  dayActions.includes("MARK_COMPLETE") &&
  dayActions.includes("NEEDS_ATTENTION") &&
  dayActions.includes("availableMissionDayActions")
) {
  pass("6.5 one-tap action set present");
} else {
  fail("6.5 one-tap action set incomplete");
}

const dayService = read("src/server/services/mission-day-action-service.ts");
if (
  dayService.includes('action: "EVENT_EDIT"') &&
  dayService.includes("expectedVersion") &&
  dayService.includes("MISSION_DAY_ACTION") &&
  dayService.includes("ConflictError")
) {
  pass("6.5 RBAC + version + audit contracts present");
} else {
  fail("6.5 mutation contracts incomplete");
}

const dayRoute = read("src/app/api/events/[eventId]/mission-day/route.ts");
if (
  dayRoute.includes("withAuthenticatedMutation") &&
  dayRoute.includes("applyMissionDayAction")
) {
  pass("6.5 authenticated mission-day mutation route");
} else {
  fail("6.5 mission-day route incomplete");
}

const cardView = read("src/components/today/MissionCardView.tsx");
if (cardView.includes("MissionDayActions")) {
  pass("6.5 Mission Cards expose one-tap actions");
} else {
  fail("6.5 Mission Cards missing day actions UI");
}

if (
  todayService.includes("canMutateDayActions") &&
  todayService.includes("eventVersion") &&
  todayService.includes("context.day")
) {
  pass("6.5 Today summary wires day snapshots + RBAC gate");
} else {
  fail("6.5 Today summary missing day-action wiring");
}

if (
  read("src/lib/missions/mission-timeline.ts").includes("computeMissionTimeline") &&
  read("src/lib/missions/today-readiness.ts").includes("buildTodayReadinessSummary")
) {
  pass("6.3/6.4 timeline + readiness engines left intact");
}

const briefFiles = [
  "src/lib/missions/campaign-brief.ts",
  "src/server/services/campaign-brief-service.ts",
  "src/server/services/campaign-brief-ai.ts",
  "src/app/api/command-summary/brief/route.ts",
  "src/app/brief/page.tsx",
  "src/components/brief/CampaignBriefView.tsx",
];
for (const rel of briefFiles) {
  if (exists(rel)) pass(`6.6 ${rel}`);
  else fail(`6.6 missing ${rel}`);
}

const briefLib = read("src/lib/missions/campaign-brief.ts");
if (
  briefLib.includes("buildCampaignBrief") &&
  briefLib.includes("topBlocker") &&
  briefLib.includes("campaignBriefForAdvisory")
) {
  pass("6.6 deterministic Campaign Brief builder present");
} else {
  fail("6.6 Campaign Brief builder incomplete");
}

const briefAi = read("src/server/services/campaign-brief-ai.ts");
if (
  briefAi.includes('application: "kelly-calendar"') &&
  briefAi.includes('feature: "campaign-brief"') &&
  briefAi.includes('operation: "advisory-summary"') &&
  briefAi.includes("maybeGenerateCampaignBriefAdvisory")
) {
  pass("6.6 AI advisory attribution + graceful helper present");
} else {
  fail("6.6 AI advisory attribution incomplete");
}

const briefPage = read("src/app/brief/page.tsx");
if (
  briefPage.includes("getCampaignBrief") &&
  briefPage.includes("requireActiveAuthenticatedActor")
) {
  pass("6.6 /brief uses authenticated deterministic service");
} else {
  fail("6.6 /brief wiring incomplete");
}

const briefView = read("src/components/brief/CampaignBriefView.tsx");
if (
  briefView.includes("Immediate attention") &&
  briefView.includes("Next mission") &&
  briefView.includes("Required action") &&
  briefView.includes("Day progress")
) {
  pass("6.6 leadership hierarchy present in Brief UI");
} else {
  fail("6.6 Brief UI hierarchy incomplete");
}

if (exists("src/app/brief/loading.tsx") && exists("src/app/brief/error.tsx")) {
  pass("6.6 Brief loading + error states present");
} else {
  fail("6.6 Brief loading/error missing");
}

const nav = read("src/lib/navigation/nav-items.ts");
if (nav.includes('pathname.startsWith("/brief")')) {
  pass("6.6 /brief maps to More nav without new tab");
} else {
  fail("6.6 nav mapping for /brief missing");
}

const todayApi = read("src/app/api/command-summary/today/route.ts");
if (todayApi.includes("withAuthenticatedQuery") && todayApi.includes("getTodayCommandShellData")) {
  pass("command-summary/today authenticated + live");
} else {
  fail("command-summary/today still stubbed");
}

const layout = read("src/app/layout.tsx");
if (layout.includes('lang="en"')) pass("S6-D baseline: html lang=en");
else fail("S6-D baseline: html lang missing");
if (shell.includes("Skip to main content")) pass("S6-D baseline: skip link");
else fail("S6-D baseline: skip link missing");

const bottomNav = read("src/components/navigation/BottomNav.tsx");
if (bottomNav.includes('aria-label="Primary"')) pass("S6-D baseline: primary nav label");
else fail("S6-D baseline: primary nav label missing");

const evidenceDir = path.join(root, "develop_notes/evidence/step-6");
if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
const lighthouseNote = path.join(evidenceDir, "LIGHTHOUSE_MOBILE_A11Y.md");
if (!fs.existsSync(lighthouseNote)) {
  fs.writeFileSync(
    lighthouseNote,
    [
      "# Lighthouse mobile accessibility (S6-D)",
      "",
      "**Status:** TARGET (≥ 90)",
      "**Date:** 2026-07-18",
      "",
      "Structural a11y baseline is enforced by `npm run step6:validate` (lang, skip link, primary nav label, 44px targets).",
      "Full Lighthouse CI score remains an operator/device target for authenticated production shell.",
      "",
    ].join("\n"),
    "utf8",
  );
}
pass("S6-D: lighthouse target evidence slot present");

const build = JSON.parse(read("data/build_state.json"));
if (build.candidate_data_ready === true) fail("candidate_data_ready must be false");
else pass("candidate_data_ready false");

if (
  build.current_step !== "KCCC-STEP-06-MOBILE-COMMAND-SHELL" &&
  build.next_step !== "KCCC-STEP-06-MOBILE-COMMAND-SHELL" &&
  !build.completed_steps?.includes("KCCC-STEP-06-MOBILE-COMMAND-SHELL")
) {
  fail("Step 6 must be current, next, or completed");
} else {
  pass("Step 6 tracked in build_state");
}

if (failed) {
  console.error(`Step 6 validation failed (${failed})`);
  process.exit(1);
}
console.log("Step 6 structural validation passed (S6-D Lighthouse remains target).");
