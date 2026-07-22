/**
 * CC-08 Advanced Day/Week Scheduling Workspace validator (ADR-096).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  "src/lib/calendar/scheduling/types.ts",
  "src/lib/calendar/scheduling/preferences.ts",
  "src/lib/calendar/scheduling/pack-lanes.ts",
  "src/lib/calendar/scheduling/time-scale.ts",
  "src/lib/calendar/scheduling/layout-day.ts",
  "src/lib/calendar/scheduling/layout-week.ts",
  "src/lib/calendar/scheduling/index.ts",
  "src/components/calendar/scheduling/DayTimeGrid.tsx",
  "src/components/calendar/scheduling/SchedulingDayWorkspace.tsx",
  "src/components/calendar/scheduling/SchedulingWeekWorkspace.tsx",
  "src/components/calendar/DayView.tsx",
  "src/components/calendar/WeekView.tsx",
  "tests/unit/calendar-scheduling/layout.test.ts",
  "develop_notes/KCCC_CC_08_AUTHORIZATION_KELLY_2026-07-22.md",
  "develop_notes/KCCC_CC_08_ADVANCED_DAY_WEEK_SCHEDULING_WORKSPACE.md",
  "develop_notes/KCCC_CC_08_ADVANCED_DAY_WEEK_SCHEDULING_WORKSPACE_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_SCHEDULING_WORKSPACE_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_DAY_WEEK_OPERATOR_GUIDE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:scheduling-workspace:validate"]) {
  pass("npm script calendar:scheduling-workspace:validate");
} else {
  fail("npm script calendar:scheduling-workspace:validate");
}

function codeOnly(src) {
  return src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");
}

const FORBIDDEN_LAYOUT = [
  "prisma.event.update",
  "prisma.event.delete",
  "prisma.event.create",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
  "recomputeConflictsForRange",
  "recomputeConflictsForEvent",
  "@dnd-kit",
  "react-beautiful-dnd",
  "react-dnd",
  "onDragStart",
  "onDragEnd",
  "draggable",
];

for (const rel of [
  "src/lib/calendar/scheduling/layout-day.ts",
  "src/lib/calendar/scheduling/layout-week.ts",
  "src/lib/calendar/scheduling/pack-lanes.ts",
  "src/components/calendar/scheduling/DayTimeGrid.tsx",
  "src/components/calendar/scheduling/SchedulingDayWorkspace.tsx",
  "src/components/calendar/scheduling/SchedulingWeekWorkspace.tsx",
]) {
  const src = codeOnly(fs.readFileSync(path.join(root, rel), "utf8"));
  for (const token of FORBIDDEN_LAYOUT) {
    if (src.includes(token)) fail(`${rel} must not contain ${token}`);
    else pass(`${rel} free of ${token}`);
  }
}

const dayView = fs.readFileSync(
  path.join(root, "src/components/calendar/DayView.tsx"),
  "utf8",
);
if (dayView.includes("SchedulingDayWorkspace")) pass("DayView uses SchedulingDayWorkspace");
else fail("DayView must use SchedulingDayWorkspace");

const weekView = fs.readFileSync(
  path.join(root, "src/components/calendar/WeekView.tsx"),
  "utf8",
);
if (weekView.includes("SchedulingWeekWorkspace")) pass("WeekView uses SchedulingWeekWorkspace");
else fail("WeekView must use SchedulingWeekWorkspace");

const dateNav = fs.readFileSync(
  path.join(root, "src/components/calendar/CalendarDateNav.tsx"),
  "utf8",
);
if (dateNav.includes("layoutVisibleStartHour") && dateNav.includes("savedViewId")) {
  pass("CalendarDateNav preserves CC-07 + layout query keys");
} else {
  fail("CalendarDateNav must preserve query/layout keys");
}

const page = fs.readFileSync(path.join(root, "src/app/calendar/page.tsx"), "utf8");
if (
  page.includes("allowedEventIds") &&
  page.includes("schedule.filter") &&
  page.includes("day.events.filter")
) {
  pass("calendar page filters Day/Week by CC-07 allowedEventIds");
} else {
  fail("calendar page must filter Day/Week with allowedEventIds");
}

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/calendar-scheduling/layout.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-scheduling layout tests");
else {
  fail("unit calendar-scheduling layout tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

console.log(`\nCC-08 scheduling-workspace validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
