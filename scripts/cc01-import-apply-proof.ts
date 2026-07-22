/**
 * CC-01 synthetic count proof against the live import-approval service.
 *
 * Run:
 *   node scripts/run-with-h-drive-env.cjs npx --yes tsx scripts/cc01-import-apply-proof.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { AuthenticatedActor } from "../src/server/auth/actor";
import {
  approveImportRecord,
  mergeImportRecord,
  rejectImportRecord,
} from "../src/server/services/import-approval-service";

const prisma = new PrismaClient();
const PROOF_TAG = `[cc01-proof:${new Date().toISOString().slice(0, 10)}]`;

function fp(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "kelly.command@example.invalid", isActive: true },
  });
  if (!user) throw new Error("Synthetic Kelly user missing — run auth seed");

  const calendar = await prisma.calendar.findFirst({
    where: { slug: "public-events", archivedAt: null },
  });
  if (!calendar) throw new Error("public-events calendar missing");

  const actor: AuthenticatedActor = {
    userId: user.id,
    sessionId: "cc01-proof-session",
    tokenId: "cc01-proof-token",
    primarySystemRole: "KELLY",
    systemRoles: ["KELLY"],
    teamIds: [],
    teamMemberships: [],
    isActive: true,
    email: user.email,
    displayName: user.displayName ?? "Kelly",
  };

  const source = await prisma.externalCalendarSource.create({
    data: {
      provider: "GOOGLE_CALENDAR",
      sourceType: "PROOF",
      displayName: "CC-01 Proof Source",
      sourceFingerprint: fp(["cc01-proof-source", randomUUID()]),
      syncDirection: "IMPORT_ONLY",
      syncStatus: "ACTIVE",
      historicalFloor: new Date("2025-11-01T00:00:00.000Z"),
      createdByUserId: user.id,
    },
  });

  const run = await prisma.calendarImportRun.create({
    data: {
      externalSourceId: source.id,
      requestedStart: new Date("2026-09-01T00:00:00.000Z"),
      requestedEnd: new Date("2026-09-30T00:00:00.000Z"),
      status: "STAGED",
      stagedCount: 3,
      operatorUserId: user.id,
      manifestJson: { proof: true, tag: PROOF_TAG },
    },
  });

  const eventFp = fp(["cc01-approve", PROOF_TAG, randomUUID()]);
  const rejectFp = fp(["cc01-reject", PROOF_TAG, randomUUID()]);
  const mergeFp = fp(["cc01-merge", PROOF_TAG, randomUUID()]);

  const basePayload = {
    sourceSystem: "GOOGLE_CALENDAR",
    status: "confirmed",
    summary: `CC-01 Proof Event ${PROOF_TAG}`,
    location: "Little Rock, AR",
    start: { dateTime: "2026-09-20T15:00:00-05:00", timeZone: "America/Chicago" },
    end: { dateTime: "2026-09-20T16:00:00-05:00", timeZone: "America/Chicago" },
  };

  const approveRecord = await prisma.calendarImportRecord.create({
    data: {
      importRunId: run.id,
      rawFingerprint: eventFp,
      reviewStatus: "UNREVIEWED",
      duplicateStatus: "NEW",
      normalizedPayload: { ...basePayload, sourceEventId: `proof-approve-${randomUUID().slice(0, 8)}` },
      reviewNotes: PROOF_TAG,
    },
  });
  const rejectRecord = await prisma.calendarImportRecord.create({
    data: {
      importRunId: run.id,
      rawFingerprint: rejectFp,
      reviewStatus: "UNREVIEWED",
      duplicateStatus: "NEW",
      normalizedPayload: {
        ...basePayload,
        summary: `CC-01 Proof Reject ${PROOF_TAG}`,
        sourceEventId: `proof-reject-${randomUUID().slice(0, 8)}`,
      },
      reviewNotes: PROOF_TAG,
    },
  });

  const mergeTarget = await prisma.$transaction(async (tx) => {
    const year = 2026;
    const counter = await tx.eventNumberCounter.findUnique({ where: { year } });
    let eventNumber: string;
    if (!counter) {
      await tx.eventNumberCounter.create({ data: { year, nextValue: 2 } });
      eventNumber = `KCCC-${year}-0001`;
    } else {
      eventNumber = `KCCC-${year}-${String(counter.nextValue).padStart(4, "0")}`;
      await tx.eventNumberCounter.update({
        where: { year },
        data: { nextValue: { increment: 1 } },
      });
    }
    const event = await tx.event.create({
      data: {
        eventNumber,
        sourceType: "MANUAL",
        createdByUserId: user.id,
        ownerUserId: user.id,
        primaryCalendarId: calendar.id,
        internalTitle: `CC-01 Merge Target ${PROOF_TAG}`,
        campaignDisplayTitle: `CC-01 Merge Target ${PROOF_TAG}`,
        status: "HOLD",
        startsAt: new Date("2026-09-21T15:00:00-05:00"),
        endsAt: new Date("2026-09-21T16:00:00-05:00"),
        timezone: "America/Chicago",
        city: "Little Rock",
        privateNotes: PROOF_TAG,
        version: 1,
      },
    });
    await tx.eventCalendarMembership.create({
      data: {
        eventId: event.id,
        calendarId: calendar.id,
        membershipType: "PRIMARY",
        isPrimary: true,
        createdByUserId: user.id,
      },
    });
    return event;
  });

  const mergeRecord = await prisma.calendarImportRecord.create({
    data: {
      importRunId: run.id,
      rawFingerprint: mergeFp,
      reviewStatus: "UNREVIEWED",
      duplicateStatus: "LIKELY_DUPLICATE",
      canonicalEventId: mergeTarget.id,
      normalizedPayload: {
        ...basePayload,
        summary: `CC-01 Proof Merge ${PROOF_TAG}`,
        sourceEventId: `proof-merge-${randomUUID().slice(0, 8)}`,
      },
      reviewNotes: PROOF_TAG,
    },
  });

  const eventsBefore = await prisma.event.count();
  const missionsBefore = await prisma.campaignMission.count();

  const first = await approveImportRecord({
    actor,
    importRunId: run.id,
    recordId: approveRecord.id,
    requestId: "cc01-proof-1",
  });
  const second = await approveImportRecord({
    actor,
    importRunId: run.id,
    recordId: approveRecord.id,
    requestId: "cc01-proof-2",
  });
  const rejected = await rejectImportRecord({
    actor,
    importRunId: run.id,
    recordId: rejectRecord.id,
    requestId: "cc01-proof-3",
    notes: "CC-01 proof reject",
  });
  const merged = await mergeImportRecord({
    actor,
    importRunId: run.id,
    recordId: mergeRecord.id,
    canonicalEventId: mergeTarget.id,
    requestId: "cc01-proof-4",
    notes: "CC-01 proof merge",
  });

  const eventsAfter = await prisma.event.count();
  const missionsAfter = await prisma.campaignMission.count();
  const sourceAfter = await prisma.externalCalendarSource.findUniqueOrThrow({
    where: { id: source.id },
  });

  const deltaEvents = eventsAfter - eventsBefore;
  // merge target was created before the count snapshot → approve should add exactly +1
  const checks: Array<[string, boolean]> = [
    ["first_approve_creates_one", first.eventsCreated === 1 && first.outcome === "created"],
    ["second_approve_creates_zero", second.eventsCreated === 0],
    ["event_count_delta_is_one", deltaEvents === 1],
    ["mission_count_unchanged", missionsAfter === missionsBefore],
    ["reject_creates_zero", rejected.eventsCreated === 0 && rejected.outcome === "rejected"],
    ["merge_creates_zero", merged.eventsCreated === 0 && merged.outcome === "merged"],
    ["mission_flag_false", first.missionMutated === false && merged.missionMutated === false],
    ["external_flag_false", first.externalCalendarMutated === false],
    ["source_remains_import_only", sourceAfter.syncDirection === "IMPORT_ONLY"],
  ];

  let failed = false;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
    if (!ok) failed = true;
  }

  console.log(
    JSON.stringify(
      {
        proofTag: PROOF_TAG,
        eventsBefore,
        eventsAfter,
        deltaEvents,
        missionsBefore,
        missionsAfter,
        first: {
          outcome: first.outcome,
          eventsCreated: first.eventsCreated,
          eventNumber: first.eventNumber,
        },
        second: { outcome: second.outcome, eventsCreated: second.eventsCreated },
        rejected: { outcome: rejected.outcome, eventsCreated: rejected.eventsCreated },
        merged: { outcome: merged.outcome, eventsCreated: merged.eventsCreated },
        importRunId: run.id,
      },
      null,
      2,
    ),
  );

  if (failed) {
    process.exitCode = 1;
    console.error("CC-01 count proof FAILED");
  } else {
    console.log("CC-01 count proof PASSED");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
