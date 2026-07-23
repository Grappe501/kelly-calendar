/**
 * IC-02B Mission Activation Playbooks validator (ADR-106).
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
  "src/lib/missions/activation/types.ts",
  "src/lib/missions/activation/timing.ts",
  "src/lib/missions/activation/templates.ts",
  "src/lib/missions/activation/preview.ts",
  "src/lib/missions/activation/index.ts",
  "src/server/repositories/mission-activation-repository.ts",
  "src/server/services/mission-activation-service.ts",
  "src/app/api/missions/[missionId]/activation/route.ts",
  "src/app/api/operations/boards/route.ts",
  "src/app/system/missions/[missionId]/activation/page.tsx",
  "src/app/system/operations/page.tsx",
  "src/app/system/operations/events/page.tsx",
  "src/app/system/operations/communications/page.tsx",
  "src/app/system/operations/volunteers/page.tsx",
  "src/app/system/operations/logistics/page.tsx",
  "src/app/system/operations/field/page.tsx",
  "src/app/system/operations/tasks/page.tsx",
  "src/app/system/operations/notifications/page.tsx",
  "src/app/system/operations/templates/page.tsx",
  "src/components/missions/activation/MissionActivationClient.tsx",
  "src/components/operations/CampaignOpsSuperHeader.tsx",
  "tests/unit/activation/preview-timing.test.ts",
  "prisma/migrations/20260723160000_ic02b_mission_activation_department_operations/migration.sql",
  "develop_notes/KCCC_IC_02B_AUTHORIZATION_KELLY_2026-07-23.md",
  "develop_notes/KCCC_IC_02B_MISSION_ACTIVATION_PLAYBOOKS.md",
  "develop_notes/KCCC_IC_02B_MISSION_ACTIVATION_PLAYBOOKS_ROLLBACK.md",
  "develop_notes/KCCC_DEPARTMENT_OPERATIONS_OPERATOR_GUIDE.md",
  "develop_notes/KCCC_MISSION_ACTIVATION_TEMPLATE_STANDARD_EVENT.md",
  "develop_notes/KCCC_CAMPAIGN_PRODUCT_STYLE_SYSTEM.md",
  "develop_notes/ADR-106_MISSION_ACTIVATION_INDEPENDENT_OF_LIFECYCLE.md",
];

for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) pass(`file ${rel}`);
  else fail(`missing ${rel}`);
}

const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
for (const m of [
  "MissionActivationPlan",
  "MissionActivationTask",
  "MissionActivationVolunteerNeed",
  "MissionActivationTemplate",
]) {
  if (schema.includes(`model ${m}`)) pass(`schema ${m}`);
  else fail(`schema missing ${m}`);
}

const mig = fs.readFileSync(
  path.join(
    root,
    "prisma/migrations/20260723160000_ic02b_mission_activation_department_operations/migration.sql",
  ),
  "utf8",
);
if (!/INSERT INTO/i.test(mig)) pass("migration has no seed INSERTs");
else fail("migration must not seed plans");

const svc = fs.readFileSync(
  path.join(root, "src/server/services/mission-activation-service.ts"),
  "utf8",
);
if (/confirmApply !== true/.test(svc)) pass("apply requires confirmation");
else fail("confirmApply gate missing");
if (/externalEmails: 0/.test(svc)) pass("external email zero guarantee");
else fail("external email zero missing");
if (/idempotentHit/.test(svc)) pass("idempotent reapply path");
else fail("idempotent path missing");

const tmpl = fs.readFileSync(
  path.join(root, "src/lib/missions/activation/templates.ts"),
  "utf8",
);
if (/Prepare Save-the-Date Email/.test(tmpl)) pass("48h save-the-date step");
else fail("save-the-date missing");
if (/offsetHours: 48/.test(tmpl)) pass("48h offset from activation");
else fail("48h offset missing");

const constants = fs.readFileSync(
  path.join(root, "src/lib/system/constants.ts"),
  "utf8",
);
if (constants.includes('IC_02B_STATUS = "COMPLETE"')) pass("IC_02B COMPLETE");
else fail("IC_02B_STATUS");
if (constants.includes('IC_03_STATUS = "NOT_AUTHORIZED"'))
  pass("IC_03 NOT_AUTHORIZED");
else fail("IC_03 must stay NOT_AUTHORIZED");

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/activation/preview-timing.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
if (vitest.status === 0) pass("unit activation tests");
else {
  fail("unit activation tests failed");
  console.error(vitest.stdout || "");
  console.error(vitest.stderr || "");
}

const impl = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_02B_MISSION_ACTIVATION_PLAYBOOKS.md"),
  "utf8",
);
for (const z of [
  "automatically assigned volunteers: 0",
  "externally sent emails: 0",
  "OpenAI calls: 0",
  "RedDirt writes: 0",
]) {
  if (impl.includes(z)) pass(`doc zero ${z}`);
  else fail(`doc missing ${z}`);
}

const ic03 = fs.readFileSync(
  path.join(root, "develop_notes/KCCC_IC_03_DESIGN_HANDOFF.md"),
  "utf8",
);
if (/IC-02B|activated workstreams/i.test(ic03))
  pass("IC-03 handoff references IC-02B");
else fail("IC-03 handoff missing IC-02B");

console.log(`\nIC-02B validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
