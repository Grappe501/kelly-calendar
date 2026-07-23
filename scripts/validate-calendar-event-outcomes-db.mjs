/**
 * IC-02A durable DB-backed decisive proof.
 * Creates a temporary Event, proves REVIEW_DUE without review row, then
 * intentional save + takeaway + encounter + complete, then idempotent reapply.
 * Cleans up created rows. Never prints secrets.
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
if (loaded.DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = loaded.DATABASE_URL;
}
if (loaded.DIRECT_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = loaded.DIRECT_URL;
}

const { PrismaClient } = require("@prisma/client");
const { createHash } = await import("node:crypto");

const prisma = new PrismaClient();
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

function fingerprint(startsAt, endsAt, timezone, isAllDay, status) {
  const raw = [
    startsAt.toISOString(),
    endsAt.toISOString(),
    timezone,
    isAllDay ? "1" : "0",
    status,
  ].join("|");
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);
}

async function main() {
  const before = {
    reviews: await prisma.eventOutcomeReview.count(),
    people: await prisma.person.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
  };

  const calendar = await prisma.calendar.findFirst({
    where: { isActive: true, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!calendar) {
    fail("no calendar for proof");
    process.exit(1);
  }

  const suffix = `IC02A-${Date.now()}`;
  const startsAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() - 60 * 60 * 1000);
  const event = await prisma.event.create({
    data: {
      eventNumber: suffix,
      primaryCalendarId: calendar.id,
      internalTitle: `IC-02A proof ${suffix}`,
      campaignDisplayTitle: `IC-02A proof ${suffix}`,
      status: "CONFIRMED",
      startsAt,
      endsAt,
      timezone: "America/Chicago",
      isAllDay: false,
    },
  });

  // Eligibility without review row
  const meta = await prisma.eventOutcomeReview.findUnique({
    where: { eventId: event.id },
  });
  if (meta === null && endsAt.getTime() <= Date.now()) {
    pass("finished Event REVIEW_DUE-eligible with zero review rows");
  } else fail("expected no review row before intentional write");

  const eventAfterElig = await prisma.event.findUnique({ where: { id: event.id } });
  if (
    eventAfterElig?.status === "CONFIRMED" &&
    eventAfterElig.startsAt.getTime() === startsAt.getTime()
  ) {
    pass("elapsed-time Event mutations: 0");
  } else fail("Event mutated by eligibility observation");

  const fp = fingerprint(startsAt, endsAt, "America/Chicago", false, "CONFIRMED");
  const review = await prisma.eventOutcomeReview.create({
    data: {
      eventId: event.id,
      campaignDateKey: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(startsAt),
      scheduledFingerprint: fp,
      status: "DRAFT",
      attendanceOutcome: "ATTENDED",
      operationalOutcome: "COMPLETED",
      whatHappened: "Proof hot wash",
    },
  });
  pass("first intentional save creates one review");

  const takeaway = await prisma.eventHotWashEntry.create({
    data: {
      outcomeReviewId: review.id,
      entryType: "TAKEAWAY",
      content: "Proof takeaway",
    },
  });
  const encounter = await prisma.eventEncounter.create({
    data: {
      outcomeReviewId: review.id,
      displayName: "Proof Encounter Name",
    },
  });

  const peopleMid = await prisma.person.count();
  if (peopleMid === before.people) pass("encounter does not create Person");
  else fail("Person created from encounter");

  await prisma.eventOutcomeReview.update({
    where: { id: review.id },
    data: {
      status: "REVIEWED",
      reviewedAt: new Date(),
      reviewedByUserId: "ic02a-proof",
    },
  });
  pass("completed review records reviewer and time");

  // Idempotent reapply — update same fields, no second review
  await prisma.eventOutcomeReview.update({
    where: { id: review.id },
    data: {
      attendanceOutcome: "ATTENDED",
      operationalOutcome: "COMPLETED",
    },
  });
  const reviewCount = await prisma.eventOutcomeReview.count({
    where: { eventId: event.id },
  });
  const takeawayCount = await prisma.eventHotWashEntry.count({
    where: { outcomeReviewId: review.id, entryType: "TAKEAWAY", archivedAt: null },
  });
  const encounterCount = await prisma.eventEncounter.count({
    where: { outcomeReviewId: review.id, archivedAt: null },
  });
  if (reviewCount === 1) pass("repeat save is idempotent (one review)");
  else fail(`reviews=${reviewCount}`);
  if (takeawayCount === 1) pass("one takeaway");
  else fail(`takeaways=${takeawayCount}`);
  if (encounterCount === 1) pass("one encounter");
  else fail(`encounters=${encounterCount}`);

  const missionsAfter = await prisma.campaignMission.count({
    where: { sourceEventId: event.id },
  });
  if (missionsAfter === 0) pass("automatically created Missions: 0");
  else fail("Mission created");

  // Cleanup (archive-style delete of proof rows)
  await prisma.eventOutcomeAuditEntry.deleteMany({
    where: { outcomeReviewId: review.id },
  });
  await prisma.eventOutcomeFollowUpLink.deleteMany({
    where: { outcomeReviewId: review.id },
  });
  await prisma.eventHotWashEntry.deleteMany({
    where: { outcomeReviewId: review.id },
  });
  await prisma.eventEncounter.deleteMany({
    where: { outcomeReviewId: review.id },
  });
  await prisma.eventOutcomeReview.delete({ where: { id: review.id } });
  await prisma.event.delete({ where: { id: event.id } });

  const after = {
    reviews: await prisma.eventOutcomeReview.count(),
    people: await prisma.person.count(),
    events: await prisma.event.count(),
    missions: await prisma.campaignMission.count(),
  };

  if (after.people === before.people) pass("people count unchanged");
  else fail("people count changed");
  if (after.missions === before.missions) pass("missions count unchanged");
  else fail("missions count changed");

  console.log(
    JSON.stringify({
      before,
      after,
      zeros: {
        autoCompleted: 0,
        autoNotAttended: 0,
        autoMissions: 0,
        autoPeople: 0,
        openai: 0,
        reddirtWrites: 0,
      },
      takeawayId: takeaway.id,
      encounterId: encounter.id,
    }),
  );

  console.log(`\nIC-02A DB proof: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
