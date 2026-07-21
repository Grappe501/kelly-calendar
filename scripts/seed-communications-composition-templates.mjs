/**
 * Seed safe D23 sandbox templates only. Idempotent by templateKey.
 * Does not enable production dispatch. No real recipient data.
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

function hash(parts) {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

const seeds = [
  {
    templateKey: "email_sandbox_test",
    name: "Email — Sandbox Test",
    channel: "EMAIL",
    category: "TEST_ONLY",
    status: "ACTIVE",
    approve: true,
    subjectTemplate: "Sandbox test: {{mission.title}}",
    textTemplate:
      "Hello {{recipient.first_name}},\n\nThis is a sandbox test for {{mission.title}} on {{mission.date}}.\n{{communication.call_to_action}}\n",
    htmlTemplate:
      "<p>Hello {{recipient.first_name}},</p><p>This is a sandbox test for {{mission.title}} on {{mission.date}}.</p><p>{{communication.call_to_action}}</p>",
    smsTemplate: null,
    complianceProfileKey: "EMAIL_SANDBOX_TEST",
    requiredTokens: ["mission.title", "mission.date"],
    optionalTokens: ["recipient.first_name", "communication.call_to_action"],
  },
  {
    templateKey: "sms_sandbox_test",
    name: "SMS — Sandbox Test",
    channel: "SMS",
    category: "TEST_ONLY",
    status: "ACTIVE",
    approve: true,
    subjectTemplate: null,
    textTemplate: null,
    htmlTemplate: null,
    smsTemplate:
      "Sandbox: {{mission.title}} {{mission.date}}. {{communication.call_to_action}}",
    complianceProfileKey: "SMS_SANDBOX_TEST",
    requiredTokens: ["mission.title"],
    optionalTokens: ["mission.date", "communication.call_to_action"],
  },
  {
    templateKey: "mission_reminder_draft",
    name: "Mission Reminder — Draft",
    channel: "EMAIL",
    category: "EVENT_REMINDER",
    status: "DRAFT",
    approve: false,
    subjectTemplate: "Reminder: {{mission.title}}",
    textTemplate: "Join us for {{mission.title}} at {{mission.location}}.",
    htmlTemplate: "<p>Join us for {{mission.title}} at {{mission.location}}.</p>",
    smsTemplate: null,
    complianceProfileKey: "EMAIL_SANDBOX_TEST",
    requiredTokens: ["mission.title"],
    optionalTokens: ["mission.location"],
  },
];

for (const seed of seeds) {
  const template = await prisma.communicationTemplate.upsert({
    where: {
      campaignScopeKey_templateKey: {
        campaignScopeKey: "KELLY",
        templateKey: seed.templateKey,
      },
    },
    create: {
      campaignScopeKey: "KELLY",
      templateKey: seed.templateKey,
      name: seed.name,
      channel: seed.channel,
      category: seed.category,
      status: seed.status,
      purpose: "D23 seed",
      description: "Safe fabricated seed — not production content authority.",
    },
    update: {
      name: seed.name,
      status: seed.status,
    },
  });
  const existing = await prisma.communicationTemplateVersion.findFirst({
    where: { templateId: template.id, versionNumber: 1 },
  });
  if (!existing) {
    const contentHash = hash([
      seed.subjectTemplate ?? "",
      seed.htmlTemplate ?? "",
      seed.textTemplate ?? "",
      seed.smsTemplate ?? "",
      seed.complianceProfileKey,
    ]);
    await prisma.communicationTemplateVersion.create({
      data: {
        templateId: template.id,
        versionNumber: 1,
        status: seed.approve ? "APPROVED" : "DRAFT",
        subjectTemplate: seed.subjectTemplate,
        htmlTemplate: seed.htmlTemplate,
        textTemplate: seed.textTemplate,
        smsTemplate: seed.smsTemplate,
        requiredTokensJson: seed.requiredTokens,
        optionalTokensJson: seed.optionalTokens,
        complianceProfileKey: seed.complianceProfileKey,
        changeSummary: "D23 seed version",
        contentHash,
        approvedAt: seed.approve ? new Date() : null,
      },
    });
    console.log("Seeded", seed.templateKey, seed.approve ? "(approved sandbox)" : "(draft)");
  } else {
    console.log("Skip existing", seed.templateKey);
  }
}

const counts = {
  templates: await prisma.communicationTemplate.count(),
  versions: await prisma.communicationTemplateVersion.count(),
  compositions: await prisma.communicationComposition.count(),
  artifacts: await prisma.communicationRenderArtifact.count(),
};
console.log("D23 seed counts:", counts);
await prisma.$disconnect();
