import "server-only";

import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import type { CommunicationsPlanSnapshot } from "@/lib/missions/communications-operations";
import type { CompliancePlanSnapshot } from "@/lib/missions/compliance-operations";
import type { ConstituentPlanSnapshot } from "@/lib/missions/constituent-operations";
import type { FinancePlanSnapshot } from "@/lib/missions/finance-operations";
import type { LogisticsPlanSnapshot } from "@/lib/missions/logistics-operations";
import type { MissionTimelineInput } from "@/lib/missions/mission-timeline";
import { prisma } from "@/server/db/prisma";

export type MissionTravelSnapshot = Pick<
  MissionTimelineInput,
  | "departureAt"
  | "targetArrivalAt"
  | "travelRequired"
  | "estimatedDurationMinutes"
  | "bufferMinutes"
>;

export type MissionDaySnapshotRow = {
  version: number;
  status: string;
  arrivalAt: string | null;
  confirmationStatus: string | null;
};

export type MissionGeoSnapshot = {
  countyId: string | null;
  countyName: string | null;
  city: string | null;
  staffAssignedCount: number;
  staffRequiredCount: number;
  /** True when a VOLUNTEER_LEAD role has an assigned user. */
  volunteerLeadAssigned: boolean;
};

export type MissionCommsSnapshot = CommunicationsPlanSnapshot;
export type MissionLogisticsSnapshot = LogisticsPlanSnapshot;
export type MissionFinanceSnapshot = FinancePlanSnapshot;
export type MissionComplianceSnapshot = CompliancePlanSnapshot;
export type MissionConstituentSnapshot = ConstituentPlanSnapshot;

export type MissionContextBundle = {
  readiness: Map<string, EventReadinessResult>;
  travel: Map<string, MissionTravelSnapshot>;
  day: Map<string, MissionDaySnapshotRow>;
  geo: Map<string, MissionGeoSnapshot>;
  comms: Map<string, MissionCommsSnapshot>;
  logistics: Map<string, MissionLogisticsSnapshot>;
  finance: Map<string, MissionFinanceSnapshot>;
  compliance: Map<string, MissionComplianceSnapshot>;
  constituent: Map<string, MissionConstituentSnapshot>;
};

/**
 * Load readiness + travel plan snapshots for Today missions.
 * Travel fields are operational planning values only (no route geometry / PII dumps).
 */
export async function loadMissionContextForIds(
  eventIds: string[],
): Promise<MissionContextBundle> {
  const readiness = new Map<string, EventReadinessResult>();
  const travel = new Map<string, MissionTravelSnapshot>();
  const day = new Map<string, MissionDaySnapshotRow>();
  const geo = new Map<string, MissionGeoSnapshot>();
  const comms = new Map<string, MissionCommsSnapshot>();
  const logistics = new Map<string, MissionLogisticsSnapshot>();
  const finance = new Map<string, MissionFinanceSnapshot>();
  const compliance = new Map<string, MissionComplianceSnapshot>();
  const constituent = new Map<string, MissionConstituentSnapshot>();
  const ids = [...new Set(eventIds)].slice(0, 12);
  if (ids.length === 0) {
    return {
      readiness,
      travel,
      day,
      geo,
      comms,
      logistics,
      finance,
      compliance,
      constituent,
    };
  }
  const nowMs = Date.now();

  const rows = await prisma.event.findMany({
    where: { id: { in: ids }, archivedAt: null },
    include: {
      objectives: true,
      programFlowItems: true,
      packingItems: true,
      staffAssignments: true,
      communicationsItems: true,
      travelPlans: true,
      county: true,
      primaryCalendar: true,
      template: true,
      actionItems: true,
      followups: true,
      eventPeople: true,
      eventOrganizations: true,
    },
  });

  for (const event of rows) {
    const plan = event.travelPlans[0];
    travel.set(event.id, {
      travelRequired: plan?.travelRequired ?? false,
      estimatedDurationMinutes: plan?.estimatedDurationMinutes ?? null,
      bufferMinutes: plan?.bufferMinutes ?? null,
      departureAt: plan?.departureAt?.toISOString() ?? null,
      targetArrivalAt: plan?.targetArrivalAt?.toISOString() ?? null,
    });

    const packing = event.packingItems;
    const litItems = packing.filter(
      (p) =>
        p.category === "CAMPAIGN_MATERIAL" || p.category === "CANDIDATE_MATERIAL",
    );
    const signItems = packing.filter((p) => p.category === "SIGNAGE");
    logistics.set(event.id, {
      travelRequired: plan?.travelRequired ?? false,
      hasDriver: Boolean(plan?.driverUserId),
      hasVehicleDescription: Boolean(plan?.vehicleDescription?.trim()),
      departureAt: plan?.departureAt?.toISOString() ?? null,
      targetArrivalAt: plan?.targetArrivalAt?.toISOString() ?? null,
      estimatedDurationMinutes: plan?.estimatedDurationMinutes ?? null,
      bufferMinutes: plan?.bufferMinutes ?? null,
      estimatedDistanceMiles: plan?.estimatedDistanceMiles ?? null,
      rentalRequired: plan?.rentalRequired ?? false,
      flightRequired: plan?.flightRequired ?? false,
      lodgingRequired: plan?.lodgingRequired ?? false,
      overnightStay: plan?.overnightStay ?? false,
      packingCount: packing.length,
      packingPackedCount: packing.filter((p) => Boolean(p.packedAt)).length,
      packingLoadedCount: packing.filter((p) => Boolean(p.loadedAt)).length,
      packingDeliveredCount: packing.filter((p) => Boolean(p.deliveredAt)).length,
      packingSignageCount: signItems.length,
      packingSignagePackedCount: signItems.filter((p) => Boolean(p.packedAt)).length,
      packingLiteratureCount: litItems.length,
      packingLiteraturePackedCount: litItems.filter((p) => Boolean(p.packedAt))
        .length,
      venueName: event.venueName,
      city: event.city,
      hasStreetAddress: Boolean(event.streetAddress?.trim()),
      locationPresent: Boolean(
        event.city || event.venueName || event.countyId || event.streetAddress,
      ),
    });

    finance.set(event.id, {
      isFundraisingCalendar:
        event.primaryCalendar?.calendarType === "FUNDRAISING",
      financeLeadAssigned: event.staffAssignments.some(
        (s) => s.roleType === "FINANCE_LEAD" && Boolean(s.assignedUserId),
      ),
      complianceLeadAssigned: event.staffAssignments.some(
        (s) => s.roleType === "COMPLIANCE_LEAD" && Boolean(s.assignedUserId),
      ),
      rentalRequired: plan?.rentalRequired ?? false,
      flightRequired: plan?.flightRequired ?? false,
      lodgingRequired: plan?.lodgingRequired ?? false,
      overnightStay: plan?.overnightStay ?? false,
      estimatedDistanceMiles: plan?.estimatedDistanceMiles ?? null,
      packingCount: packing.length,
    });

    const complianceActions = event.actionItems.filter(
      (a) => a.phase === "COMPLIANCE",
    );
    const isActionOpen = (a: (typeof complianceActions)[number]) =>
      a.status !== "COMPLETE" && a.status !== "CANCELLED" && !a.completedAt;
    compliance.set(event.id, {
      isComplianceCalendar: event.primaryCalendar?.calendarType === "COMPLIANCE",
      isFundraisingCalendar:
        event.primaryCalendar?.calendarType === "FUNDRAISING",
      complianceLeadAssigned: event.staffAssignments.some(
        (s) => s.roleType === "COMPLIANCE_LEAD" && Boolean(s.assignedUserId),
      ),
      requiresComplianceReview: Boolean(event.template?.requiresComplianceReview),
      complianceActionCount: complianceActions.length,
      complianceActionOpenCount: complianceActions.filter(isActionOpen).length,
      complianceActionOverdueCount: complianceActions.filter(
        (a) =>
          isActionOpen(a) && a.dueAt != null && a.dueAt.getTime() < nowMs,
      ).length,
      hasPressOrSpeechComms: event.communicationsItems.some(
        (c) =>
          c.channel === "PRESS" ||
          c.communicationType === "PRESS_ADVISORY" ||
          c.communicationType === "PRESS_RELEASE" ||
          c.communicationType === "SPEECH",
      ),
    });

    const followups = event.followups;
    const isFollowupOpen = (f: (typeof followups)[number]) =>
      f.status !== "COMPLETE" && f.status !== "CANCELLED";
    const objectiveTypes = new Set(event.objectives.map((o) => o.objectiveType));
    constituent.set(event.id, {
      followupCount: followups.length,
      followupOpenCount: followups.filter(isFollowupOpen).length,
      followupOverdueCount: followups.filter(
        (f) =>
          isFollowupOpen(f) && f.dueAt != null && f.dueAt.getTime() < nowMs,
      ).length,
      followupOwnerAssigned: event.staffAssignments.some(
        (s) => s.roleType === "FOLLOWUP_OWNER" && Boolean(s.assignedUserId),
      ),
      meetVotersObjective: objectiveTypes.has("MEET_VOTERS"),
      buildRelationshipsObjective: objectiveTypes.has("BUILD_RELATIONSHIPS"),
      supportOrganizationObjective: objectiveTypes.has("SUPPORT_ORGANIZATION"),
      reachTargetAudienceObjective: objectiveTypes.has("REACH_TARGET_AUDIENCE"),
      eventPeopleCount: event.eventPeople.length,
      eventOrganizationCount: event.eventOrganizations.length,
    });

    day.set(event.id, {
      version: event.version,
      status: event.status,
      arrivalAt: event.arrivalAt?.toISOString() ?? null,
      confirmationStatus: event.confirmationStatus,
    });
    geo.set(event.id, {
      countyId: event.countyId,
      countyName: event.county?.name ?? null,
      city: event.city,
      staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId)
        .length,
      staffRequiredCount: event.staffAssignments.length,
      volunteerLeadAssigned: event.staffAssignments.some(
        (s) => s.roleType === "VOLUNTEER_LEAD" && Boolean(s.assignedUserId),
      ),
    });

    const items = event.communicationsItems;
    const isReady = (c: (typeof items)[number]) =>
      c.status === "COMPLETE" || Boolean(c.publishedAt);
    const talking = items.filter((c) => c.communicationType === "TALKING_POINTS");
    const rapid = items.filter((c) => c.communicationType === "RAPID_RESPONSE");
    const publishDates = items
      .map((c) => c.publishAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    const draftDates = items
      .map((c) => c.draftDueAt)
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    comms.set(event.id, {
      itemCount: items.length,
      readyCount: items.filter(isReady).length,
      openCount: items.filter((c) => !isReady(c)).length,
      overdueCount: items.filter(
        (c) =>
          !isReady(c) &&
          ((c.publishAt != null && c.publishAt.getTime() < nowMs) ||
            (c.draftDueAt != null && c.draftDueAt.getTime() < nowMs) ||
            (c.approvalDueAt != null && c.approvalDueAt.getTime() < nowMs)),
      ).length,
      missingOwnerCount: items.filter((c) => !c.ownerUserId && !c.ownerTeamId)
        .length,
      hasTalkingPoints: talking.length > 0,
      talkingPointsReady: talking.length > 0 && talking.every(isReady),
      hasPressItem: items.some(
        (c) =>
          c.channel === "PRESS" ||
          c.communicationType === "PRESS_ADVISORY" ||
          c.communicationType === "PRESS_RELEASE",
      ),
      hasSpeech: items.some((c) => c.communicationType === "SPEECH"),
      hasRapidResponse: rapid.length > 0,
      rapidResponseOpen: rapid.some((c) => !isReady(c)),
      nextPublishAt: publishDates[0]?.toISOString() ?? null,
      nextDraftDueAt: draftDates[0]?.toISOString() ?? null,
    });

    readiness.set(
      event.id,
      calculateEventReadiness({
        event: {
          id: event.id,
          version: event.version,
          eventType: event.eventType,
          internalTitle: event.internalTitle,
          campaignDisplayTitle: event.campaignDisplayTitle,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          city: event.city,
          countyId: event.countyId,
          venueName: event.venueName,
          candidateRole: event.candidateRole,
          defaultVisibility: event.defaultVisibility,
          objectivesCount: event.objectives.length,
          programFlowCount: event.programFlowItems.length,
          packingCount: event.packingItems.length,
          packingPackedCount: event.packingItems.filter((p) => Boolean(p.packedAt))
            .length,
          staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId)
            .length,
          staffRequiredCount: event.staffAssignments.length,
          travelRequired: plan?.travelRequired ?? false,
          travelHasDriver: Boolean(plan?.driverUserId),
          communicationsRequiredCount: event.communicationsItems.length,
          communicationsReadyCount: event.communicationsItems.filter(
            (c) => c.status === "COMPLETE" || Boolean(c.publishedAt),
          ).length,
          hostContactPresent: Boolean(event.city || event.venueName),
        },
      }),
    );
  }

  return {
    readiness,
    travel,
    day,
    geo,
    comms,
    logistics,
    finance,
    compliance,
    constituent,
  };
}

/** @deprecated use loadMissionContextForIds */
export async function loadReadinessForMissionIds(eventIds: string[]) {
  const bundle = await loadMissionContextForIds(eventIds);
  return bundle.readiness;
}
