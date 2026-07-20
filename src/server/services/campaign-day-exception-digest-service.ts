import "server-only";
import {
  assertIncidentDateInRange,
  type IncidentMissionContext,
} from "@/lib/missions/v21/incident-log";
import {
  assertNoMobilizeNetworkDuringDigest,
  buildDayExceptionDigestView,
  computeDigestSourceFingerprint,
  filterIncidentsForDigestViewer,
  getMobilizeAdapterBoundary,
  validateDigestReviewComplete,
  type DayExceptionDigestView,
  type DigestFilter,
} from "@/lib/missions/v21/exception-digest";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  campaignDayBounds,
  missionIntersectsCampaignDay,
} from "@/lib/missions/v21/day-briefing";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import { findCloseoutByDateKey } from "@/server/repositories/campaign-day-closeout-repository";
import {
  completeDigestReview,
  findDigestReviewByDateKey,
  markDigestReviewStale,
} from "@/server/repositories/campaign-day-exception-digest-repository";
import { findIncidentsForExceptionDigest } from "@/server/repositories/mission-incident-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Campaign Day Exception Digest requires campaign leadership access.",
    );
  }
}

function parseFilter(searchParams?: URLSearchParams | null): DigestFilter {
  if (!searchParams) return {};
  return {
    missionId: searchParams.get("missionId"),
    severity: searchParams.get("severity"),
    status: searchParams.get("status"),
    category: searchParams.get("category"),
    carryForward: (searchParams.get("carryForward") as DigestFilter["carryForward"]) ??
      null,
    followUpState: (searchParams.get(
      "followUpState",
    ) as DigestFilter["followUpState"]) ?? null,
  };
}

async function loadDigestInputs(options: {
  dateKey: string;
  now: Date;
  actor: AuthenticatedActor;
  filter?: DigestFilter | null;
}): Promise<DayExceptionDigestView> {
  assertNoMobilizeNetworkDuringDigest();
  void getMobilizeAdapterBoundary();
  const timezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertIncidentDateInRange(
    options.dateKey,
    options.now,
    timezone,
  );
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const { start, end } = campaignDayBounds(options.dateKey, timezone);
  const closeout = await findCloseoutByDateKey(options.dateKey);
  const day = (
    await loadMissionsForDayBriefing({
      rangeStart: start,
      rangeEnd: end,
      operationalLookbackStart: start,
      now: options.now,
    })
  ).filter((m) =>
    missionIntersectsCampaignDay(
      m.startsAt,
      m.endsAt,
      options.dateKey,
      timezone,
    ),
  );

  const contexts: IncidentMissionContext[] = day.map((m) => ({
    missionId: m.missionId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    timezone: m.timezone,
    campaignDateKey: options.dateKey,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    executionStatus: m.execution.status,
    isCancelled: m.operationalStatus === "CANCELLED",
    closeoutReviewedAt: closeout?.reviewedAt ?? null,
  }));

  const incidents = await findIncidentsForExceptionDigest(options.dateKey);
  let review = await findDigestReviewByDateKey(options.dateKey);
  const { visible, confidentialOmitted } = filterIncidentsForDigestViewer(
    incidents,
    options.actor.primarySystemRole,
  );
  const currentFingerprint = computeDigestSourceFingerprint(visible);

  if (
    review?.status === "REVIEWED" &&
    review.sourceFingerprint !== currentFingerprint
  ) {
    review = await markDigestReviewStale({
      campaignDateKey: options.dateKey,
      now: options.now,
      actorUserId: options.actor.userId,
    });
  }

  return buildDayExceptionDigestView({
    campaignDate: options.dateKey,
    now: options.now,
    campaignTimezone: timezone,
    missions: contexts,
    incidents,
    visibleIncidents: visible,
    confidentialOmitted,
    review,
    filter: options.filter,
  });
}

export async function getDayExceptionDigest(options: {
  dateKey?: string;
  actor: AuthenticatedActor;
  now?: Date;
  searchParams?: URLSearchParams | null;
}): Promise<DayExceptionDigestView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const timezone = getPublicAppConfig().campaignTimezone;
  const dateKey = options.dateKey ?? campaignDateKey(now, timezone);
  return loadDigestInputs({
    dateKey,
    now,
    actor: options.actor,
    filter: parseFilter(options.searchParams),
  });
}

/**
 * Explicit Complete Exception Review — lazy-creates review metadata only.
 * Does not mutate incidents, Closeout, Launch, Follow-up, or Mission lifecycle.
 */
export async function completeDayExceptionDigestReview(options: {
  dateKey: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<DayExceptionDigestView> {
  assertLeadership(options.actor);
  const validated = validateDigestReviewComplete(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const now = options.now ?? new Date();
  const timezone = getPublicAppConfig().campaignTimezone;
  const ranged = assertIncidentDateInRange(options.dateKey, now, timezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const incidents = await findIncidentsForExceptionDigest(options.dateKey);
  const { visible } = filterIncidentsForDigestViewer(
    incidents,
    options.actor.primarySystemRole,
  );
  const fingerprint = computeDigestSourceFingerprint(visible);
  await completeDigestReview({
    campaignDateKey: options.dateKey,
    sourceFingerprint: fingerprint,
    note: validated.patch.note,
    actorUserId: options.actor.userId,
    now,
  });
  return loadDigestInputs({
    dateKey: options.dateKey,
    now,
    actor: options.actor,
  });
}
