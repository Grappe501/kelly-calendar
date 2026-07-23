/**
 * CC-12 Mobile / Print / A11y validator (ADR-100).
 * Presentation/usability only — no CalendarPrint* schema; no Event mutation.
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
  "src/lib/calendar/print/types.ts",
  "src/lib/calendar/print/policy.ts",
  "src/lib/calendar/print/sort.ts",
  "src/lib/calendar/print/index.ts",
  "src/server/services/calendar-print-service.ts",
  "src/app/system/calendar/print/preview/page.tsx",
  "src/app/system/calendar/print/day/[date]/page.tsx",
  "src/app/system/calendar/print/week/[date]/page.tsx",
  "src/app/system/calendar/print/agenda/page.tsx",
  "src/components/calendar/CalendarPrintLink.tsx",
  "src/components/calendar/CalendarPrintButton.tsx",
  "src/components/calendar/MobileAgendaFallbackLink.tsx",
  "tests/unit/calendar-print/policy.test.ts",
  "develop_notes/KCCC_CC_12_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_CC_12_MOBILE_PRINT_ACCESSIBILITY.md",
  "develop_notes/KCCC_CC_12_MOBILE_PRINT_ACCESSIBILITY_ROLLBACK.md",
  "develop_notes/KCCC_CC_12_DESIGN_HANDOFF.md",
  "develop_notes/KCCC_CALENDAR_MOBILE_USABILITY_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_PRINT_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_PRINT_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_CALENDAR_ACCESSIBILITY_CONFORMANCE_REPORT.md",
  "develop_notes/KCCC_CALENDAR_COMPLETION_TECHNICAL_CLOSEOUT.md",
  "develop_notes/KCCC_POST_CC12_HUMAN_USABILITY_GATE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (/model\s+CalendarPrint\w*/.test(schema)) {
  fail("schema must not declare CalendarPrint* models (prefer no migration)");
} else {
  pass("schema has no CalendarPrint* model");
}

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (
  constants.includes('CC_12_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_12_STATUS = "COMPLETE"')
) {
  pass("CC_12_STATUS IN_PROGRESS or COMPLETE");
} else {
  fail("CC_12_STATUS missing IN_PROGRESS/COMPLETE");
}

if (constants.includes("ADR-100") || constants.includes("CC_12_AUTHORIZATION")) {
  pass("ADR-100 / CC-12 authorization referenced");
} else {
  fail("ADR-100 / CC-12 authorization missing from constants");
}

if (
  constants.includes('NEXT_AUTHORIZED_BUILD = "CC_12"') ||
  constants.includes('NEXT_AUTHORIZED_BUILD = "NONE"') ||
  constants.includes('NEXT_AUTHORIZED_BUILD = "POST_CC12_HUMAN_USABILITY_GATE"')
) {
  pass("NEXT_AUTHORIZED_BUILD references CC_12 program or post-CC12 gate");
} else {
  fail("NEXT_AUTHORIZED_BUILD not CC_12");
}

const adrJson = fs.readFileSync(
  path.join(root, "data/architecture_decisions.json"),
  "utf8",
);
if (adrJson.includes('"id": "ADR-100"') || adrJson.includes('"id":"ADR-100"')) {
  pass("ADR-100 present in architecture_decisions.json");
} else {
  fail("ADR-100 missing from architecture_decisions.json");
}

const service = fs.readFileSync(
  path.join(root, "src/server/services/calendar-print-service.ts"),
  "utf8",
);
for (const forbidden of [
  "prisma.event.delete",
  "prisma.event.update",
  "prisma.event.create",
  "prisma.campaignMission.delete",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
  "hardDelete",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

const policy = fs.readFileSync(
  path.join(root, "src/lib/calendar/print/policy.ts"),
  "utf8",
);
const printTypes = fs.readFileSync(
  path.join(root, "src/lib/calendar/print/types.ts"),
  "utf8",
);
if (/streetAddress/.test(printTypes)) {
  fail("PrintEventRow types must not include streetAddress");
} else {
  pass("print types exclude streetAddress");
}
// Output construction must never assign streetAddress (input type may mention it).
const policyWithoutInput = policy.replace(
  /export type PrintPolicyEventInput[\s\S]*?\n\};/,
  "",
);
const policyCode = policyWithoutInput
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
if (/\bstreetAddress\s*[:=]/.test(policyCode)) {
  fail("print policy assigns or emits streetAddress in output fields");
} else {
  pass("print policy never includes streetAddress in output fields");
}

const globals = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
if (globals.includes("@media print") && globals.includes("calendar-print-sheet")) {
  pass("globals @media print calendar-print-sheet");
} else {
  fail("globals missing @media print calendar-print-sheet");
}
if (globals.includes("prefers-reduced-motion")) {
  pass("globals prefers-reduced-motion");
} else {
  fail("globals missing prefers-reduced-motion");
}
if (globals.includes(".sr-only")) pass("sr-only utility");
else fail("missing .sr-only");
if (globals.includes(".touch-target")) pass("touch-target utility");
else fail("missing .touch-target");
if (globals.includes("mobile-week-day-selector") || globals.includes("sched-week-day-selector")) {
  pass("mobile week day-selector class present");
} else {
  fail("missing mobile week day-selector class");
}

const manifestPath = path.join(root, "public/manifest.webmanifest");
const manifest = fs.readFileSync(manifestPath, "utf8");
if (/gcm_sender_id|"push"/i.test(manifest)) {
  fail("manifest.webmanifest must not include gcm_sender_id / push");
} else {
  pass("manifest.webmanifest free of gcm_sender_id / push");
}

const publicPaths = fs.readFileSync(
  path.join(root, "src/lib/auth/public-paths.ts"),
  "utf8",
);
if (
  publicPaths.includes("/system/calendar/print") ||
  publicPaths.includes("/calendar/print")
) {
  fail("public-paths must not make print routes public");
} else {
  pass("public-paths does not expose print routes");
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:mobile-print-a11y:validate"]) {
  pass("npm script calendar:mobile-print-a11y:validate");
} else {
  fail("npm script calendar:mobile-print-a11y:validate");
}

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/calendar-print"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-print tests");
else {
  fail("unit calendar-print tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

console.log(`\nCC-12 mobile/print/a11y validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
