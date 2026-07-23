/**
 * IC-01 Arkansas Campaign Geography Foundation validator (ADR-102).
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
  "data/geography/arkansas-counties-authority.json",
  "data/geography/arkansas-top250-places-planning.json",
  "data/geography/arkansas-geography-source-register.json",
  "src/lib/geography/normalize.ts",
  "src/lib/geography/reconcile.ts",
  "src/lib/geography/types.ts",
  "src/lib/geography/top250-definition.ts",
  "src/lib/geography/index.ts",
  "src/server/services/geography-foundation-service.ts",
  "scripts/seed-arkansas-geography-foundation.mjs",
  "prisma/migrations/20260723120000_ic01_arkansas_campaign_geography_foundation/migration.sql",
  "src/app/system/geography/page.tsx",
  "src/app/system/geography/counties/page.tsx",
  "src/app/system/geography/counties/[countyId]/page.tsx",
  "src/app/system/geography/places/page.tsx",
  "src/app/system/geography/places/[placeId]/page.tsx",
  "src/app/system/geography/regions/page.tsx",
  "src/app/system/geography/corridors/page.tsx",
  "src/app/system/geography/priorities/page.tsx",
  "src/app/system/geography/focus-areas/page.tsx",
  "src/app/system/geography/reconciliation/page.tsx",
  "src/app/system/geography/sources/page.tsx",
  "src/app/api/geography/dashboard/route.ts",
  "src/app/api/geography/counties/route.ts",
  "src/app/api/geography/counties/[countyId]/route.ts",
  "src/app/api/geography/places/route.ts",
  "src/app/api/geography/places/[placeId]/route.ts",
  "src/app/api/geography/regions/route.ts",
  "src/app/api/geography/corridors/route.ts",
  "src/app/api/geography/priorities/route.ts",
  "src/app/api/geography/focus-areas/route.ts",
  "src/app/api/geography/sources/route.ts",
  "src/app/api/geography/reconciliation/preview/route.ts",
  "src/app/api/geography/reconciliation/apply/route.ts",
  "tests/unit/geography/normalize.test.ts",
  "tests/unit/geography/reconcile.test.ts",
  "develop_notes/KCCC_IC_01_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_01_ARKANSAS_CAMPAIGN_GEOGRAPHY_FOUNDATION.md",
  "develop_notes/KCCC_IC_01_ARKANSAS_CAMPAIGN_GEOGRAPHY_FOUNDATION_ROLLBACK.md",
  "develop_notes/KCCC_IC_01_GEOGRAPHY_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_IC_01_GEOGRAPHY_SOURCE_REGISTER.md",
  "develop_notes/KCCC_ARKANSAS_GEOGRAPHY_DATA_DOCTRINE.md",
  "develop_notes/KCCC_IC_02_DESIGN_HANDOFF.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const counties = JSON.parse(
  fs.readFileSync(
    path.join(root, "data/geography/arkansas-counties-authority.json"),
    "utf8",
  ),
);
const places = JSON.parse(
  fs.readFileSync(
    path.join(root, "data/geography/arkansas-top250-places-planning.json"),
    "utf8",
  ),
);

if (counties.counties?.length === 75) pass("counties=75");
else fail(`counties=${counties.counties?.length}`);

if (places.places?.length === 250) pass("places=250");
else fail(`places=${places.places?.length}`);

const countyGeoids = counties.counties.map((c) => c.geoid);
const placeGeoids = places.places.map((p) => p.censusPlaceGeoid);
if (new Set(countyGeoids).size === 75) pass("unique county geoids");
else fail("duplicate county geoids");
if (new Set(placeGeoids).size === 250) pass("unique place geoids");
else fail("duplicate place geoids");

const fipsOk = counties.counties.every(
  (c) =>
    c.stateFips === "05" &&
    /^\d{5}$/.test(c.fipsCode) &&
    c.fipsCode.startsWith("05") &&
    c.geoid === c.fipsCode,
);
if (fipsOk) pass("county FIPS shape");
else fail("county FIPS shape invalid");

const ranks = places.places.map((p) => p.populationRank).sort((a, b) => a - b);
const ranksOk =
  ranks.length === 250 && ranks[0] === 1 && ranks[249] === 250;
if (ranksOk) pass("populationRank 1..250");
else fail("populationRank sequence invalid");

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const model of [
  "model GeographyPlaceAuthority",
  "model GeographyPlaceCounty",
  "model GeographyAlias",
  "model CampaignGeographyRegion",
  "model CampaignGeographyRegionMember",
  "model CampaignTravelCorridor",
  "model CampaignTravelCorridorNode",
  "model CampaignCountyPriority",
  "model CampaignFocusArea",
  "model CampaignFocusAreaGeography",
  "model MissionGeography",
  "model GeographySource",
  "model GeographyImportRun",
  "model GeographyReconciliationCandidate",
]) {
  if (schema.includes(model)) pass(model);
  else fail(`schema missing ${model}`);
}

for (const field of [
  "stateFips",
  "geoid",
  "normalizedName",
  "countySeat",
  "seatReviewState",
]) {
  if (schema.includes(field)) pass(`ArkansasCounty field ${field}`);
  else fail(`ArkansasCounty missing ${field}`);
}

const service = fs.readFileSync(
  path.join(root, "src/server/services/geography-foundation-service.ts"),
  "utf8",
);

for (const forbidden of [
  "prisma.event.delete",
  "prisma.event.update",
  "prisma.event.create",
  "prisma.campaignMission.delete",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
  "openai",
  "OpenAI",
  "mobilize",
  "reddirt",
  "RedDirt",
]) {
  if (service.toLowerCase().includes(forbidden.toLowerCase()) &&
      !["openai", "OpenAI", "mobilize", "reddirt", "RedDirt"].includes(forbidden)) {
    // handled below for case variants
  }
  if (new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(service) &&
      /prisma\.(event|campaignMission)\.(delete|update|create)/i.test(forbidden)) {
    fail(`service contains ${forbidden}`);
  } else if (/prisma\.(event|campaignMission)\.(delete|update|create)/i.test(forbidden)) {
    if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
    else pass(`service free of ${forbidden}`);
  }
}

for (const forbidden of [
  "prisma.event.delete",
  "prisma.event.update",
  "prisma.event.create",
  "prisma.campaignMission.delete",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

for (const bad of ["openai", "mobilize", "reddirt"]) {
  if (service.toLowerCase().includes(bad)) fail(`service mentions ${bad}`);
  else pass(`service free of ${bad}`);
}

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_01_AUTHORIZATION_ADR = "ADR-102"')) pass("ADR-102 constant");
else fail("ADR-102 constant missing");
if (constants.includes('IC_01_STATUS = "COMPLETE"')) pass("IC_01 COMPLETE");
else fail("IC_01_STATUS must be COMPLETE");
if (constants.includes('IC_02_STATUS = "NOT_AUTHORIZED"')) pass("IC_02 NOT_AUTHORIZED");
else fail("IC_02 must remain NOT_AUTHORIZED");
if (constants.includes('NEXT_AUTHORIZED_BUILD = "IC_02_NOT_AUTHORIZED"'))
  pass("NEXT_AUTHORIZED_BUILD IC_02_NOT_AUTHORIZED");
else fail("NEXT_AUTHORIZED_BUILD must be IC_02_NOT_AUTHORIZED");
if (constants.includes('PHASE_TWO_PROGRAM_STATUS = "IC_PHASE_AUTHORIZED"'))
  pass("IC_PHASE_AUTHORIZED");
else fail("PHASE_TWO_PROGRAM_STATUS must be IC_PHASE_AUTHORIZED");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["geography:foundation:seed"]) pass("npm geography:foundation:seed");
else fail("missing npm geography:foundation:seed");
if (pkg.scripts?.["geography:foundation:validate"])
  pass("npm geography:foundation:validate");
else fail("missing npm geography:foundation:validate");

const unit = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/run-with-h-drive-env.cjs"),
    "npx",
    "vitest",
    "run",
    "tests/unit/geography",
  ],
  { cwd: root, encoding: "utf8", env: process.env },
);
if (unit.status === 0) pass("unit tests geography");
else {
  fail("unit tests geography");
  console.error(unit.stdout);
  console.error(unit.stderr);
}

console.log(`\nIC-01 geography foundation: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
