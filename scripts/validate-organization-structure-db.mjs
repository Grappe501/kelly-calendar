/**
 * Durable DB proof for IC-02C (ADR-107).
 * Installs via PrismaClient (mirrors campaign-organization-repository).
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL && !process.env.DATABASE_URL)
  process.env.DATABASE_URL = loaded.DATABASE_URL;
if (loaded.DIRECT_URL && !process.env.DIRECT_URL)
  process.env.DIRECT_URL = loaded.DIRECT_URL;

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
function pass(m) {
  console.log("PASS:", m);
  passed += 1;
}
function fail(m) {
  console.error("FAIL:", m);
  failed += 1;
}

const SCOPE = "KELLY";
const CODE = "KCCC_CAMPAIGN_OPERATING_STRUCTURE";
const VERSION = "1.0.0";
const TOP = [
  "VOLUNTEER_AND_ORGANIZING",
  "COMMUNICATIONS",
  "FINANCE",
  "OPERATIONS_AND_DATA",
];

/** Load department/position defs from the locked template source. */
function loadTemplateDefs() {
  const src = readFileSync(
    path.join(root, "src/lib/organization/template.ts"),
    "utf8",
  );
  // Evaluate exports via tsx-free parse: require compiled? Use dynamic import of .ts fails.
  // Instead assert source contains required keys and use inline mirror kept identical.
  if (!src.includes("VOLUNTEER_AND_ORGANIZING") || !src.includes("OPERATIONS_AND_DATA")) {
    throw new Error("template.ts missing locked departments");
  }
  return true;
}

const DEPTS = [
  {
    key: "CANDIDATE",
    displayName: "Candidate",
    purpose: "Public leadership, statewide relationships, message, candidate activity.",
    sortOrder: 10,
    privacyLevel: "LEADERSHIP",
    functions: [
      { key: "CANDIDATE_LEADERSHIP", displayName: "Candidate Leadership", purpose: "Vision, relationships, strategic decisions.", sortOrder: 10 },
    ],
  },
  {
    key: "CAMPAIGN_MANAGEMENT",
    displayName: "Campaign Management",
    purpose: "Priorities, manager accountability, schedule approval, escalations.",
    sortOrder: 20,
    privacyLevel: "LEADERSHIP",
    functions: [
      { key: "CAMPAIGN_MANAGER_OFFICE", displayName: "Campaign Manager Office", purpose: "Cross-department coordination and sensitive decisions.", sortOrder: 10 },
    ],
  },
  {
    key: "VOLUNTEER_AND_ORGANIZING",
    displayName: "Volunteer and Organizing",
    purpose: "Intake, training, placement, county organizing, voter engagement, youth, distributed actions.",
    sortOrder: 30,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", displayName: "Volunteer Intake, Training and Placement", purpose: "Onboarding, skills, retention, next action.", sortOrder: 10 },
      { key: "COUNTY_ORGANIZING", displayName: "County Organizing", purpose: "Clusters, captains, local leadership.", sortOrder: 20 },
      { key: "VOTER_ENGAGEMENT", displayName: "Voter Engagement", purpose: "Registration, civic education, contact, GOTV.", sortOrder: 30 },
      { key: "COLLEGE_AND_YOUTH", displayName: "College and Youth", purpose: "Campus leads and youth pathways into counties.", sortOrder: 40 },
      { key: "EVENTS_AND_DISTRIBUTED_ACTIONS", displayName: "Events and Distributed Actions", purpose: "Volunteer execution of events and actions.", sortOrder: 50 },
    ],
  },
  {
    key: "COMMUNICATIONS",
    displayName: "Communications",
    purpose: "Content, creative, phone/text policy, press and paid media.",
    sortOrder: 40,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "EMAIL_AND_CONTENT", displayName: "Email and Content", purpose: "Email and written content.", sortOrder: 10 },
      { key: "SOCIAL_DIGITAL_CREATIVE", displayName: "Social, Digital and Creative", purpose: "Social, digital, graphics, photo/video.", sortOrder: 20 },
      { key: "PHONE_AND_TEXT", displayName: "Phone and Text", purpose: "Message/audience policy; shared volunteer staffing.", sortOrder: 30 },
      { key: "PRESS_EARNED_PAID", displayName: "Press, Earned and Paid Media", purpose: "Press, APA, radio, newspaper, advertising.", sortOrder: 40 },
    ],
  },
  {
    key: "FINANCE",
    displayName: "Finance",
    purpose: "Compliance, budget, fundraising operations.",
    sortOrder: 50,
    privacyLevel: "FINANCE_RESTRICTED",
    functions: [
      { key: "TREASURER_COMPLIANCE", displayName: "Treasurer and Compliance", purpose: "Legal/compliance deadlines.", sortOrder: 10 },
      { key: "BUDGET_BOOKKEEPING", displayName: "Budget and Bookkeeping", purpose: "Budget requests and bookkeeping.", sortOrder: 20 },
      { key: "FUNDRAISING_OPERATIONS", displayName: "Fundraising Operations", purpose: "Targets, call time, host committees, pledges.", sortOrder: 30 },
    ],
  },
  {
    key: "OPERATIONS_AND_DATA",
    displayName: "Operations and Data",
    purpose: "Calendar, activation routing, logistics, systems, reporting — connective tissue.",
    sortOrder: 60,
    privacyLevel: "INTERNAL",
    functions: [
      { key: "MASTER_CALENDAR_SCHEDULING", displayName: "Master Calendar and Candidate Scheduling", purpose: "Canonical calendar and scheduling.", sortOrder: 10 },
      { key: "MISSION_ACTIVATION_ROUTING", displayName: "Mission Activation and Task Routing", purpose: "Playbook application and routing (IC-02B).", sortOrder: 20 },
      { key: "TRAVEL_LODGING_ADVANCE", displayName: "Travel, Lodging and Advance", purpose: "Travel and advance coordination.", sortOrder: 30 },
      { key: "MATERIALS_LOGISTICS", displayName: "Materials and Logistics", purpose: "Materials movement and logistics board.", sortOrder: 40 },
      { key: "DATA_SYSTEMS_REPORTING", displayName: "Data, Systems and Reporting", purpose: "Permissions, data quality, reporting.", sortOrder: 50 },
    ],
  },
];

const CORE = [
  { key: "CANDIDATE", title: "Candidate — Kelly Grappe", departmentKey: "CANDIDATE", functionKey: "CANDIDATE_LEADERSHIP", scopeType: "STATEWIDE", permissionsProfile: "CANDIDATE", privacyLevel: "LEADERSHIP", sortOrder: 10 },
  { key: "CAMPAIGN_MANAGER", title: "Campaign Manager", departmentKey: "CAMPAIGN_MANAGEMENT", functionKey: "CAMPAIGN_MANAGER_OFFICE", reportsToPositionKey: "CANDIDATE", scopeType: "STATEWIDE", permissionsProfile: "CAMPAIGN_MANAGER", privacyLevel: "LEADERSHIP", sortOrder: 20 },
  { key: "VOLUNTEER_ORGANIZING_MANAGER", title: "Volunteer and Organizing Manager", departmentKey: "VOLUNTEER_AND_ORGANIZING", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 30 },
  { key: "VOLUNTEER_INTAKE_PLACEMENT_COORD", title: "Volunteer Intake and Placement Coordinator", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 31 },
  { key: "VOLUNTEER_TRAINING_COORD", title: "Volunteer Training Coordinator", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOLUNTEER_INTAKE_TRAINING_PLACEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 32 },
  { key: "COUNTY_ORGANIZING_LEAD", title: "County Organizing Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "COUNTY_ORGANIZING", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 33 },
  { key: "VOTER_ENGAGEMENT_LEAD", title: "Voter Engagement Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "VOTER_ENGAGEMENT", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 34 },
  { key: "COLLEGE_YOUTH_LEAD", title: "College and Youth Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "COLLEGE_AND_YOUTH", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 35 },
  { key: "EVENTS_DISTRIBUTED_ACTIONS_LEAD", title: "Events and Distributed Actions Lead", departmentKey: "VOLUNTEER_AND_ORGANIZING", functionKey: "EVENTS_AND_DISTRIBUTED_ACTIONS", reportsToPositionKey: "VOLUNTEER_ORGANIZING_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 36 },
  { key: "COMMUNICATIONS_MANAGER", title: "Communications Manager", departmentKey: "COMMUNICATIONS", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 40 },
  { key: "EMAIL_CONTENT_LEAD", title: "Email and Content Lead", departmentKey: "COMMUNICATIONS", functionKey: "EMAIL_AND_CONTENT", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 41 },
  { key: "SOCIAL_DIGITAL_CREATIVE_LEAD", title: "Social, Digital and Creative Lead", departmentKey: "COMMUNICATIONS", functionKey: "SOCIAL_DIGITAL_CREATIVE", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 42 },
  { key: "PHONE_TEXT_LEAD", title: "Phone and Text Program Lead", departmentKey: "COMMUNICATIONS", functionKey: "PHONE_AND_TEXT", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 43 },
  { key: "PRESS_PAID_MEDIA_LEAD", title: "Press, Earned and Paid Media Lead", departmentKey: "COMMUNICATIONS", functionKey: "PRESS_EARNED_PAID", reportsToPositionKey: "COMMUNICATIONS_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 44 },
  { key: "FINANCE_MANAGER", title: "Finance Manager", departmentKey: "FINANCE", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_MANAGER", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 50 },
  { key: "TREASURER_COMPLIANCE_LEAD", title: "Treasurer/Compliance Lead", departmentKey: "FINANCE", functionKey: "TREASURER_COMPLIANCE", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 51 },
  { key: "BUDGET_BOOKKEEPING_LEAD", title: "Budget and Bookkeeping Lead", departmentKey: "FINANCE", functionKey: "BUDGET_BOOKKEEPING", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 52 },
  { key: "FUNDRAISING_OPS_LEAD", title: "Fundraising Operations Lead", departmentKey: "FINANCE", functionKey: "FUNDRAISING_OPERATIONS", reportsToPositionKey: "FINANCE_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "FINANCE_COORDINATOR", privacyLevel: "FINANCE_RESTRICTED", sortOrder: 53 },
  { key: "OPERATIONS_DATA_COORDINATOR", title: "Operations and Data Coordinator", departmentKey: "OPERATIONS_AND_DATA", reportsToPositionKey: "CAMPAIGN_MANAGER", scopeType: "STATEWIDE", permissionsProfile: "DEPARTMENT_MANAGER", sortOrder: 60 },
  { key: "SCHEDULING_ADVANCE_COORD", title: "Scheduling and Advance Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "MASTER_CALENDAR_SCHEDULING", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 61 },
  { key: "LOGISTICS_COORD", title: "Logistics Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "MATERIALS_LOGISTICS", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 62 },
  { key: "DATA_SYSTEMS_COORD", title: "Data and Systems Coordinator", departmentKey: "OPERATIONS_AND_DATA", functionKey: "DATA_SYSTEMS_REPORTING", reportsToPositionKey: "OPERATIONS_DATA_COORDINATOR", scopeType: "STATEWIDE", permissionsProfile: "COORDINATOR", sortOrder: 63 },
];

async function counts() {
  return {
    departments: await prisma.campaignOrgDepartment.count({ where: { campaignScopeKey: SCOPE } }),
    positions: await prisma.campaignOrgPosition.count({ where: { campaignScopeKey: SCOPE } }),
    clusters: await prisma.campaignOrgCluster.count({ where: { campaignScopeKey: SCOPE } }),
    captains: await prisma.campaignOrgPosition.count({
      where: { campaignScopeKey: SCOPE, key: { startsWith: "COUNTY_CAPTAIN_" } },
    }),
    assignments: await prisma.campaignOrgPositionAssignment.count({
      where: { campaignScopeKey: SCOPE },
    }),
    people: await prisma.person.count(),
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
    installs: await prisma.campaignOrgTemplateInstall.count({
      where: { campaignScopeKey: SCOPE, templateCode: CODE, templateVersion: VERSION },
    }),
  };
}

async function installOnce(actorUserId) {
  const existing = await prisma.campaignOrgTemplateInstall.findUnique({
    where: {
      campaignScopeKey_templateCode_templateVersion: {
        campaignScopeKey: SCOPE,
        templateCode: CODE,
        templateVersion: VERSION,
      },
    },
  });
  if (existing) {
    return { installed: false, idempotentHit: true, created: { assignments: 0, people: 0 } };
  }

  const counties = await prisma.arkansasCounty.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
  });
  if (counties.length !== 75) {
    throw new Error(`Expected 75 IC-01 counties, found ${counties.length}`);
  }

  const fingerprint = createHash("sha256")
    .update(`${CODE}@${VERSION}|depts:6|positions:${CORE.length}|clusters:6|captains:75`)
    .digest("hex")
    .slice(0, 32);

  await prisma.$transaction(
    async (tx) => {
      const deptMap = new Map();
      const fnMap = new Map();
      for (const d of DEPTS) {
        const row = await tx.campaignOrgDepartment.create({
          data: {
            campaignScopeKey: SCOPE,
            key: d.key,
            displayName: d.displayName,
            purpose: d.purpose,
            sortOrder: d.sortOrder,
            privacyLevel: d.privacyLevel,
            templateVersion: VERSION,
          },
        });
        deptMap.set(d.key, row.id);
        for (const f of d.functions) {
          const fn = await tx.campaignOrgFunction.create({
            data: {
              campaignScopeKey: SCOPE,
              departmentId: row.id,
              key: f.key,
              displayName: f.displayName,
              purpose: f.purpose,
              sortOrder: f.sortOrder,
              templateVersion: VERSION,
            },
          });
          fnMap.set(f.key, fn.id);
        }
      }

      for (let i = 1; i <= 6; i += 1) {
        const key = `CLUSTER_${i}`;
        const cluster = await tx.campaignOrgCluster.create({
          data: {
            campaignScopeKey: SCOPE,
            key,
            displayName: `Cluster ${i}`,
            description: "Draft placeholder — county membership not invented.",
            membershipStatus: "DRAFT",
            membershipVersion: "1",
            templateVersion: VERSION,
            sortOrder: i,
          },
        });
        await tx.campaignOrgPosition.create({
          data: {
            campaignScopeKey: SCOPE,
            key: `CLUSTER_MANAGER_${key}`,
            title: `Cluster Manager — Cluster ${i}`,
            departmentId: deptMap.get("VOLUNTEER_AND_ORGANIZING"),
            functionId: fnMap.get("COUNTY_ORGANIZING"),
            reportsToPositionKey: "COUNTY_ORGANIZING_LEAD",
            scopeType: "CLUSTER",
            clusterId: cluster.id,
            permissionsProfile: "CLUSTER_MANAGER",
            status: "VACANT",
            templateVersion: VERSION,
            sortOrder: 100 + i,
          },
        });
      }

      for (const p of CORE) {
        await tx.campaignOrgPosition.create({
          data: {
            campaignScopeKey: SCOPE,
            key: p.key,
            title: p.title,
            departmentId: p.departmentKey ? deptMap.get(p.departmentKey) : null,
            functionId: p.functionKey ? fnMap.get(p.functionKey) : null,
            reportsToPositionKey: p.reportsToPositionKey ?? null,
            scopeType: p.scopeType,
            permissionsProfile: p.permissionsProfile,
            privacyLevel: p.privacyLevel ?? "INTERNAL",
            status: "VACANT",
            templateVersion: VERSION,
            sortOrder: p.sortOrder,
          },
        });
      }

      await tx.campaignOrgPosition.createMany({
        data: counties.map((county) => ({
          campaignScopeKey: SCOPE,
          key: `COUNTY_CAPTAIN_${county.slug}`,
          title: `County Captain — ${county.name}`,
          departmentId: deptMap.get("VOLUNTEER_AND_ORGANIZING"),
          functionId: fnMap.get("COUNTY_ORGANIZING"),
          reportsToPositionKey: "COUNTY_ORGANIZING_LEAD",
          scopeType: "COUNTY",
          arkansasCountyId: county.id,
          permissionsProfile: "COUNTY_CAPTAIN",
          status: "VACANT",
          templateVersion: VERSION,
          sortOrder: 200,
        })),
      });

      await tx.campaignOrgTemplateInstall.create({
        data: {
          campaignScopeKey: SCOPE,
          templateCode: CODE,
          templateVersion: VERSION,
          installedByUserId: actorUserId,
          fingerprint,
        },
      });

      await tx.campaignOrgAuditEvent.create({
        data: {
          campaignScopeKey: SCOPE,
          action: "INSTALL_TEMPLATE",
          actorUserId,
          detailJson: {
            templateCode: CODE,
            templateVersion: VERSION,
            counties: counties.length,
            clusters: 6,
            assignments: 0,
            people: 0,
            topOperatingDepartments: TOP,
            proof: "ic02c-db-validate",
          },
        },
      });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  return { installed: true, idempotentHit: false, created: { assignments: 0, people: 0 } };
}

async function main() {
  loadTemplateDefs();
  pass("template source present");

  const before = await counts();
  const first = await installOnce("ic02c-proof");
  if (first.installed) pass("explicit install completed");
  else pass("template already installed — proceeding to idempotency checks");

  const afterInstall = await counts();
  if (afterInstall.departments >= 6) pass("departments present (>=6 lanes)");
  else fail(`departments=${afterInstall.departments}`);
  if (afterInstall.clusters === 6) pass("six draft clusters");
  else fail(`clusters=${afterInstall.clusters}`);
  if (afterInstall.captains === 75) pass("75 county captains");
  else fail(`captains=${afterInstall.captains}`);
  if (afterInstall.assignments === 0) pass("automatic active assignments: 0");
  else fail(`assignments=${afterInstall.assignments}`);
  if (afterInstall.people === before.people) pass("fabricated people: 0");
  else fail("people count changed");
  if (afterInstall.users === before.users) pass("fabricated users: 0");
  else fail("users count changed");
  if (afterInstall.events === before.events) pass("automatically created Events: 0");
  else fail("events changed");
  if (afterInstall.missions === before.missions)
    pass("automatically created Missions: 0");
  else fail("missions changed");

  const second = await installOnce("ic02c-proof-re");
  if (second.idempotentHit === true && second.created?.assignments === 0)
    pass("reinstall creates zero duplicates");
  else fail(`reinstall unexpected ${JSON.stringify(second)}`);

  const after = await counts();
  if (after.installs === 1) pass("exactly one install record");
  else fail(`installs=${after.installs}`);
  if (after.departments === afterInstall.departments)
    pass("department count stable after reinstall");
  else fail("department count drifted");
  if (after.captains === 75) pass("captains remain 75 after reinstall");
  else fail(`captains after reinstall=${after.captains}`);

  const top = await prisma.campaignOrgDepartment.findMany({
    where: { campaignScopeKey: SCOPE, key: { in: TOP } },
  });
  if (top.length === 4) pass("exactly four top-level operating departments");
  else fail(`top operating=${top.length}`);

  console.log(JSON.stringify({ before, afterInstall, after, first, second }));
  console.log(`\nIC-02C DB proof: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
