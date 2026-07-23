/**
 * IC-02 RedDirt Read Integration validator (ADR-104).
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
  "src/features/reddirt-integration/docs-revision.ts",
  "src/features/reddirt-integration/config.ts",
  "src/features/reddirt-integration/privacy-allowlist.ts",
  "src/features/reddirt-integration/normalize.ts",
  "src/features/reddirt-integration/geography-reconcile.ts",
  "src/features/reddirt-integration/transport.ts",
  "src/features/reddirt-integration/adapter.ts",
  "src/features/reddirt-integration/fixture-reader.ts",
  "src/features/reddirt-integration/export-parse.ts",
  "src/features/reddirt-integration/redact.ts",
  "src/features/reddirt-integration/types.ts",
  "src/features/reddirt-integration/index.ts",
  "src/features/reddirt-integration/fixtures/strategic-geography-sample.json",
  "src/server/services/reddirt-integration-service.ts",
  "src/server/repositories/reddirt-integration-repository.ts",
  "src/app/api/integrations/reddirt/status/route.ts",
  "src/app/api/integrations/reddirt/verify/route.ts",
  "src/app/api/integrations/reddirt/dry-run/route.ts",
  "src/app/api/integrations/reddirt/runs/route.ts",
  "src/app/api/integrations/reddirt/runs/[id]/route.ts",
  "src/app/api/integrations/reddirt/runs/[id]/apply/route.ts",
  "src/app/api/integrations/reddirt/policy/route.ts",
  "src/app/api/integrations/reddirt/geography/route.ts",
  "src/app/api/integrations/reddirt/import/preview/route.ts",
  "src/app/system/integrations/reddirt/page.tsx",
  "src/app/system/integrations/reddirt/runs/page.tsx",
  "src/app/system/integrations/reddirt/runs/[runId]/page.tsx",
  "src/app/system/integrations/reddirt/reconciliation/page.tsx",
  "src/app/system/integrations/reddirt/geography/page.tsx",
  "src/app/system/integrations/reddirt/policy/page.tsx",
  "prisma/migrations/20260723140000_ic02_reddirt_read_integration/migration.sql",
  "tests/unit/reddirt/privacy.test.ts",
  "tests/unit/reddirt/normalize.test.ts",
  "tests/unit/reddirt/reconcile.test.ts",
  "tests/unit/reddirt/idempotent-apply.test.ts",
  "tests/unit/reddirt/transport-config.test.ts",
  "develop_notes/KCCC_IC_02_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_02_REDDIRT_READ_INTEGRATION.md",
  "develop_notes/KCCC_IC_02_REDDIRT_READ_INTEGRATION_ROLLBACK.md",
  "develop_notes/KCCC_IC_02_REDDIRT_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_IC_02_REDDIRT_DATA_PRIVACY_POLICY.md",
  "develop_notes/KCCC_IC_03_DESIGN_HANDOFF.md",
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
if (counties.counties?.length === 75) pass("IC-01 counties=75");
else fail(`counties=${counties.counties?.length}`);
if (places.places?.length === 250) pass("IC-01 places=250");
else fail(`places=${places.places?.length}`);

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "src/features/reddirt-integration/fixtures/strategic-geography-sample.json",
    ),
    "utf8",
  ),
);
if (String(fixture._label || "").includes("FIXTURE")) pass("fixture labeled FIXTURE");
else fail("fixture missing FIXTURE label");
if (Array.isArray(fixture.records) && fixture.records.length >= 1)
  pass("fixture has records");
else fail("fixture empty");
const fipsOk = fixture.records.every(
  (r) => typeof r.countyFips === "string" && /^\d{5}$/.test(r.countyFips),
);
if (fipsOk) pass("fixture county FIPS shape");
else fail("fixture FIPS invalid");

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const needle of [
  "REDDIRT",
  "GEOGRAPHY_COUNTY",
  "GEOGRAPHY_PLACE",
  "STRATEGIC_FACT",
  "model StrategicSourceObservation",
  "model StrategicGeographyFact",
]) {
  if (schema.includes(needle)) pass(`schema ${needle}`);
  else fail(`schema missing ${needle}`);
}

const service = fs.readFileSync(
  path.join(root, "src/server/services/reddirt-integration-service.ts"),
  "utf8",
);
for (const forbidden of [
  "prisma.event.delete",
  "prisma.event.update",
  "prisma.event.create",
  "prisma.campaignMission.delete",
  "prisma.campaignMission.update",
  "prisma.campaignMission.create",
  "prisma.person.create",
  "from \"openai\"",
  "from 'openai'",
]) {
  if (service.includes(forbidden)) fail(`service contains ${forbidden}`);
  else pass(`service free of ${forbidden}`);
}

const adapter = fs.readFileSync(
  path.join(root, "src/features/reddirt-integration/adapter.ts"),
  "utf8",
);
const transport = fs.readFileSync(
  path.join(root, "src/features/reddirt-integration/transport.ts"),
  "utf8",
);
if (/\bmethod:\s*"GET"/.test(transport) || transport.includes('method: "GET"'))
  pass("transport GET-only typed");
else fail("transport must be GET-only");
for (const write of ["POST", "PUT", "PATCH", "DELETE"]) {
  if (new RegExp(`method:\\s*"${write}"`).test(adapter)) {
    fail(`adapter issues ${write}`);
  } else {
    pass(`adapter no ${write} method`);
  }
}

const docs = fs.readFileSync(
  path.join(root, "src/features/reddirt-integration/docs-revision.ts"),
  "utf8",
);
if (docs.includes("DOCUMENTATION_PENDING")) pass("docs DOCUMENTATION_PENDING");
else fail("docs must state DOCUMENTATION_PENDING");

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_02_AUTHORIZATION_ADR = "ADR-104"')) pass("ADR-104");
else fail("ADR-104 constant missing");
if (
  constants.includes('IC_02_STATUS = "IN_PROGRESS"') ||
  constants.includes('IC_02_STATUS = "COMPLETE"')
)
  pass("IC_02 IN_PROGRESS or COMPLETE");
else fail("IC_02_STATUS must be IN_PROGRESS or COMPLETE");
if (constants.includes('IC_03_STATUS = "NOT_AUTHORIZED"'))
  pass("IC_03 NOT_AUTHORIZED");
else fail("IC_03 must remain NOT_AUTHORIZED");
if (constants.includes('IC_01_STATUS = "COMPLETE"')) pass("IC_01 COMPLETE");
else fail("IC_01 must remain COMPLETE");

const envKeys = fs.readFileSync(
  path.join(root, "src/lib/env/approved-env-keys.ts"),
  "utf8",
);
for (const key of [
  "REDDIRT_API_KEY",
  "REDDIRT_BASE_URL",
  "REDDIRT_ORGANIZATION_ID",
  "REDDIRT_READ_ENABLED",
  "NEXT_PUBLIC_REDDIRT_API_KEY",
]) {
  if (envKeys.includes(key)) pass(`env key ${key}`);
  else fail(`missing env key ${key}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["intelligence:reddirt:validate"])
  pass("npm intelligence:reddirt:validate");
else fail("missing npm intelligence:reddirt:validate");

const decisions = JSON.parse(
  fs.readFileSync(path.join(root, "data/architecture_decisions.json"), "utf8"),
);
if (decisions.decisions?.some((d) => d.id === "ADR-104")) pass("ADR-104 registered");
else fail("ADR-104 missing from architecture_decisions.json");

const unit = spawnSync(
  process.execPath,
  [
    path.join(root, "scripts/run-with-h-drive-env.cjs"),
    "npx",
    "vitest",
    "run",
    "tests/unit/reddirt",
  ],
  { cwd: root, encoding: "utf8", env: process.env },
);
if (unit.status === 0) pass("unit tests reddirt");
else {
  fail("unit tests reddirt");
  console.error(unit.stdout);
  console.error(unit.stderr);
}

const geo = spawnSync(
  process.execPath,
  [path.join(root, "scripts/validate-geography-foundation.mjs")],
  { cwd: root, encoding: "utf8", env: process.env },
);
if (geo.status === 0) pass("geography:foundation:validate still green");
else {
  fail("geography:foundation:validate");
  console.error(geo.stdout);
  console.error(geo.stderr);
}

console.log(`\nIC-02 RedDirt read integration: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
