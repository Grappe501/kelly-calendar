/**
 * IC-02C organization structure validator (ADR-107).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
let passed = 0;
function pass(m) {
  console.log("PASS:", m);
  passed += 1;
}
function fail(m) {
  console.error("FAIL:", m);
  failed += 1;
}

const required = [
  "src/lib/organization/template.ts",
  "src/lib/organization/access.ts",
  "src/server/repositories/campaign-organization-repository.ts",
  "src/server/services/campaign-organization-service.ts",
  "src/app/api/organization/route.ts",
  "src/app/api/organization/dashboard/route.ts",
  "src/app/api/missions/[missionId]/operating-team/route.ts",
  "src/app/system/organization/page.tsx",
  "src/app/system/organization/chart/page.tsx",
  "src/app/system/organization/departments/page.tsx",
  "src/app/system/organization/positions/page.tsx",
  "src/app/system/organization/assignments/page.tsx",
  "src/app/system/organization/clusters/page.tsx",
  "src/app/system/organization/counties/page.tsx",
  "src/app/system/organization/delegations/page.tsx",
  "src/app/system/organization/audit/page.tsx",
  "src/app/system/operations/finance/page.tsx",
  "src/app/system/operations/data/page.tsx",
  "src/app/system/my-work/page.tsx",
  "src/app/system/my-calendar/page.tsx",
  "src/components/organization/OrganizationInstallClient.tsx",
  "src/components/missions/MissionOperatingTeamPanel.tsx",
  "prisma/migrations/20260723170000_ic02c_campaign_operating_structure/migration.sql",
  "develop_notes/KCCC_IC_02C_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_02C_CAMPAIGN_OPERATING_STRUCTURE.md",
  "develop_notes/KCCC_IC_02C_CAMPAIGN_OPERATING_STRUCTURE_ROLLBACK.md",
  "develop_notes/KCCC_CAMPAIGN_ORGANIZATION_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_CAMPAIGN_ROLE_ACCESS_MATRIX.md",
  "develop_notes/KCCC_COUNTY_CLUSTER_ORGANIZING_STRUCTURE.md",
  "develop_notes/ADR-107_FOUR_DEPARTMENT_OPERATING_STRUCTURE.md",
  "tests/unit/organization/access.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const m of [
  "CampaignOrgDepartment",
  "CampaignOrgPosition",
  "CampaignOrgCluster",
  "CampaignOrgPositionAssignment",
  "CampaignOrgTemplateInstall",
]) {
  if (schema.includes(`model ${m}`)) pass(`schema ${m}`);
  else fail(`missing ${m}`);
}

const tmpl = fs.readFileSync(
  path.join(root, "src/lib/organization/template.ts"),
  "utf8",
);
if (tmpl.includes("VOLUNTEER_AND_ORGANIZING") && tmpl.includes("OPERATIONS_AND_DATA"))
  pass("four operating departments in template");
else fail("locked departments missing");
if (tmpl.includes("TOP_OPERATING_DEPARTMENT_KEYS")) pass("top four keys exported");
else fail("top four keys missing");

const access = fs.readFileSync(
  path.join(root, "src/lib/organization/access.ts"),
  "utf8",
);
if (/assignmentGrantsAccess/.test(access)) pass("assignment access gate");
else fail("assignment access gate missing");

const repo = fs.readFileSync(
  path.join(root, "src/server/repositories/campaign-organization-repository.ts"),
  "utf8",
);
if (/Name-only assignment is blocked/.test(repo)) pass("name-only blocked");
else fail("name-only block missing");
if (/COUNTY_CAPTAIN_/.test(repo)) pass("county captains generated");
else fail("county captains missing");

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_02C_STATUS = "COMPLETE"')) pass("IC_02C COMPLETE");
else fail("IC_02C_STATUS");
if (constants.includes('IC_03_STATUS = "NOT_AUTHORIZED"'))
  pass("IC_03 NOT_AUTHORIZED");
else fail("IC_03 must stay NOT_AUTHORIZED");

const mig = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260723170000_ic02c_campaign_operating_structure/migration.sql",
  ),
  "utf8",
);
if (!/INSERT INTO/i.test(mig)) pass("migration has no seed INSERTs");
else fail("migration must not seed org");

const counties = JSON.parse(
  fs.readFileSync(
    path.join(root, "data/geography/arkansas-counties-authority.json"),
    "utf8",
  ),
);
if (counties.counties?.length === 75) pass("IC-01 counties=75");
else fail(`counties=${counties.counties?.length}`);

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/organization/access.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit organization access tests");
else {
  fail("unit tests failed");
  console.error(vitest.stdout || "");
  console.error(vitest.stderr || "");
}

const impl = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_02C_CAMPAIGN_OPERATING_STRUCTURE.md"),
  "utf8",
);
for (const z of [
  "fabricated users: 0",
  "fabricated people: 0",
  "automatic active assignments: 0",
  "OpenAI calls: 0",
  "RedDirt writes: 0",
]) {
  if (impl.includes(z)) pass(`doc zero ${z}`);
  else fail(`doc missing ${z}`);
}

console.log(`\nIC-02C validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
