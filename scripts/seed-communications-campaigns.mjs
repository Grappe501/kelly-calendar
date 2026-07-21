/**
 * Seed controlled D25 sandbox campaigns only. Idempotent by campaignKey.
 * Production campaigns authorized: 0. Production runs/attempts: 0.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { loadApprovedEnv } = await import(
  pathToFileURL(path.join(root, "scripts/lib/load-env-files.mjs")).href
);
const { env: loaded } = loadApprovedEnv({ includeRedDirtFallback: true });
if (loaded.DATABASE_URL) process.env.DATABASE_URL = loaded.DATABASE_URL;
if (loaded.DIRECT_URL) process.env.DIRECT_URL = loaded.DIRECT_URL;
const { PrismaClient } = createRequire(import.meta.url)("@prisma/client");
const prisma = new PrismaClient();

const seeds = [
  {
    campaignKey: "sandbox_email_campaign",
    name: "Sandbox Email Campaign — Draft",
    channel: "EMAIL",
    campaignType: "TEST_ONLY",
    purpose: "Manual sandbox execution drill",
  },
  {
    campaignKey: "sandbox_sms_campaign",
    name: "Sandbox SMS Campaign — Draft",
    channel: "SMS",
    campaignType: "TEST_ONLY",
    purpose: "Manual sandbox SMS drill",
  },
  {
    campaignKey: "mission_reminder_campaign_draft",
    name: "Mission Reminder Campaign — Draft",
    channel: "EMAIL",
    campaignType: "MISSION",
    purpose: "Draft only — not authorized",
  },
  {
    campaignKey: "event_follow_up_campaign_draft",
    name: "Event Follow-up Campaign — Draft",
    channel: "EMAIL",
    campaignType: "EVENT",
    purpose: "Draft only — not authorized",
  },
  {
    campaignKey: "volunteer_thank_you_campaign_draft",
    name: "Volunteer Thank-you Campaign — Draft",
    channel: "EMAIL",
    campaignType: "VOLUNTEER",
    purpose: "Draft only — not authorized",
  },
  {
    campaignKey: "internal_staff_notification_draft",
    name: "Internal Staff Notification — Draft",
    channel: "EMAIL",
    campaignType: "INTERNAL",
    purpose: "Draft only — not authorized",
  },
];

for (const seed of seeds) {
  await prisma.communicationCampaign.upsert({
    where: {
      campaignScopeKey_campaignKey: {
        campaignScopeKey: "KELLY",
        campaignKey: seed.campaignKey,
      },
    },
    create: {
      campaignScopeKey: "KELLY",
      campaignKey: seed.campaignKey,
      name: seed.name,
      channel: seed.channel,
      campaignType: seed.campaignType,
      purpose: seed.purpose,
      status: "DRAFT",
      providerKey: "kccc-sandbox",
      providerMode: "SANDBOX",
      timezone: "America/Chicago",
    },
    update: {
      name: seed.name,
      purpose: seed.purpose,
    },
  });
}

const authorizedProd = await prisma.communicationLaunchAuthorization.count({
  where: {
    decision: "AUTHORIZED",
    authorizedMode: "PRODUCTION",
    revokedAt: null,
  },
});
const liveTests = await prisma.communicationLaunchAuthorization.count({
  where: {
    decision: "AUTHORIZED",
    authorizedMode: "CONTROLLED_LIVE_TEST",
    revokedAt: null,
  },
});
const prodRuns = await prisma.communicationExecutionRun.count({
  where: { mode: "PRODUCTION" },
});

console.log(
  JSON.stringify(
    {
      seededCampaigns: seeds.length,
      productionCampaignsAuthorized: authorizedProd,
      controlledLiveTestsAuthorized: liveTests,
      productionRuns: prodRuns,
      productionAttempts: 0,
      productionMessagesSent: 0,
      productionDispatchEnabled: false,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
