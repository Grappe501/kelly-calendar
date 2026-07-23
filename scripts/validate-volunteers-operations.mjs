/**
 * IC-02D Volunteer Operations validator (ADR-108).
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
  "src/lib/volunteers/priority.ts",
  "src/lib/volunteers/taxonomy.ts",
  "src/server/repositories/campaign-volunteer-repository.ts",
  "src/server/services/campaign-volunteer-service.ts",
  "src/app/api/volunteers/route.ts",
  "src/app/api/work/route.ts",
  "src/app/system/volunteers/page.tsx",
  "src/app/system/volunteers/[section]/page.tsx",
  "src/app/system/operations/assistant-campaign-manager/page.tsx",
  "src/app/system/work/page.tsx",
  "src/app/system/logistics/page.tsx",
  "src/app/system/logistics/[section]/page.tsx",
  "prisma/migrations/20260723180000_ic02d_volunteer_operations_campaign_work_management/migration.sql",
  "develop_notes/KCCC_IC_02D_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_02D_VOLUNTEER_OPERATIONS.md",
  "develop_notes/KCCC_IC_02D_VOLUNTEER_OPERATIONS_ROLLBACK.md",
  "develop_notes/KCCC_VOLUNTEER_MANAGER_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_VOLUNTEER_COORDINATOR_GUIDE.md",
  "develop_notes/KCCC_ASSISTANT_CAMPAIGN_MANAGER_WORKSPACE.md",
  "develop_notes/KCCC_CAMPAIGN_LOGISTICS_BOARD.md",
  "develop_notes/KCCC_VOLUNTEER_PRIVACY_CONSENT_POLICY.md",
  "develop_notes/ADR-108_VOLUNTEER_OPS_ACM_LOGISTICS.md",
  "tests/unit/volunteers/operations.test.ts",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const m of [
  "CampaignVolunteerProfile",
  "CampaignVolunteerAssignment",
  "CampaignWorkItemIndex",
]) {
  if (schema.includes(`model ${m}`)) pass(`schema ${m}`);
  else fail(`missing ${m}`);
}

const tmpl = fs.readFileSync(
  path.join(root, "src/lib/organization/template.ts"),
  "utf8",
);
if (tmpl.includes('ORG_TEMPLATE_VERSION = "1.1.0"')) pass("template 1.1.0");
else fail("template version");
if (tmpl.includes("ASSISTANT_CAMPAIGN_MANAGER") && tmpl.includes("CAMPAIGN_LOGISTICS"))
  pass("ACM + Campaign Logistics in template");
else fail("ACM/logistics missing");

const home = fs.readFileSync(
  path.join(root, "src/app/system/volunteers/page.tsx"),
  "utf8",
);
if (home.includes("Priority tasks") && home.includes("maxPrioritiesShown"))
  pass("quiet home priorities");
else if (home.includes("priorities") && home.includes("At most five"))
  pass("quiet home priorities");
else fail("quiet home priorities missing");

const pri = fs.readFileSync(
  path.join(root, "src/lib/volunteers/priority.ts"),
  "utf8",
);
if (pri.includes("prioritizeTop") && !pri.includes("openai"))
  pass("deterministic priority no OpenAI");
else fail("priority service");

const repo = fs.readFileSync(
  path.join(root, "src/server/repositories/campaign-volunteer-repository.ts"),
  "utf8",
);
if (/Name-only person linking is blocked/.test(repo)) pass("name-only blocked");
else fail("name-only block");
if (/Automatic assignment is blocked/.test(repo)) pass("auto-assign blocked");
else fail("auto-assign block");

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_02D_STATUS = "COMPLETE"')) pass("IC_02D COMPLETE");
else fail("IC_02D_STATUS");
if (constants.includes('IC_03_STATUS = "NOT_AUTHORIZED"'))
  pass("IC_03 NOT_AUTHORIZED");
else fail("IC_03");

const mig = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260723180000_ic02d_volunteer_operations_campaign_work_management/migration.sql",
  ),
  "utf8",
);
if (!/INSERT INTO/i.test(mig)) pass("migration has no seed INSERTs");
else fail("migration must not seed volunteers");

const logistics = fs.readFileSync(
  path.join(root, "src/server/services/campaign-volunteer-service.ts"),
  "utf8",
);
if (logistics.includes('reportsTo: "CAMPAIGN_MANAGER"'))
  pass("logistics reports to Campaign Manager");
else fail("logistics reporting");
if (logistics.includes("Reuses D11")) pass("logistics reuses D11-D13");
else fail("D11 reuse");

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/volunteers/operations.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit volunteer ops tests");
else {
  fail("unit tests failed");
  console.error(vitest.stdout || "");
  console.error(vitest.stderr || "");
}

const impl = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_02D_VOLUNTEER_OPERATIONS.md"),
  "utf8",
);
for (const z of [
  "fabricated volunteers: 0",
  "automatic assignments: 0",
  "inferred consents: 0",
  "OpenAI calls: 0",
  "RedDirt writes: 0",
]) {
  if (impl.includes(z)) pass(`doc zero ${z}`);
  else fail(`doc missing ${z}`);
}

console.log(`\nIC-02D validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
