import {
  addDaysToDateKey,
  classifyIncidentDay,
  formatFullCampaignDate,
} from "@/lib/missions/v21/incident-log/incident-date";
import { EMERGENCY_NOTICE } from "@/lib/missions/v21/incident-log/incident-config";
import type {
  IncidentMissionContext,
  MissionIncidentPersisted,
} from "@/lib/missions/v21/incident-log/types";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";
import {
  DEFAULT_EXCEPTION_DIGEST_CONFIG,
  EXCEPTION_DIGEST_BOUNDARY,
  type ExceptionDigestConfig,
} from "@/lib/missions/v21/exception-digest/digest-config";
import {
  applyDigestFilters,
  deriveExceptionDigestEntries,
  selectLaunchQualifiedEntries,
  selectTomorrowPreviewEntries,
} from "@/lib/missions/v21/exception-digest/derive-digest";
import {
  computeDigestSourceFingerprint,
  isDigestFingerprintStale,
} from "@/lib/missions/v21/exception-digest/fingerprint";
import { countsFromVisibleEntries } from "@/lib/missions/v21/exception-digest/privacy";
import type {
  CampaignDayIncidentDigestReviewPersisted,
  DayExceptionDigestView,
  DigestFilter,
} from "@/lib/missions/v21/exception-digest/types";

export function buildDayExceptionDigestView(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  missions: IncidentMissionContext[];
  incidents: MissionIncidentPersisted[];
  /** Incidents already filtered for viewer privacy when counting. */
  visibleIncidents: MissionIncidentPersisted[];
  confidentialOmitted: boolean;
  review: CampaignDayIncidentDigestReviewPersisted | null;
  filter?: DigestFilter | null;
  config?: ExceptionDigestConfig;
}): DayExceptionDigestView {
  const config = input.config ?? DEFAULT_EXCEPTION_DIGEST_CONFIG;
  const dayClass = classifyIncidentDay(
    input.campaignDate,
    input.now,
    input.campaignTimezone,
  );
  const contextsByMissionId = new Map(
    input.missions.map((m) => [m.missionId, m]),
  );
  const digestReviewedAt = input.review?.reviewedAt ?? null;
  const currentFingerprint = computeDigestSourceFingerprint(
    input.visibleIncidents,
  );
  const fingerprintStale =
    input.review?.status === "REVIEWED" || input.review?.status === "STALE"
      ? isDigestFingerprintStale(
          input.review.sourceFingerprint,
          currentFingerprint,
        ) || input.review.status === "STALE"
      : false;

  let entries = deriveExceptionDigestEntries({
    selectedDateKey: input.campaignDate,
    incidents: input.visibleIncidents,
    contextsByMissionId,
    digestReviewedAt,
    now: input.now,
  });
  entries = applyDigestFilters(entries, input.filter).slice(
    0,
    config.sectionLimits.digestEntries,
  );

  const sortedMissions = [...input.missions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );
  const first = sortedMissions[0];
  const primaryId = selectTodaysMission(
    sortedMissions.map((m) => ({
      id: m.missionId,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      lifecyclePhase: m.lifecyclePhase as never,
    })),
    { now: input.now, timezone: input.campaignTimezone },
  ).primaryId;
  const primary = sortedMissions.find((m) => m.missionId === primaryId);

  const reviewStatus = input.review?.status ?? "NONE";
  const isStale =
    fingerprintStale ||
    reviewStatus === "STALE" ||
    (Boolean(digestReviewedAt) &&
      entries.some((e) => e.buckets.includes("UPDATED_AFTER_DIGEST_REVIEW")));

  return {
    campaignDate: input.campaignDate,
    dateLabel: formatFullCampaignDate(
      input.campaignDate,
      input.campaignTimezone,
    ),
    timezone: input.campaignTimezone,
    isToday: dayClass.isToday,
    isPast: dayClass.isPast,
    isFuture: dayClass.isFuture,
    generatedAt: input.now.toISOString(),
    emergencyNotice: EMERGENCY_NOTICE,
    boundaryMessage: EXCEPTION_DIGEST_BOUNDARY,
    firstMissionTitle: first?.title ?? null,
    primaryMissionTitle: primary?.title ?? null,
    firstMissionId: first?.missionId ?? null,
    primaryMissionId: primary?.missionId ?? null,
    counts: countsFromVisibleEntries(entries, input.confidentialOmitted),
    entries,
    review: {
      exists: Boolean(input.review),
      status: reviewStatus === "NONE" ? "NONE" : reviewStatus,
      reviewedAt: input.review?.reviewedAt ?? null,
      reviewedByUserId: input.review?.reviewedByUserId ?? null,
      note: input.review?.note ?? null,
      sourceFingerprint: input.review?.sourceFingerprint ?? null,
      currentFingerprint,
      isStale,
      staleAt: input.review?.staleAt ?? null,
      canCompleteReview: true,
    },
    closeoutReviewedAt:
      input.missions.find((m) => m.closeoutReviewedAt)?.closeoutReviewedAt ??
      null,
    tomorrowPreview: selectTomorrowPreviewEntries(entries),
    launchQualified: selectLaunchQualifiedEntries(entries),
    navigation: {
      previousHref: `/system/briefing/${addDaysToDateKey(input.campaignDate, -1)}/exceptions`,
      nextHref: `/system/briefing/${addDaysToDateKey(input.campaignDate, 1)}/exceptions`,
      todayHref: "/system/briefing/exceptions",
      briefingHref: `/system/briefing/${input.campaignDate}`,
      incidentsHref: `/system/briefing/${input.campaignDate}/incidents`,
      closeoutHref: `/system/briefing/${input.campaignDate}/closeout`,
      launchHref: `/system/briefing/${input.campaignDate}/launch`,
      commandCenterHref: "/system/missions/command-center",
      reportHref: `/system/briefing/${input.campaignDate}/exceptions/report`,
      calendarHref: "/system/calendar",
    },
    isolation: {
      mutatesIncidents: false,
      mutatesCloseout: false,
      mutatesLaunch: false,
      mutatesFollowUp: false,
      mutatesMissionLifecycle: false,
      createsMobilizeRecords: false,
      performsRemoteSync: false,
    },
  };
}
