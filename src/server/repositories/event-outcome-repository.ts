import "server-only";

import { prisma } from "@/server/db/prisma";
import { EVENT_OUTCOME_CAMPAIGN_SCOPE } from "@/lib/calendar/event-outcomes/types";
import type {
  EventAttendanceOutcomeCode,
  EventHotWashEntryTypeCode,
  EventOperationalOutcomeCode,
  EventOutcomePrivacyClassCode,
  EventOutcomeReviewStatusCode,
} from "@/lib/calendar/event-outcomes/types";

export async function findOutcomeReviewByEventId(eventId: string) {
  return prisma.eventOutcomeReview.findUnique({
    where: { eventId },
    include: {
      hotWash: {
        where: { archivedAt: null },
        orderBy: { createdAt: "asc" },
      },
      encounters: {
        where: { archivedAt: null },
        orderBy: { recordedAt: "asc" },
      },
      followupLinks: true,
    },
  });
}

export async function findOutcomeReviewMetaByEventId(eventId: string) {
  return prisma.eventOutcomeReview.findUnique({
    where: { eventId },
    select: {
      id: true,
      status: true,
      scheduledFingerprint: true,
      archivedAt: true,
      followUpNeeded: true,
      attendanceOutcome: true,
      operationalOutcome: true,
    },
  });
}

export async function countOutcomeReviews(where?: {
  campaignScopeKey?: string;
}) {
  return prisma.eventOutcomeReview.count({
    where: {
      campaignScopeKey: where?.campaignScopeKey ?? EVENT_OUTCOME_CAMPAIGN_SCOPE,
      archivedAt: null,
    },
  });
}

export async function createOutcomeReview(input: {
  eventId: string;
  campaignDateKey: string;
  scheduledFingerprint: string;
  attendanceOutcome?: EventAttendanceOutcomeCode | null;
  operationalOutcome?: EventOperationalOutcomeCode | null;
  summary?: string | null;
  whatHappened?: string | null;
  attendanceEstimate?: number | null;
  notableIssues?: string | null;
  missionWorkNeeded?: boolean;
  followUpNeeded?: boolean;
  status?: EventOutcomeReviewStatusCode;
}) {
  return prisma.eventOutcomeReview.create({
    data: {
      campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
      eventId: input.eventId,
      campaignDateKey: input.campaignDateKey,
      scheduledFingerprint: input.scheduledFingerprint,
      attendanceOutcome: input.attendanceOutcome ?? null,
      operationalOutcome: input.operationalOutcome ?? null,
      summary: input.summary ?? null,
      whatHappened: input.whatHappened ?? null,
      attendanceEstimate: input.attendanceEstimate ?? null,
      notableIssues: input.notableIssues ?? null,
      missionWorkNeeded: input.missionWorkNeeded ?? false,
      followUpNeeded: input.followUpNeeded ?? false,
      status: input.status ?? "DRAFT",
    },
  });
}

export async function updateOutcomeReview(
  id: string,
  data: {
    attendanceOutcome?: EventAttendanceOutcomeCode | null;
    operationalOutcome?: EventOperationalOutcomeCode | null;
    summary?: string | null;
    whatHappened?: string | null;
    attendanceEstimate?: number | null;
    notableIssues?: string | null;
    missionWorkNeeded?: boolean;
    followUpNeeded?: boolean;
    status?: EventOutcomeReviewStatusCode;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
    scheduledFingerprint?: string;
    staleAt?: Date | null;
    staleReason?: string | null;
    archivedAt?: Date | null;
  },
) {
  return prisma.eventOutcomeReview.update({
    where: { id },
    data,
  });
}

export async function appendHotWashEntry(input: {
  outcomeReviewId: string;
  entryType: EventHotWashEntryTypeCode;
  content: string;
  importance?: number;
  occurredAt?: Date | null;
  authorUserId?: string | null;
  privacyClassification?: EventOutcomePrivacyClassCode;
  correctsEntryId?: string | null;
  sourceLabel?: string | null;
}) {
  return prisma.eventHotWashEntry.create({
    data: {
      campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
      outcomeReviewId: input.outcomeReviewId,
      entryType: input.entryType,
      content: input.content,
      importance: input.importance ?? 0,
      occurredAt: input.occurredAt ?? null,
      authorUserId: input.authorUserId ?? null,
      privacyClassification: input.privacyClassification ?? "INTERNAL",
      correctsEntryId: input.correctsEntryId ?? null,
      sourceLabel: input.sourceLabel ?? null,
    },
  });
}

export async function archiveHotWashEntry(id: string) {
  return prisma.eventHotWashEntry.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function createEncounter(input: {
  outcomeReviewId: string;
  displayName: string;
  organizationName?: string | null;
  roleTitle?: string | null;
  meetingContext?: string | null;
  whyItMatters?: string | null;
  campaignCommitments?: string | null;
  personCommitments?: string | null;
  suggestedNextAction?: string | null;
  followUpDueAt?: Date | null;
  privacyClassification?: EventOutcomePrivacyClassCode;
  contactDetailsProvided?: boolean;
  recordedByUserId?: string | null;
  linkedPersonId?: string | null;
  linkedOrganizationId?: string | null;
  externalReference?: string | null;
}) {
  return prisma.eventEncounter.create({
    data: {
      campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
      outcomeReviewId: input.outcomeReviewId,
      displayName: input.displayName,
      organizationName: input.organizationName ?? null,
      roleTitle: input.roleTitle ?? null,
      meetingContext: input.meetingContext ?? null,
      whyItMatters: input.whyItMatters ?? null,
      campaignCommitments: input.campaignCommitments ?? null,
      personCommitments: input.personCommitments ?? null,
      suggestedNextAction: input.suggestedNextAction ?? null,
      followUpDueAt: input.followUpDueAt ?? null,
      privacyClassification: input.privacyClassification ?? "INTERNAL",
      contactDetailsProvided: input.contactDetailsProvided ?? false,
      recordedByUserId: input.recordedByUserId ?? null,
      linkedPersonId: input.linkedPersonId ?? null,
      linkedOrganizationId: input.linkedOrganizationId ?? null,
      externalReference: input.externalReference ?? null,
    },
  });
}

export async function updateEncounterContactReview(
  id: string,
  contactReviewStatus:
    | "NOT_REQUESTED"
    | "AWAITING_REVIEW"
    | "DECLINED"
    | "CONVERTED_TO_CONTACT_WORKFLOW",
  linkedPersonId?: string | null,
) {
  return prisma.eventEncounter.update({
    where: { id },
    data: {
      contactReviewStatus,
      ...(linkedPersonId !== undefined ? { linkedPersonId } : {}),
    },
  });
}

export async function appendOutcomeAudit(input: {
  outcomeReviewId: string;
  action: string;
  actorUserId?: string | null;
  detailJson?: Record<string, unknown>;
}) {
  return prisma.eventOutcomeAuditEntry.create({
    data: {
      campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
      outcomeReviewId: input.outcomeReviewId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      detailJson: (input.detailJson ?? {}) as object,
    },
  });
}

export async function createEventFollowupRow(input: {
  eventId: string;
  title: string;
  dueAt?: Date | null;
}) {
  return prisma.eventFollowup.create({
    data: {
      eventId: input.eventId,
      title: input.title,
      dueAt: input.dueAt ?? null,
      status: "NOT_STARTED",
    },
  });
}

export async function createFollowUpLink(input: {
  outcomeReviewId: string;
  eventFollowupId: string;
  hotWashEntryId?: string | null;
  encounterId?: string | null;
  reason?: string | null;
  createdByUserId?: string | null;
}) {
  return prisma.eventOutcomeFollowUpLink.create({
    data: {
      campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
      outcomeReviewId: input.outcomeReviewId,
      eventFollowupId: input.eventFollowupId,
      hotWashEntryId: input.hotWashEntryId ?? null,
      encounterId: input.encounterId ?? null,
      reason: input.reason ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export async function listReviewsForQueue(input: {
  campaignScopeKey?: string;
  take?: number;
}) {
  return prisma.eventOutcomeReview.findMany({
    where: {
      campaignScopeKey: input.campaignScopeKey ?? EVENT_OUTCOME_CAMPAIGN_SCOPE,
      archivedAt: null,
    },
    include: {
      event: {
        select: {
          id: true,
          eventNumber: true,
          campaignDisplayTitle: true,
          internalTitle: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
          isAllDay: true,
          status: true,
          countyId: true,
          city: true,
          campaignMission: {
            select: { id: true, sourceEventNumber: true, missionStatus: true },
          },
        },
      },
      encounters: {
        where: {
          archivedAt: null,
          contactReviewStatus: "AWAITING_REVIEW",
        },
        select: { id: true },
      },
      followupLinks: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: input.take ?? 200,
  });
}

export async function getEventScheduleRow(eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId },
    select: {
      id: true,
      eventNumber: true,
      campaignDisplayTitle: true,
      internalTitle: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      isAllDay: true,
      status: true,
      archivedAt: true,
      countyId: true,
      city: true,
      campaignMission: {
        select: {
          id: true,
          sourceEventNumber: true,
          missionStatus: true,
          lifecyclePhase: true,
        },
      },
    },
  });
}

export async function countRelatedZeroProof(eventId: string) {
  const [reviews, people, missions] = await Promise.all([
    prisma.eventOutcomeReview.count({ where: { eventId } }),
    prisma.person.count(),
    prisma.campaignMission.count({
      where: { sourceEventId: eventId },
    }),
  ]);
  return { reviews, people, missions };
}
