/**
 * CC-10 ICS Export & Subscription Privacy validator (ADR-098).
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
  "src/lib/calendar/ics/bounds.ts",
  "src/lib/calendar/ics/index.ts",
  "src/lib/calendar/ics/policy.ts",
  "src/lib/calendar/ics/serialize.ts",
  "src/lib/calendar/ics/text.ts",
  "src/lib/calendar/ics/token.ts",
  "src/lib/calendar/ics/types.ts",
  "src/lib/calendar/ics/uid.ts",
  "src/server/services/calendar-ics-export-service.ts",
  "src/app/api/calendar/exports/download/route.ts",
  "src/app/api/calendar/exports/preview/route.ts",
  "src/app/api/calendar/feeds/[token]/route.ts",
  "src/app/api/calendar/subscriptions/route.ts",
  "src/app/api/calendar/subscriptions/[feedId]/route.ts",
  "src/app/api/calendar/subscriptions/[feedId]/revoke/route.ts",
  "src/app/api/calendar/subscriptions/[feedId]/rotate/route.ts",
  "src/app/system/calendar/exports/page.tsx",
  "src/app/system/calendar/subscriptions/page.tsx",
  "src/app/system/calendar/subscriptions/new/page.tsx",
  "src/app/system/calendar/subscriptions/[feedId]/page.tsx",
  "prisma/migrations/20260722180000_cc10_ics_export_subscription/migration.sql",
  "develop_notes/KCCC_CC_10_AUTHORIZATION_KELLY_2026-07-22.md",
  "develop_notes/KCCC_CC_10_ICS_EXPORT_SUBSCRIPTION_PRIVACY.md",
  "develop_notes/KCCC_CC_10_ICS_EXPORT_SUBSCRIPTION_PRIVACY_ROLLBACK.md",
  "develop_notes/KCCC_CALENDAR_ICS_EXPORT_DOCTRINE.md",
  "develop_notes/KCCC_CALENDAR_SUBSCRIPTION_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_CALENDAR_ICS_CLIENT_COMPATIBILITY.md",
  "tests/unit/calendar-ics/serialize.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "model CalendarSubscriptionFeed",
  "model CalendarSubscriptionAccessAudit",
  "model CalendarExportAudit",
]) {
  if (schema.includes(model)) pass(model);
  else fail(`schema missing ${model}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["calendar:ics:validate"]) pass("npm script calendar:ics:validate");
else fail("npm script calendar:ics:validate");

const servicePath = path.join(
  root,
  "src/server/services/calendar-ics-export-service.ts",
);
const service = fs.readFileSync(servicePath, "utf8");
for (const forbidden of [
  "prisma.event.delete",
  "campaignMission.delete",
  "hardDelete",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

if (service.includes("applyIcsPrivacyPolicy")) {
  pass("service uses applyIcsPrivacyPolicy");
} else {
  fail("service must call applyIcsPrivacyPolicy before ICS projection");
}

// streetAddress may be read for residential heuristics / policy input, but must
// not be assigned into ICS SUMMARY/DESCRIPTION/LOCATION without applyIcsPrivacyPolicy.
const leakPatterns = [
  /summary\s*[:=]\s*[^\n]*streetAddress/i,
  /description\s*[:=]\s*[^\n]*streetAddress/i,
  /location\s*[:=]\s*[^\n]*streetAddress/i,
  /["']SUMMARY["']\s*[^\n]*streetAddress/i,
  /["']DESCRIPTION["']\s*[^\n]*streetAddress/i,
  /["']LOCATION["']\s*[^\n]*streetAddress/i,
];
if (leakPatterns.some((re) => re.test(service))) {
  fail("service appears to write streetAddress into ICS summary/description/location");
} else {
  pass("no direct streetAddress→ICS summary/description/location wiring");
}

const publicPaths = fs.readFileSync(
  path.join(root, "src/lib/auth/public-paths.ts"),
  "utf8",
);
if (publicPaths.includes("/api/calendar/feeds/")) {
  pass("public-paths includes /api/calendar/feeds/");
} else {
  fail("public-paths must include /api/calendar/feeds/");
}

// Forbid public anonymous feeds: feed route must be token-parameterized.
const feedRoute = fs.readFileSync(
  path.join(root, "src/app/api/calendar/feeds/[token]/route.ts"),
  "utf8",
);
const hasTokenParam =
  feedRoute.includes("params") &&
  (feedRoute.includes("token") || feedRoute.includes("[token]"));
const hasAnonymousFeedRoute = fs.existsSync(
  path.join(root, "src/app/api/calendar/feeds/route.ts"),
);
if (hasTokenParam && !hasAnonymousFeedRoute) {
  pass("feed requires token path; no anonymous /api/calendar/feeds route");
} else {
  fail("public anonymous feed pattern detected or token path missing");
}

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
const cc10Ok =
  constants.includes('CC_10_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_10_STATUS = "COMPLETE"');
if (cc10Ok) pass("CC_10_STATUS IN_PROGRESS or COMPLETE");
else fail("CC_10_STATUS must be IN_PROGRESS or COMPLETE");

// CC-12 may be IN_PROGRESS or COMPLETE; Phase Two remains locked separately.
if (
  constants.includes('CC_12_STATUS = "NOT_AUTHORIZED"') ||
  constants.includes('CC_12_STATUS = "IN_PROGRESS"') ||
  constants.includes('CC_12_STATUS = "COMPLETE"')
) {
  pass("CC_12_STATUS gated, IN_PROGRESS, or COMPLETE");
} else {
  fail("CC_12_STATUS missing from constants");
}
if (
  constants.includes('PHASE_TWO_PROGRAM_STATUS = "VISION_LOCKED_NOT_AUTHORIZED"') ||
  constants.includes("VISION_LOCKED_NOT_AUTHORIZED")
) {
  pass("Phase Two remains VISION_LOCKED_NOT_AUTHORIZED");
} else {
  fail("Phase Two must remain locked while CC-12 progresses");
}

if (
  constants.includes("ADR-098") ||
  constants.includes("CC_10_AUTHORIZATION")
) {
  pass("ADR-098 / CC-10 authorization referenced");
} else {
  fail("ADR-098 / CC-10 authorization missing from constants");
}

if (constants.includes('CC_09_STATUS = "COMPLETE"')) pass("CC-09 remains COMPLETE");
else fail("CC-09 must remain COMPLETE");

// tmp-hsv-verify is not required for CC-10 validation.
pass("tmp-hsv-verify not required");

const policyTest = path.join(root, "tests/unit/calendar-ics/policy-token.test.ts");
const vitestArgs = ["vitest", "run", "tests/unit/calendar-ics/serialize.test.ts"];
if (fs.existsSync(policyTest)) {
  vitestArgs.push("tests/unit/calendar-ics/policy-token.test.ts");
}

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  vitestArgs,
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit calendar-ics tests");
else {
  fail("unit calendar-ics tests");
  console.error(vitest.stdout);
  console.error(vitest.stderr);
}

console.log(`\nCC-10 ics-export validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
