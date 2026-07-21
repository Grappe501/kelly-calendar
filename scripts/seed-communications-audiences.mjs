/**
 * Seed controlled D24 sandbox audiences only. Idempotent by audienceKey.
 * Approved production audiences: 0. Manifests: 0. No production send.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL) process.env.DATABASE_URL = loaded.DATABASE_URL;
if (loaded.DIRECT_URL) process.env.DIRECT_URL = loaded.DIRECT_URL;
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();

function hash(obj) {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

const seeds = [
  {
    audienceKey: "sandbox_email_audience",
    name: "Sandbox Email Audience",
    audienceType: "TEST_ONLY",
    channelScope: "EMAIL",
    purpose: "Fabricated email recipient resolution sandbox",
    criteria: {
      schemaVersion: "d24-1",
      match: "ALL",
      fabricatedPoolKey: "sandbox_email_clean",
      conditions: [
        { key: "volunteer.active", operator: "TRUE" },
        { key: "has_valid_email", operator: "TRUE" },
        { key: "has_email_consent", operator: "TRUE" },
        { key: "not_suppressed", operator: "TRUE" },
      ],
    },
  },
  {
    audienceKey: "sandbox_sms_audience",
    name: "Sandbox SMS Audience",
    audienceType: "TEST_ONLY",
    channelScope: "SMS",
    purpose: "Fabricated SMS recipient resolution sandbox",
    criteria: {
      schemaVersion: "d24-1",
      match: "ALL",
      fabricatedPoolKey: "sandbox_sms",
      conditions: [
        { key: "volunteer.active", operator: "TRUE" },
        { key: "has_valid_mobile_phone", operator: "TRUE" },
        { key: "has_sms_consent", operator: "TRUE" },
        { key: "not_suppressed", operator: "TRUE" },
      ],
    },
  },
  {
    audienceKey: "mission_participants_draft",
    name: "Mission Participants — Draft",
    audienceType: "MISSION",
    channelScope: "EMAIL",
    purpose: "Draft mission-derived audience (not approved)",
    criteria: null,
  },
  {
    audienceKey: "event_follow_up_draft",
    name: "Event Follow-up — Draft",
    audienceType: "EVENT",
    channelScope: "EMAIL",
    purpose: "Draft event follow-up audience (not approved)",
    criteria: null,
  },
  {
    audienceKey: "active_volunteers_draft",
    name: "Active Volunteers — Draft",
    audienceType: "DYNAMIC",
    channelScope: "EMAIL",
    purpose: "Draft volunteer audience (not approved)",
    criteria: null,
  },
  {
    audienceKey: "internal_campaign_staff_draft",
    name: "Internal Campaign Staff — Draft",
    audienceType: "INTERNAL",
    channelScope: "EMAIL",
    purpose: "Draft internal staff audience (not approved)",
    criteria: null,
  },
];

for (const seed of seeds) {
  const audience = await prisma.communicationAudience.upsert({
    where: {
      campaignScopeKey_audienceKey: {
        campaignScopeKey: "KELLY",
        audienceKey: seed.audienceKey,
      },
    },
    create: {
      campaignScopeKey: "KELLY",
      audienceKey: seed.audienceKey,
      name: seed.name,
      audienceType: seed.audienceType,
      channelScope: seed.channelScope,
      purpose: seed.purpose,
      status: "DRAFT",
      ownerType: "CAMPAIGN",
    },
    update: {
      name: seed.name,
      purpose: seed.purpose,
    },
  });

  if (seed.criteria) {
    const existing = await prisma.communicationSegmentDefinition.findFirst({
      where: { audienceId: audience.id, versionNumber: 1 },
    });
    if (!existing) {
      await prisma.communicationSegmentDefinition.create({
        data: {
          audienceId: audience.id,
          versionNumber: 1,
          status: "DRAFT",
          channel: seed.channelScope === "SMS" ? "SMS" : "EMAIL",
          criteriaJson: seed.criteria,
          criteriaSchemaVersion: "d24-1",
          sourcePolicyJson: { fabricatedOnly: true },
          evaluationLimit: 50,
          contentHash: hash(seed.criteria),
          changeSummary: "Seed draft criteria — not production approved",
        },
      });
    }
  }
}

const approvedProd = await prisma.communicationAudience.count({
  where: {
    campaignScopeKey: "KELLY",
    status: "APPROVED",
    audienceType: { not: "TEST_ONLY" },
  },
});
const manifests = await prisma.communicationRecipientManifest.count();
const entries = await prisma.communicationRecipientManifestEntry.count();

console.log(
  JSON.stringify(
    {
      seededAudiences: seeds.length,
      approvedProductionAudiences: approvedProd,
      recipientManifests: manifests,
      manifestEntries: entries,
      productionDispatchEnabled: false,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
