import "server-only";
import { prisma } from "@/server/db/prisma";
import {
  MOBILIZE_CAMPAIGN_SCOPE,
  MOBILIZE_PROVIDER,
} from "@/features/mobilize-integration/docs-revision";
import { categorizeAttendance } from "@/features/mobilize-integration/attendance";
import type { NormalizedMobilizeAttendance } from "@/features/mobilize-integration/types";

export async function listAttendanceObservations(limit = 100) {
  return prisma.mobilizeAttendanceObservation.findMany({
    where: { campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE, provider: MOBILIZE_PROVIDER },
    orderBy: { lastObservedAt: "desc" },
    take: limit,
  });
}

export async function listObservationsForExternalEvent(externalEventId: string) {
  return prisma.mobilizeAttendanceObservation.findMany({
    where: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      externalEventId,
      isActive: true,
    },
    orderBy: { lastObservedAt: "desc" },
  });
}

export async function upsertAttendanceObservation(input: {
  row: NormalizedMobilizeAttendance;
  localEventId: string | null;
  localMissionId: string | null;
  syncRunId: string;
  storePersonId: boolean;
}) {
  const statusCategory = categorizeAttendance(input.row);
  const existing = await prisma.mobilizeAttendanceObservation.findUnique({
    where: {
      campaignScopeKey_provider_externalAttendanceId: {
        campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
        provider: MOBILIZE_PROVIDER,
        externalAttendanceId: input.row.id,
      },
    },
  });
  const data = {
    externalEventId: input.row.eventId,
    externalTimeslotId: input.row.timeslotId,
    externalPersonId: input.storePersonId ? input.row.personId : null,
    localEventId: input.localEventId,
    localMissionId: input.localMissionId,
    remoteStatus: input.row.status ?? "UNKNOWN",
    statusCategory,
    attendedFlag: input.row.attended,
    signupAt: input.row.createdAt ? new Date(input.row.createdAt) : null,
    cancelledAt:
      input.row.isCancelled && input.row.modifiedAt
        ? new Date(input.row.modifiedAt)
        : existing?.cancelledAt ?? null,
    observedAttendedAt:
      input.row.attended === true && input.row.modifiedAt
        ? new Date(input.row.modifiedAt)
        : existing?.observedAttendedAt ?? null,
    remoteModifiedAt: input.row.modifiedAt ? new Date(input.row.modifiedAt) : null,
    contentFingerprint: input.row.fingerprint,
    lastObservedAt: new Date(),
    lastSyncRunId: input.syncRunId,
    privacyClassification: "AGGREGATE_ONLY" as const,
    remoteDeletedAt: null,
    isActive: true,
  };
  if (existing) {
    // Preserve prior cancellation history when reactivating.
    const cancelledAt =
      input.row.isCancelled
        ? data.cancelledAt
        : existing.cancelledAt;
    return prisma.mobilizeAttendanceObservation.update({
      where: { id: existing.id },
      data: { ...data, cancelledAt },
    });
  }
  return prisma.mobilizeAttendanceObservation.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      externalAttendanceId: input.row.id,
      firstObservedAt: new Date(),
      ...data,
    },
  });
}

export async function listPersonMatches() {
  return prisma.externalPersonMatch.findMany({
    where: { campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE, provider: MOBILIZE_PROVIDER },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function upsertPersonMatch(input: {
  externalPersonId: string;
  proposedLocalPersonId: string | null;
  matchMethod: string;
  confidenceCategory: string;
  status: string;
  conflictReason?: string | null;
  provenanceSummary?: string | null;
  reviewedByUserId?: string | null;
}) {
  const existing = await prisma.externalPersonMatch.findUnique({
    where: {
      campaignScopeKey_provider_externalPersonId: {
        campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
        provider: MOBILIZE_PROVIDER,
        externalPersonId: input.externalPersonId,
      },
    },
  });
  const data = {
    proposedLocalPersonId: input.proposedLocalPersonId,
    matchMethod: input.matchMethod as never,
    confidenceCategory: input.confidenceCategory as never,
    status: input.status as never,
    conflictReason: input.conflictReason ?? null,
    provenanceSummary: input.provenanceSummary ?? null,
    reviewedByUserId: input.reviewedByUserId ?? null,
    reviewedAt: input.reviewedByUserId ? new Date() : null,
  };
  if (existing) {
    return prisma.externalPersonMatch.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.externalPersonMatch.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      externalPersonId: input.externalPersonId,
      ...data,
    },
  });
}

export async function createAttendanceCorrelation(input: {
  missionId: string;
  localCheckInObjectType: string;
  localCheckInObjectId: string;
  attendanceObservationId: string;
  correlationReason?: string | null;
  confirmedByUserId: string;
  correctedFromCorrelationId?: string | null;
}) {
  return prisma.missionAttendanceCorrelation.create({
    data: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      missionId: input.missionId,
      localCheckInObjectType: input.localCheckInObjectType,
      localCheckInObjectId: input.localCheckInObjectId,
      attendanceObservationId: input.attendanceObservationId,
      status: input.correctedFromCorrelationId ? "CORRECTED" : "CONFIRMED",
      correlationReason: input.correlationReason ?? null,
      confirmedByUserId: input.confirmedByUserId,
      confirmedAt: new Date(),
      correctedFromCorrelationId: input.correctedFromCorrelationId ?? null,
    },
  });
}

export async function removeAttendanceCorrelation(
  correlationId: string,
  actorUserId: string,
) {
  return prisma.missionAttendanceCorrelation.update({
    where: { id: correlationId },
    data: {
      status: "REMOVED",
      confirmedByUserId: actorUserId,
      confirmedAt: new Date(),
    },
  });
}

export async function listCorrelationsForMission(missionId: string) {
  return prisma.missionAttendanceCorrelation.findMany({
    where: { missionId, campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE },
    orderBy: { createdAt: "desc" },
  });
}

export async function findLocalEventForExternalMobilizeEvent(
  externalEventId: string,
) {
  const ref = await prisma.externalObjectReference.findFirst({
    where: {
      campaignScopeKey: MOBILIZE_CAMPAIGN_SCOPE,
      provider: MOBILIZE_PROVIDER,
      objectType: "EVENT",
      externalObjectId: externalEventId,
      localObjectType: "Event",
      remoteDeletedAt: null,
    },
  });
  if (!ref?.localObjectId) return null;
  const event = await prisma.event.findFirst({
    where: { id: ref.localObjectId },
    select: { id: true, campaignDisplayTitle: true },
  });
  if (!event) return null;
  const mission = await prisma.campaignMission.findFirst({
    where: { sourceEventId: event.id },
    select: { id: true },
  });
  return { eventId: event.id, title: event.campaignDisplayTitle, missionId: mission?.id ?? null };
}
