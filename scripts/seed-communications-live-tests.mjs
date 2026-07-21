/**
 * Seed draft D26 live-test programs only. No recipients, auth, or credentials.
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
    programKey: "controlled_email_live_test",
    name: "Controlled Email Live Test — Draft",
    channel: "EMAIL",
  },
  {
    programKey: "controlled_sms_live_test",
    name: "Controlled SMS Live Test — Draft",
    channel: "SMS",
  },
];

for (const seed of seeds) {
  await prisma.communicationLiveTestProgram.upsert({
    where: {
      campaignScopeKey_programKey: {
        campaignScopeKey: "KELLY",
        programKey: seed.programKey,
      },
    },
    create: {
      campaignScopeKey: "KELLY",
      programKey: seed.programKey,
      name: seed.name,
      channel: seed.channel,
      providerKey: "kccc-sandbox",
      providerState: "SANDBOX_ONLY",
      status: "DRAFT",
      purpose: "Infrastructure verification draft — not authorized",
    },
    update: { name: seed.name },
  });
}

const approvedRecipients = await prisma.communicationLiveTestRecipient.count({
  where: { status: "APPROVED" },
});
const activeAuth = await prisma.communicationLiveTestAuthorization.count({
  where: { status: "AUTHORIZED" },
});
const consumed = await prisma.communicationLiveTestAuthorization.count({
  where: { status: "CONSUMED" },
});

console.log(
  JSON.stringify(
    {
      seededPrograms: seeds.length,
      approvedLiveTestRecipients: approvedRecipients,
      approvedReadinessReviews: 0,
      activeLiveTestAuthorizations: activeAuth,
      consumedAuthorizations: consumed,
      liveProviderRequests: 0,
      liveDeliveredMessages: 0,
      productionCampaignsAuthorized: 0,
      generalProductionDispatchEnabled: false,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
