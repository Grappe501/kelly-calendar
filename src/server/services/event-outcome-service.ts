import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  evaluateEventReviewEligibility,
  outcomeIndicatorLabel,
} from "@/lib/calendar/event-outcomes/eligibility";
import {
  ATTENDANCE_OUTCOMES,
  EVENT_OUTCOME_BUILD_ID,
  EVENT_OUTCOME_CAMPAIGN_SCOPE,
  HOT_WASH_ENTRY_TYPES,
  OPERATIONAL_OUTCOMES,
  type EventAttendanceOutcomeCode,
  type EventHotWashEntryTypeCode,
  type EventOperationalOutcomeCode,
  type EventOutcomePrivacyClassCode,
} from "@/lib/calendar/event-outcomes/types";
import {
  NAME_ONLY_MATCH_BLOCKED,
  redactForBroadReport,
} from "@/lib/calendar/event-outcomes/privacy";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  appendHotWashEntry,
  appendOutcomeAudit,
  archiveHotWashEntry,
  createEncounter,
  createEventFollowupRow,
  createFollowUpLink,
  createOutcomeReview,
  findOutcomeReviewByEventId,
  findOutcomeReviewMetaByEventId,
  getEventScheduleRow,
  listReviewsForQueue,
  updateEncounterContactReview,
  updateOutcomeReview,
} from "@/server/repositories/event-outcome-repository";

function requireOutcomeAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Event outcome / hot wash requires campaign calendar access.",
    );
  }
}

function requireLeadership(actor: AuthenticatedActor) {
  // Contact-review entry requires full calendar access (Kelly / Campaign Manager).
  requireOutcomeAccess(actor);
  void actor;
}

function isAttendance(value: unknown): value is EventAttendanceOutcomeCode {
  return (
    typeof value === "string" &&
    (ATTENDANCE_OUTCOMES as readonly string[]).includes(value)
  );
}

function isOperational(value: unknown): value is EventOperationalOutcomeCode {
  return (
    typeof value === "string" &&
    (OPERATIONAL_OUTCOMES as readonly string[]).includes(value)
  );
}

function isEntryType(value: unknown): value is EventHotWashEntryTypeCode {
  return (
    typeof value === "string" &&
    (HOT_WASH_ENTRY_TYPES as readonly string[]).includes(value)
  );
}

function scheduleFromRow(row: NonNullable<Awaited<ReturnType<typeof getEventScheduleRow>>>) {
  return {
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timezone: row.timezone,
    isAllDay: row.isAllDay,
    status: row.status,
  };
}

/**
 * Read-only eligibility + optional existing review. Creates ZERO records.
 */
export async function getEventOutcomeWorkspace(
  actor: AuthenticatedActor,
  eventId: string,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  const event = await getEventScheduleRow(eventId);
  if (!event || event.archivedAt) {
    throw new NotFoundError("Event not found.");
  }

  const existing = await findOutcomeReviewByEventId(eventId);
  const eligibility = evaluateEventReviewEligibility({
    schedule: scheduleFromRow(event),
    now,
    existing: existing
      ? {
          status: existing.status,
          scheduledFingerprint: existing.scheduledFingerprint,
          archivedAt: existing.archivedAt,
        }
      : null,
  });

  // Mark stale in-memory only on read; persist stale on next intentional write.
  const indicator = outcomeIndicatorLabel(
    eligibility.eligibility,
    existing?.followUpNeeded,
  );

  return {
    buildId: EVENT_OUTCOME_BUILD_ID,
    campaignScopeKey: EVENT_OUTCOME_CAMPAIGN_SCOPE,
    event: {
      id: event.id,
      eventNumber: event.eventNumber,
      title: event.campaignDisplayTitle || event.internalTitle,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      isAllDay: event.isAllDay,
      status: event.status,
      countyId: event.countyId,
      city: event.city,
      mission: event.campaignMission
        ? {
            id: event.campaignMission.id,
            sourceEventNumber: event.campaignMission.sourceEventNumber,
            missionStatus: event.campaignMission.missionStatus,
            lifecyclePhase: event.campaignMission.lifecyclePhase,
          }
        : null,
    },
    eligibility,
    indicator,
    review: existing
      ? {
          id: existing.id,
          status: existing.status,
          attendanceOutcome: existing.attendanceOutcome,
          operationalOutcome: existing.operationalOutcome,
          reviewedAt: existing.reviewedAt?.toISOString() ?? null,
          reviewedByUserId: existing.reviewedByUserId,
          summary: existing.summary,
          whatHappened: existing.whatHappened,
          attendanceEstimate: existing.attendanceEstimate,
          notableIssues: existing.notableIssues,
          missionWorkNeeded: existing.missionWorkNeeded,
          followUpNeeded: existing.followUpNeeded,
          scheduledFingerprint: existing.scheduledFingerprint,
          staleAt: existing.staleAt?.toISOString() ?? null,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
          hotWash: existing.hotWash.map((e) => ({
            id: e.id,
            entryType: e.entryType,
            content: e.content,
            importance: e.importance,
            occurredAt: e.occurredAt?.toISOString() ?? null,
            authorUserId: e.authorUserId,
            privacyClassification: e.privacyClassification,
            correctsEntryId: e.correctsEntryId,
            createdAt: e.createdAt.toISOString(),
          })),
          encounters: existing.encounters.map((e) => ({
            id: e.id,
            displayName: e.displayName,
            organizationName: e.organizationName,
            roleTitle: e.roleTitle,
            meetingContext: e.meetingContext,
            whyItMatters: e.whyItMatters,
            campaignCommitments: e.campaignCommitments,
            personCommitments: e.personCommitments,
            suggestedNextAction: e.suggestedNextAction,
            followUpDueAt: e.followUpDueAt?.toISOString() ?? null,
            privacyClassification: e.privacyClassification,
            contactDetailsProvided: e.contactDetailsProvided,
            contactReviewStatus: e.contactReviewStatus,
            linkedPersonId: e.linkedPersonId,
            recordedAt: e.recordedAt.toISOString(),
          })),
          followupLinkCount: existing.followupLinks.length,
        }
      : null,
    guarantees: {
      timePassingDoesNotComplete: true,
      timePassingDoesNotMarkNotAttended: true,
      readsCreateZeroRecords: true,
      encounterDoesNotCreatePerson: true,
      encounterDoesNotCreateConsent: true,
      outcomeDoesNotMutateMissionLifecycle: true,
    },
  };
}

async function ensureReviewForWrite(
  eventId: string,
  actor: AuthenticatedActor,
  now: Date,
) {
  const event = await getEventScheduleRow(eventId);
  if (!event || event.archivedAt) {
    throw new NotFoundError("Event not found.");
  }
  const existing = await findOutcomeReviewByEventId(eventId);
  const eligibility = evaluateEventReviewEligibility({
    schedule: scheduleFromRow(event),
    now,
    existing: existing
      ? {
          status: existing.status,
          scheduledFingerprint: existing.scheduledFingerprint,
          archivedAt: existing.archivedAt,
        }
      : null,
  });

  if (existing) {
    if (eligibility.scheduleChanged && existing.status !== "STALE") {
      await updateOutcomeReview(existing.id, {
        status: "STALE",
        staleAt: now,
        staleReason: "Material schedule change detected on write.",
        scheduledFingerprint: eligibility.scheduledFingerprint,
      });
      await appendOutcomeAudit({
        outcomeReviewId: existing.id,
        action: "MARK_STALE",
        actorUserId: actor.userId,
        detailJson: {
          previousFingerprint: existing.scheduledFingerprint,
          nextFingerprint: eligibility.scheduledFingerprint,
        },
      });
      return findOutcomeReviewByEventId(eventId);
    }
    return existing;
  }

  const created = await createOutcomeReview({
    eventId,
    campaignDateKey: eligibility.campaignDateKey,
    scheduledFingerprint: eligibility.scheduledFingerprint,
    status: "DRAFT",
  });
  await appendOutcomeAudit({
    outcomeReviewId: created.id,
    action: "CREATE_DRAFT",
    actorUserId: actor.userId,
    detailJson: { eligibility: eligibility.eligibility },
  });
  return findOutcomeReviewByEventId(eventId);
}

export async function saveEventOutcome(
  actor: AuthenticatedActor,
  eventId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  const review = await ensureReviewForWrite(eventId, actor, now);
  if (!review) throw new NotFoundError("Could not create outcome review.");

  const patch: Parameters<typeof updateOutcomeReview>[1] = {};

  if ("attendanceOutcome" in body) {
    if (body.attendanceOutcome !== null && !isAttendance(body.attendanceOutcome)) {
      throw new ValidationError("Invalid attendanceOutcome.");
    }
    patch.attendanceOutcome = (body.attendanceOutcome as EventAttendanceOutcomeCode | null) ?? null;
  }
  if ("operationalOutcome" in body) {
    if (
      body.operationalOutcome !== null &&
      !isOperational(body.operationalOutcome)
    ) {
      throw new ValidationError("Invalid operationalOutcome.");
    }
    patch.operationalOutcome =
      (body.operationalOutcome as EventOperationalOutcomeCode | null) ?? null;
  }
  if ("summary" in body) {
    patch.summary =
      typeof body.summary === "string" ? body.summary.slice(0, 4000) : null;
  }
  if ("whatHappened" in body) {
    patch.whatHappened =
      typeof body.whatHappened === "string"
        ? body.whatHappened.slice(0, 8000)
        : null;
  }
  if ("attendanceEstimate" in body) {
    const n = body.attendanceEstimate;
    patch.attendanceEstimate =
      typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }
  if ("notableIssues" in body) {
    patch.notableIssues =
      typeof body.notableIssues === "string"
        ? body.notableIssues.slice(0, 4000)
        : null;
  }
  if ("missionWorkNeeded" in body) {
    patch.missionWorkNeeded = Boolean(body.missionWorkNeeded);
  }
  if ("followUpNeeded" in body) {
    patch.followUpNeeded = Boolean(body.followUpNeeded);
  }

  // Completing review requires explicit flag — never from elapsed time.
  if (body.completeReview === true) {
    if (!review.attendanceOutcome && !patch.attendanceOutcome) {
      throw new ValidationError(
        "Attendance outcome is required to complete review.",
      );
    }
    if (!review.operationalOutcome && !patch.operationalOutcome) {
      throw new ValidationError(
        "Operational outcome is required to complete review.",
      );
    }
    patch.status = "REVIEWED";
    patch.reviewedAt = now;
    patch.reviewedByUserId = actor.userId;
  } else if (review.status === "REVIEWED" && Object.keys(patch).length > 0) {
    // Edits after review keep REVIEWED unless schedule stale path already ran.
    // Intentionally do not auto-revert to DRAFT.
  } else if (review.status !== "STALE" && review.status !== "REVIEWED") {
    patch.status = "DRAFT";
  }

  const updated = await updateOutcomeReview(review.id, patch);
  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: body.completeReview === true ? "COMPLETE_REVIEW" : "SAVE_OUTCOME",
    actorUserId: actor.userId,
    detailJson: {
      attendanceOutcome: updated.attendanceOutcome,
      operationalOutcome: updated.operationalOutcome,
      status: updated.status,
    },
  });

  return getEventOutcomeWorkspace(actor, eventId, now);
}

export async function addHotWashEntry(
  actor: AuthenticatedActor,
  eventId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  if (!isEntryType(body.entryType)) {
    throw new ValidationError("Invalid hot-wash entryType.");
  }
  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (!content) throw new ValidationError("Hot-wash content is required.");

  const review = await ensureReviewForWrite(eventId, actor, now);
  if (!review) throw new NotFoundError("Could not create outcome review.");

  const privacy = (
    typeof body.privacyClassification === "string"
      ? body.privacyClassification
      : "INTERNAL"
  ) as EventOutcomePrivacyClassCode;

  const correctsEntryId =
    typeof body.correctsEntryId === "string" ? body.correctsEntryId : null;
  if (correctsEntryId && body.entryType !== "CORRECTION") {
    throw new ValidationError("correctsEntryId requires entryType CORRECTION.");
  }

  const entry = await appendHotWashEntry({
    outcomeReviewId: review.id,
    entryType: body.entryType,
    content: content.slice(0, 4000),
    importance:
      typeof body.importance === "number" ? Math.floor(body.importance) : 0,
    occurredAt:
      typeof body.occurredAt === "string" ? new Date(body.occurredAt) : null,
    authorUserId: actor.userId,
    privacyClassification: privacy,
    correctsEntryId,
    sourceLabel:
      typeof body.sourceLabel === "string" ? body.sourceLabel : null,
  });

  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: correctsEntryId ? "HOT_WASH_CORRECTION" : "HOT_WASH_APPEND",
    actorUserId: actor.userId,
    detailJson: { entryId: entry.id, entryType: entry.entryType },
  });

  return getEventOutcomeWorkspace(actor, eventId, now);
}

export async function archiveHotWash(
  actor: AuthenticatedActor,
  eventId: string,
  entryId: string,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  const review = await findOutcomeReviewByEventId(eventId);
  if (!review) throw new NotFoundError("Outcome review not found.");
  const entry = review.hotWash.find((e) => e.id === entryId);
  if (!entry) throw new NotFoundError("Hot-wash entry not found.");
  await archiveHotWashEntry(entryId);
  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: "HOT_WASH_ARCHIVE",
    actorUserId: actor.userId,
    detailJson: { entryId },
  });
  return getEventOutcomeWorkspace(actor, eventId, now);
}

export async function addEncounter(
  actor: AuthenticatedActor,
  eventId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) throw new ValidationError("Encounter displayName is required.");

  // Hard block name-only auto-match
  if (body.autoMatchByName === true) {
    throw new ValidationError(NAME_ONLY_MATCH_BLOCKED);
  }

  const linkedPersonId =
    typeof body.linkedPersonId === "string" ? body.linkedPersonId : null;
  if (linkedPersonId && body.matchByNameOnly === true) {
    throw new ValidationError(NAME_ONLY_MATCH_BLOCKED);
  }

  const review = await ensureReviewForWrite(eventId, actor, now);
  if (!review) throw new NotFoundError("Could not create outcome review.");

  const encounter = await createEncounter({
    outcomeReviewId: review.id,
    displayName: displayName.slice(0, 200),
    organizationName:
      typeof body.organizationName === "string" ? body.organizationName : null,
    roleTitle: typeof body.roleTitle === "string" ? body.roleTitle : null,
    meetingContext:
      typeof body.meetingContext === "string" ? body.meetingContext : null,
    whyItMatters:
      typeof body.whyItMatters === "string" ? body.whyItMatters : null,
    campaignCommitments:
      typeof body.campaignCommitments === "string"
        ? body.campaignCommitments
        : null,
    personCommitments:
      typeof body.personCommitments === "string"
        ? body.personCommitments
        : null,
    suggestedNextAction:
      typeof body.suggestedNextAction === "string"
        ? body.suggestedNextAction
        : null,
    followUpDueAt:
      typeof body.followUpDueAt === "string"
        ? new Date(body.followUpDueAt)
        : null,
    privacyClassification: (
      typeof body.privacyClassification === "string"
        ? body.privacyClassification
        : "INTERNAL"
    ) as EventOutcomePrivacyClassCode,
    contactDetailsProvided: Boolean(body.contactDetailsProvided),
    recordedByUserId: actor.userId,
    linkedPersonId,
    linkedOrganizationId:
      typeof body.linkedOrganizationId === "string"
        ? body.linkedOrganizationId
        : null,
    externalReference:
      typeof body.externalReference === "string"
        ? body.externalReference
        : null,
  });

  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: "ENCOUNTER_CREATE",
    actorUserId: actor.userId,
    detailJson: {
      encounterId: encounter.id,
      linkedPersonId: encounter.linkedPersonId,
      createdPerson: false,
      createdConsent: false,
      enteredCommunications: false,
    },
  });

  return getEventOutcomeWorkspace(actor, eventId, now);
}

/**
 * Explicit "Review as contact" — does NOT silently convert.
 * Sets AWAITING_REVIEW; operator must enter D20 consent workflow separately.
 */
export async function requestEncounterContactReview(
  actor: AuthenticatedActor,
  eventId: string,
  encounterId: string,
  now: Date = new Date(),
) {
  requireLeadership(actor);
  const review = await findOutcomeReviewByEventId(eventId);
  if (!review) throw new NotFoundError("Outcome review not found.");
  const encounter = review.encounters.find((e) => e.id === encounterId);
  if (!encounter) throw new NotFoundError("Encounter not found.");

  await updateEncounterContactReview(encounterId, "AWAITING_REVIEW");
  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: "ENCOUNTER_CONTACT_REVIEW_REQUESTED",
    actorUserId: actor.userId,
    detailJson: {
      encounterId,
      silentConvert: false,
      message:
        "Entered contact-review queue only. No Person/consent/communications created.",
    },
  });
  return getEventOutcomeWorkspace(actor, eventId, now);
}

/**
 * Create EventFollowup only after explicit confirmFollowUp: true.
 * Does not complete hot wash; does not mutate Mission.
 */
export async function createFollowUpFromOutcome(
  actor: AuthenticatedActor,
  eventId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireOutcomeAccess(actor);
  if (body.confirmFollowUp !== true) {
    throw new ValidationError(
      "Follow-up creation requires confirmFollowUp: true after operator confirmation.",
    );
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Follow-up from event hot wash";

  const review = await ensureReviewForWrite(eventId, actor, now);
  if (!review) throw new NotFoundError("Could not create outcome review.");

  const followup = await createEventFollowupRow({
    eventId,
    title: title.slice(0, 300),
    dueAt: typeof body.dueAt === "string" ? new Date(body.dueAt) : null,
  });

  await createFollowUpLink({
    outcomeReviewId: review.id,
    eventFollowupId: followup.id,
    hotWashEntryId:
      typeof body.hotWashEntryId === "string" ? body.hotWashEntryId : null,
    encounterId: typeof body.encounterId === "string" ? body.encounterId : null,
    reason: typeof body.reason === "string" ? body.reason : null,
    createdByUserId: actor.userId,
  });

  await updateOutcomeReview(review.id, { followUpNeeded: true });
  await appendOutcomeAudit({
    outcomeReviewId: review.id,
    action: "FOLLOWUP_CREATE",
    actorUserId: actor.userId,
    detailJson: {
      eventFollowupId: followup.id,
      completesHotWash: false,
      mutatesMission: false,
    },
  });

  return getEventOutcomeWorkspace(actor, eventId, now);
}

/**
 * Review queue — reads existing reviews + computes REVIEW_DUE for finished Events
 * without creating rows. Optional `dueCandidates` are eligibility-only (no DB write).
 */
export async function getOutcomeReviewQueue(
  actor: AuthenticatedActor,
  options: {
    now?: Date;
    includeDueWithoutReview?: boolean;
    eventIdsForDueScan?: string[];
  } = {},
) {
  requireOutcomeAccess(actor);
  const now = options.now ?? new Date();
  const rows = await listReviewsForQueue({ take: 200 });

  const sections = {
    dueNow: [] as Array<Record<string, unknown>>,
    overdue: [] as Array<Record<string, unknown>>,
    draft: [] as Array<Record<string, unknown>>,
    reviewed: [] as Array<Record<string, unknown>>,
    stale: [] as Array<Record<string, unknown>>,
    cancelledPostponed: [] as Array<Record<string, unknown>>,
    unknownOutcome: [] as Array<Record<string, unknown>>,
    followUpGaps: [] as Array<Record<string, unknown>>,
    encountersAwaitingContactReview: [] as Array<Record<string, unknown>>,
  };

  for (const row of rows) {
    const eligibility = evaluateEventReviewEligibility({
      schedule: {
        startsAt: row.event.startsAt,
        endsAt: row.event.endsAt,
        timezone: row.event.timezone,
        isAllDay: row.event.isAllDay,
        status: row.event.status,
      },
      now,
      existing: {
        status: row.status,
        scheduledFingerprint: row.scheduledFingerprint,
        archivedAt: row.archivedAt,
      },
    });
    const item = {
      eventId: row.eventId,
      reviewId: row.id,
      title: row.event.campaignDisplayTitle || row.event.internalTitle,
      eventNumber: row.event.eventNumber,
      eligibility: eligibility.eligibility,
      attendanceOutcome: row.attendanceOutcome,
      operationalOutcome: row.operationalOutcome,
      status: row.status,
      endsAt: row.event.endsAt.toISOString(),
      missionId: row.event.campaignMission?.id ?? null,
      followUpNeeded: row.followUpNeeded,
      awaitingContactReview: row.encounters.length,
    };

    if (row.status === "STALE" || eligibility.eligibility === "STALE") {
      sections.stale.push(item);
    } else if (row.status === "DRAFT") {
      sections.draft.push(item);
    } else if (row.status === "REVIEWED") {
      sections.reviewed.push(item);
    }

    if (
      row.event.status === "CANCELLED" ||
      row.event.status === "POSTPONED"
    ) {
      sections.cancelledPostponed.push(item);
    }
    if (
      row.attendanceOutcome === "UNKNOWN" ||
      row.operationalOutcome === "UNKNOWN"
    ) {
      sections.unknownOutcome.push(item);
    }
    if (row.followUpNeeded && row.followupLinks.length === 0) {
      sections.followUpGaps.push(item);
    }
    if (row.encounters.length > 0) {
      sections.encountersAwaitingContactReview.push(item);
    }

    if (eligibility.eligibility === "REVIEW_DUE") {
      const overdueMs = now.getTime() - eligibility.effectiveEndAt.getTime();
      if (overdueMs > 24 * 60 * 60 * 1000) sections.overdue.push(item);
      else sections.dueNow.push(item);
    }
  }

  // Optional due scan without creating reviews
  const dueWithoutReview: Array<Record<string, unknown>> = [];
  if (options.includeDueWithoutReview && options.eventIdsForDueScan?.length) {
    for (const eventId of options.eventIdsForDueScan) {
      const meta = await findOutcomeReviewMetaByEventId(eventId);
      if (meta) continue;
      const event = await getEventScheduleRow(eventId);
      if (!event || event.archivedAt) continue;
      const eligibility = evaluateEventReviewEligibility({
        schedule: scheduleFromRow(event),
        now,
        existing: null,
      });
      if (eligibility.eligibility === "REVIEW_DUE") {
        dueWithoutReview.push({
          eventId: event.id,
          reviewId: null,
          title: event.campaignDisplayTitle || event.internalTitle,
          eventNumber: event.eventNumber,
          eligibility: "REVIEW_DUE",
          createdReview: false,
        });
      }
    }
  }

  return {
    buildId: EVENT_OUTCOME_BUILD_ID,
    sections,
    dueWithoutReview,
    createdOnLoad: 0,
    guarantees: {
      queueLoadCreatesZeroRecords: true,
    },
  };
}

export async function getOutcomeReport(
  actor: AuthenticatedActor,
  eventId: string,
  options: { includeConfidential?: boolean } = {},
) {
  requireOutcomeAccess(actor);
  const workspace = await getEventOutcomeWorkspace(actor, eventId);
  const maySeeConfidential = Boolean(options.includeConfidential);

  const hotWash = (workspace.review?.hotWash ?? []).map((e) => {
    const r = redactForBroadReport({
      content: e.content,
      privacyClassification: e.privacyClassification,
      viewerMaySeeConfidential: maySeeConfidential,
    });
    return { ...e, content: r.content, redacted: r.redacted };
  });

  const encounters = (workspace.review?.encounters ?? []).map((e) => {
    const ctx = redactForBroadReport({
      content: e.meetingContext ?? "",
      privacyClassification: e.privacyClassification,
      viewerMaySeeConfidential: maySeeConfidential,
    });
    return {
      ...e,
      meetingContext: ctx.content || null,
      campaignCommitments: maySeeConfidential
        ? e.campaignCommitments
        : e.privacyClassification === "CONFIDENTIAL"
          ? "[redacted — confidential]"
          : e.campaignCommitments,
      redacted: ctx.redacted,
    };
  });

  return {
    ...workspace,
    report: {
      hotWash,
      encounters,
      confidentialIncluded: maySeeConfidential,
    },
  };
}

export { evaluateEventReviewEligibility };
