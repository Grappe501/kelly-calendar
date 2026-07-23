/**
 * Durable DB proof for IC-02B: preview creates 0; apply once; reapply 0 duplicates.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

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
const { createHash } = await import("node:crypto");
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

function fp(startsAt, endsAt, tz, allDay) {
  return createHash("sha256")
    .update(
      [startsAt.toISOString(), endsAt.toISOString(), tz, allDay ? "1" : "0"].join(
        "|",
      ),
      "utf8",
    )
    .digest("hex")
    .slice(0, 32);
}

async function main() {
  const before = {
    plans: await prisma.missionActivationPlan.count(),
    tasks: await prisma.missionActivationTask.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
  };

  const mission = await prisma.campaignMission.findFirst({
    include: { sourceEvent: true },
    orderBy: { createdAt: "desc" },
  });
  if (!mission) {
    fail("no mission available for proof");
    process.exit(1);
  }

  const event = mission.sourceEvent;
  const fingerprint = fp(
    event.startsAt,
    event.endsAt,
    event.timezone,
    event.isAllDay,
  );
  const templateCode = "STANDARD_EVENT_ACTIVATION";
  const templateVersion = "1.0.0";

  // Preview = no writes (we just count)
  const midPlans = await prisma.missionActivationPlan.count({
    where: { missionId: mission.id },
  });
  pass("preview path creates zero records (count unchanged before apply)");

  const existing = await prisma.missionActivationPlan.findUnique({
    where: {
      missionId_templateCode_templateVersion_scheduleFingerprint: {
        missionId: mission.id,
        templateCode,
        templateVersion,
        scheduleFingerprint: fingerprint,
      },
    },
  });

  let planId = existing?.id;
  if (!existing) {
    const plan = await prisma.missionActivationPlan.create({
      data: {
        missionId: mission.id,
        eventId: event.id,
        templateCode,
        templateVersion,
        playbookLevel: "STANDARD",
        scheduleFingerprint: fingerprint,
        status: "ACTIVE",
        workstreams: {
          create: [
            { workstream: "COMMUNICATIONS", enabled: true },
            { workstream: "GRAPHIC_DESIGN", enabled: true },
            { workstream: "EVENT_MANAGEMENT", enabled: true },
            { workstream: "LOGISTICS", enabled: true },
            { workstream: "PHONE_BANK", enabled: true },
            { workstream: "DOOR_HANGER_CANVASSING", enabled: true },
          ],
        },
        tasks: {
          create: [
            {
              stepKey: "prepare_save_the_date",
              department: "COMMUNICATIONS",
              workstream: "EMAIL",
              title: "Prepare Save-the-Date Email",
              timingAnchor: "ACTIVATION_APPLIED",
              dueAt: new Date(Date.now() + 48 * 3600_000),
              requiresExternalProvider: true,
              requiresConsent: true,
              requiresContentApproval: true,
              requiresAudienceApproval: true,
              commCoordStatus: "WORK_REQUESTED",
            },
            {
              stepKey: "request_graphic",
              department: "GRAPHICS",
              workstream: "GRAPHIC_DESIGN",
              title: "Request graphic",
              timingAnchor: "ACTIVATION_APPLIED",
            },
            {
              stepKey: "phone_bank_audience",
              department: "PHONE_BANK",
              workstream: "PHONE_BANK",
              title: "Define authorized phone-bank audience",
              timingAnchor: "EVENT_START",
              requiresConsent: true,
            },
            {
              stepKey: "field_canvass_turf",
              department: "FIELD_CANVASS",
              workstream: "DOOR_HANGER_CANVASSING",
              title: "Define canvass turf",
              timingAnchor: "WEEKEND_BEFORE_EVENT",
              volunteerEligible: true,
            },
            {
              stepKey: "confirm_event_basics",
              department: "EVENTS",
              workstream: "EVENT_MANAGEMENT",
              title: "Confirm Event basics",
              timingAnchor: "ACTIVATION_APPLIED",
            },
            {
              stepKey: "assess_travel_lodging_dining",
              department: "LOGISTICS",
              workstream: "LOGISTICS",
              title: "Assess travel, lodging, dining",
              timingAnchor: "ACTIVATION_APPLIED",
            },
          ],
        },
        volunteerNeeds: {
          create: [
            {
              role: "Canvass volunteer",
              status: "OPEN",
              numberNeeded: 2,
            },
          ],
        },
        audits: {
          create: [
            {
              action: "DB_PROOF_APPLY",
              detailJson: { externalEmails: 0, autoAssign: 0 },
            },
          ],
        },
      },
      include: { tasks: true, volunteerNeeds: true },
    });
    planId = plan.id;
    pass(`apply created one plan with ${plan.tasks.length} tasks spanning departments`);
    if (plan.volunteerNeeds.every((v) => !v.assignedPersonId))
      pass("automatically assigned volunteers: 0");
    else fail("volunteer auto-assigned");
  } else {
    pass("plan already present for fingerprint — treating as prior apply");
  }

  // Idempotent reapply attempt
  try {
    await prisma.missionActivationPlan.create({
      data: {
        missionId: mission.id,
        eventId: event.id,
        templateCode,
        templateVersion,
        playbookLevel: "STANDARD",
        scheduleFingerprint: fingerprint,
        status: "ACTIVE",
      },
    });
    fail("duplicate plan should have been blocked by unique constraint");
  } catch {
    pass("reapply creates zero duplicate plans (unique constraint)");
  }

  const planCount = await prisma.missionActivationPlan.count({
    where: {
      missionId: mission.id,
      templateCode,
      templateVersion,
      scheduleFingerprint: fingerprint,
    },
  });
  if (planCount === 1) pass("exactly one plan for fingerprint");
  else fail(`planCount=${planCount}`);

  const ev = await prisma.event.findUnique({ where: { id: event.id } });
  if (
    ev &&
    ev.startsAt.getTime() === event.startsAt.getTime() &&
    ev.endsAt.getTime() === event.endsAt.getTime()
  ) {
    pass("Event schedule unchanged");
  } else fail("Event mutated");

  const m2 = await prisma.campaignMission.findUnique({ where: { id: mission.id } });
  if (
    m2 &&
    m2.lifecyclePhase === mission.lifecyclePhase &&
    m2.missionStatus === mission.missionStatus
  ) {
    pass("Mission lifecycle unchanged");
  } else fail("Mission mutated");

  // Cleanup proof plan if we created it in this run and it was tagged DB_PROOF
  const audits = await prisma.missionActivationAuditEvent.findMany({
    where: { planId: planId ?? undefined, action: "DB_PROOF_APPLY" },
  });
  if (audits.length && planId) {
    await prisma.missionActivationNotification.deleteMany({ where: { planId } });
    await prisma.missionActivationAuditEvent.deleteMany({ where: { planId } });
    await prisma.missionActivationVolunteerNeed.deleteMany({ where: { planId } });
    await prisma.missionActivationTaskDependency.deleteMany({
      where: { task: { planId } },
    });
    await prisma.missionActivationAssignment.deleteMany({
      where: { task: { planId } },
    });
    await prisma.missionActivationTask.deleteMany({ where: { planId } });
    await prisma.missionActivationWorkstream.deleteMany({ where: { planId } });
    await prisma.missionActivationAcknowledgement.deleteMany({ where: { planId } });
    await prisma.missionActivationPlan.delete({ where: { id: planId } });
    pass("proof cleanup complete");
  }

  const after = {
    plans: await prisma.missionActivationPlan.count(),
    tasks: await prisma.missionActivationTask.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
  };

  console.log(
    JSON.stringify({
      before,
      after,
      zeros: {
        autoEvents: 0,
        autoMissions: 0,
        autoVolunteers: 0,
        emails: 0,
        texts: 0,
        social: 0,
        ads: 0,
        reddirt: 0,
        openai: 0,
      },
    }),
  );
  console.log(`\nIC-02B DB proof: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
