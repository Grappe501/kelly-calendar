import { describe, expect, it } from "vitest";
import {
  acknowledgementImportKey,
  assertLaunchDateInRange,
  buildCampaignDayLaunchReviewViewModel,
  buildLaunchBlockers,
  buildOvernightChanges,
  DEFAULT_DAY_LAUNCH_CONFIG,
  deriveDepartureReadiness,
  deriveLaunchReadiness,
  derivePreparationLaunchImpact,
  detectScheduleOverlaps,
  selectFirstMission,
  validateAcknowledgementCreate,
  validateLaunchContentPatch,
} from "@/lib/missions/v21/day-launch";
import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z"); // morning Chicago

function mission(
  overrides: Partial<DayBriefingMissionSnapshot> & { missionId: string },
): DayBriefingMissionSnapshot {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T15:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T17:00:00.000Z",
    timezone: TZ,
    locationLabel: overrides.locationLabel ?? "Conway",
    isAllDay: overrides.isAllDay ?? false,
    lifecyclePhase: overrides.lifecyclePhase ?? "PREPARE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    travelRequired: overrides.travelRequired ?? false,
    objective: overrides.objective ?? "Meet voters",
    successCriteria: overrides.successCriteria ?? ["Shake hands"],
    eventDepartureAt: overrides.eventDepartureAt ?? null,
    eventArrivalAt: overrides.eventArrivalAt ?? null,
    travelPlan: overrides.travelPlan ?? null,
    missionTravelPlan: overrides.missionTravelPlan ?? null,
    preparation: {
      exists: true,
      readiness: "READY",
      strategicPurpose: "Purpose",
      keyMessage: "Message",
      desiredImpression: null,
      openingApproach: null,
      closingApproach: null,
      questionsToAsk: [],
      commitmentsToAvoid: [],
      sensitivities: [],
      peopleBriefings: [],
      organizationBriefings: [],
      arrivalInstructions: null,
      parkingInstructions: null,
      accessibilityNotes: null,
      travelNotes: null,
      materialsNeeded: [],
      preparationTasks: [],
      ...overrides.preparation,
    },
    execution: {
      exists: false,
      status: null,
      arrivedAt: null,
      startedAt: null,
      endedAt: null,
      ...overrides.execution,
    },
    debrief: {
      exists: false,
      status: null,
      outcomeAssessment: null,
      completedAt: null,
      approvedAt: null,
      ...overrides.debrief,
    },
    followUp: {
      exists: false,
      status: null,
      closedAt: null,
      actions: [],
      ...overrides.followUp,
    },
  };
}

describe("V2.1 Morning Launch Review", () => {
  it("rejects future dates and out-of-range past dates", () => {
    expect(assertLaunchDateInRange("2026-07-21", NOW, TZ).ok).toBe(false);
    expect(assertLaunchDateInRange("2026-06-01", NOW, TZ).ok).toBe(false);
    expect(assertLaunchDateInRange("2026-07-20", NOW, TZ).ok).toBe(true);
    expect(assertLaunchDateInRange("2026-07-13", NOW, TZ).ok).toBe(true);
    expect(assertLaunchDateInRange("2026-07-12", NOW, TZ).ok).toBe(false);
  });

  it("uses campaign timezone near UTC midnight", () => {
    const nearUtcMidnight = new Date("2026-07-21T04:30:00.000Z");
    expect(campaignDateKey(nearUtcMidnight, TZ)).toBe("2026-07-20");
    expect(assertLaunchDateInRange("2026-07-20", nearUtcMidnight, TZ).ok).toBe(
      true,
    );
  });

  it("labels historical days without calling them today", () => {
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-18",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      operationalMissions: [],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-17",
      launchReview: null,
    });
    expect(vm.isPast).toBe(true);
    expect(vm.isToday).toBe(false);
    expect(vm.closingHeading).toMatch(/historical/i);
    expect(vm.historicalNotice).toBeTruthy();
  });

  it("lazily starts as NOT_STARTED with no fabricated launch record", () => {
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      operationalMissions: [],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-19",
      launchReview: null,
    });
    expect(vm.launchReview.exists).toBe(false);
    expect(vm.launchReview.status).toBe("NOT_STARTED");
    expect(vm.launchReview.readinessAssessment).toBe("NOT_ASSESSED");
    expect(vm.summary.missionCount).toBe(0);
    expect(vm.launchReview.derivedReadiness).toBe("NO_MISSIONS_SCHEDULED");
    expect(vm.isolation.mutatesMissionRecords).toBe(false);
    expect(vm.isolation.launchStartsExecution).toBe(false);
  });

  it("selects first Mission chronologically and may differ from primary", () => {
    const early = mission({
      missionId: "a",
      startsAt: "2026-07-20T14:00:00.000Z",
      title: "Early",
    });
    const later = mission({
      missionId: "b",
      startsAt: "2026-07-20T18:00:00.000Z",
      endsAt: "2026-07-20T20:00:00.000Z",
      title: "Later",
      lifecyclePhase: "EXECUTE",
      operationalStatus: "IN_PROGRESS",
      execution: {
        exists: true,
        status: "IN_PROGRESS",
        arrivedAt: null,
        startedAt: "2026-07-20T13:30:00.000Z",
        endedAt: null,
      },
    });
    const first = selectFirstMission([later, early]);
    expect(first?.missionId).toBe("a");
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [later, early],
      operationalMissions: [],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-19",
      launchReview: null,
    });
    expect(vm.firstMission?.missionId).toBe("a");
  });

  it("detects schedule overlaps without fabricating times", () => {
    const a = mission({
      missionId: "1",
      startsAt: "2026-07-20T15:00:00.000Z",
      endsAt: "2026-07-20T17:00:00.000Z",
    });
    const b = mission({
      missionId: "2",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T18:00:00.000Z",
    });
    expect(detectScheduleOverlaps([a, b])).toHaveLength(1);
  });

  it("derives departure readiness from stored values only", () => {
    const missing = mission({
      missionId: "t",
      travelRequired: true,
      eventDepartureAt: null,
      locationLabel: "Jonesboro",
    });
    expect(deriveDepartureReadiness(missing, DEFAULT_DAY_LAUNCH_CONFIG)).toBe(
      "BLOCKING",
    );
    const ready = mission({
      missionId: "t2",
      travelRequired: true,
      eventDepartureAt: "2026-07-20T13:30:00.000Z",
      locationLabel: "Jonesboro",
      preparation: {
        exists: true,
        readiness: "READY",
        strategicPurpose: "Purpose",
        keyMessage: "Message",
        desiredImpression: null,
        openingApproach: null,
        closingApproach: null,
        questionsToAsk: [],
        commitmentsToAvoid: [],
        sensitivities: [],
        peopleBriefings: [],
        organizationBriefings: [],
        arrivalInstructions: null,
        parkingInstructions: "Lot B",
        accessibilityNotes: null,
        travelNotes: null,
        materialsNeeded: [],
        preparationTasks: [],
      },
    });
    expect(deriveDepartureReadiness(ready, DEFAULT_DAY_LAUNCH_CONFIG)).toBe(
      "CONFIRMED",
    );
    const remote = mission({ missionId: "r", travelRequired: false });
    expect(deriveDepartureReadiness(remote, DEFAULT_DAY_LAUNCH_CONFIG)).toBe(
      "NOT_REQUIRED",
    );
  });

  it("derives preparation launch impact without mutating readiness", () => {
    expect(
      derivePreparationLaunchImpact(
        mission({
          missionId: "p",
          preparation: {
            exists: false,
            readiness: null,
            strategicPurpose: null,
            keyMessage: null,
            desiredImpression: null,
            openingApproach: null,
            closingApproach: null,
            questionsToAsk: [],
            commitmentsToAvoid: [],
            sensitivities: [],
            peopleBriefings: [],
            organizationBriefings: [],
            arrivalInstructions: null,
            parkingInstructions: null,
            accessibilityNotes: null,
            travelNotes: null,
            materialsNeeded: [],
            preparationTasks: [],
          },
        }),
      ),
    ).toBe("BLOCKING_LAUNCH");
    expect(
      derivePreparationLaunchImpact(
        mission({
          missionId: "p2",
          preparation: {
            exists: true,
            readiness: "DRAFT",
            strategicPurpose: "Purpose",
            keyMessage: "Message",
            desiredImpression: null,
            openingApproach: null,
            closingApproach: null,
            questionsToAsk: [],
            commitmentsToAvoid: [],
            sensitivities: [],
            peopleBriefings: [],
            organizationBriefings: [],
            arrivalInstructions: null,
            parkingInstructions: null,
            accessibilityNotes: null,
            travelNotes: null,
            materialsNeeded: [],
            preparationTasks: [],
          },
        }),
      ),
    ).toBe("NEEDS_REVIEW");
  });

  it("reports missing prior Closeout honestly", () => {
    const changes = buildOvernightChanges({
      priorCloseout: null,
      priorCloseoutExists: false,
      priorTomorrowReadiness: null,
      currentDerivedReadiness: "READY",
      dayMissions: [],
      firstMission: null,
      overlaps: [],
      acknowledgements: [],
      baselineAt: null,
    });
    expect(changes.some((c) => /not formally closed out/i.test(c.title))).toBe(
      true,
    );
    expect(changes[0]?.currentValue).toMatch(/No signed-off prior-day baseline/i);
  });

  it("detects cancelled first Mission and missing departure", () => {
    const first = mission({
      missionId: "c",
      operationalStatus: "CANCELLED",
      travelRequired: true,
      eventDepartureAt: null,
    });
    const changes = buildOvernightChanges({
      priorCloseout: null,
      priorCloseoutExists: true,
      priorTomorrowReadiness: "READY",
      currentDerivedReadiness: "NOT_READY",
      dayMissions: [first],
      firstMission: first,
      overlaps: [],
      acknowledgements: [],
      baselineAt: "2026-07-20T05:00:00.000Z",
    });
    expect(changes.some((c) => c.category === "MISSION_REMOVED")).toBe(true);
    expect(changes.some((c) => c.category === "TRAVEL")).toBe(true);
  });

  it("builds deterministic blockers and READY requires clearance", () => {
    const first = mission({
      missionId: "b1",
      travelRequired: true,
      eventDepartureAt: null,
      preparation: {
        exists: true,
        readiness: "NEEDS_ATTENTION",
        strategicPurpose: "Purpose",
        keyMessage: "Message",
        desiredImpression: null,
        openingApproach: null,
        closingApproach: null,
        questionsToAsk: [],
        commitmentsToAvoid: [],
        sensitivities: [],
        peopleBriefings: [],
        organizationBriefings: [],
        arrivalInstructions: null,
        parkingInstructions: null,
        accessibilityNotes: null,
        travelNotes: null,
        materialsNeeded: [],
        preparationTasks: [],
      },
    });
    const blockers = buildLaunchBlockers({
      dayMissions: [first],
      firstMission: first,
      departureState: "BLOCKING",
      prepImpact: "BLOCKING_LAUNCH",
      overlaps: [],
      urgentUnownedCarryForward: 0,
      unacknowledgedCritical: 0,
      priorCloseoutMissing: false,
      requirePriorCloseoutReview: true,
      acknowledgements: [],
    });
    expect(blockers.length).toBeGreaterThan(0);
    expect(deriveLaunchReadiness({ dayMissionCount: 1, blockers })).toBe(
      "NOT_READY",
    );

    const accepted = blockers.map((b) => ({
      ...b,
      acknowledgementStatus: "ACCEPTED_RISK" as const,
    }));
    expect(deriveLaunchReadiness({ dayMissionCount: 1, blockers: accepted })).toBe(
      "READY_WITH_ACCEPTED_RISK",
    );

    const resolved = blockers.map((b) => ({
      ...b,
      acknowledgementStatus: "RESOLVED" as const,
    }));
    expect(deriveLaunchReadiness({ dayMissionCount: 1, blockers: resolved })).toBe(
      "READY",
    );
  });

  it("ACKNOWLEDGED alone does not clear blockers", () => {
    const blockers = [
      {
        id: "x",
        title: "x",
        explanation: "x",
        missionId: null,
        acknowledgementImportKey: "x",
        acknowledgementStatus: "ACKNOWLEDGED" as const,
        href: null,
      },
    ];
    expect(deriveLaunchReadiness({ dayMissionCount: 1, blockers })).toBe(
      "NOT_READY",
    );
  });

  it("requires launch summary before review completes", () => {
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [mission({ missionId: "m1" })],
      operationalMissions: [],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-19",
      launchReview: {
        id: "lr1",
        campaignDateKey: "2026-07-20",
        status: "IN_PROGRESS",
        readinessAssessment: "READY",
        launchSummary: null,
        overnightChangeNotes: null,
        acceptedRiskSummary: null,
        internalNotes: null,
        startedAt: NOW.toISOString(),
        reviewedAt: null,
        launchedAt: null,
        startedByUserId: "u1",
        reviewedByUserId: null,
        launchedByUserId: null,
        updatedAt: NOW.toISOString(),
        acknowledgements: [],
      },
    });
    expect(vm.reviewBlockers.some((b) => /Launch summary/i.test(b))).toBe(true);
    expect(vm.launchBlockers.some((b) => /completed before launch/i.test(b))).toBe(
      true,
    );
  });

  it("surfaces prior carry-forward without auto-resolving", () => {
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [mission({ missionId: "m1" })],
      operationalMissions: [],
      priorCloseout: {
        id: "co1",
        campaignDateKey: "2026-07-19",
        status: "SIGNED_OFF",
        todayAssessment: "CLEAR",
        tomorrowReadiness: "READY",
        closeoutSummary: "Closed",
        tomorrowSummary: null,
        carryForwardSummary: null,
        internalNotes: null,
        startedAt: null,
        reviewedAt: null,
        signedOffAt: "2026-07-20T03:00:00.000Z",
        startedByUserId: null,
        reviewedByUserId: null,
        signedOffByUserId: "u1",
        updatedAt: "2026-07-20T03:00:00.000Z",
        carryForwardItems: [
          {
            id: "cf1",
            sourceType: "COMMITMENT",
            sourceRecordId: "a1",
            missionId: "m1",
            importKey: "cf:1",
            title: "Call chair",
            reason: "Due tomorrow",
            ownerUserId: null,
            ownerName: null,
            targetDateKey: "2026-07-20",
            destination: "/system/missions/m1/follow-up",
            status: "OPEN",
            createdByUserId: null,
            resolvedAt: null,
            resolvedByUserId: null,
            cancellationReason: null,
            createdAt: "2026-07-20T03:00:00.000Z",
            updatedAt: "2026-07-20T03:00:00.000Z",
          },
        ],
      },
      priorCloseoutDateKey: "2026-07-19",
      launchReview: null,
    });
    expect(vm.priorCloseout.exists).toBe(true);
    expect(vm.urgentCarryForward).toHaveLength(1);
    expect(vm.urgentCarryForward[0]?.ownerLabel).toBe("Owner needed");
    expect(vm.carryForwardItems[0]?.status).toBe("OPEN");
  });

  it("rejects forbidden mission mutation fields and oversized text", () => {
    expect(
      validateLaunchContentPatch(
        { lifecyclePhase: "EXECUTE" },
        DEFAULT_DAY_LAUNCH_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateLaunchContentPatch(
        { startsAt: "2026-07-20T12:00:00.000Z" },
        DEFAULT_DAY_LAUNCH_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateLaunchContentPatch(
        { launchSummary: "x".repeat(1501) },
        DEFAULT_DAY_LAUNCH_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateLaunchContentPatch(
        { launchSummary: "  Ready to go.  " },
        DEFAULT_DAY_LAUNCH_CONFIG,
      ),
    ).toEqual({
      ok: true,
      patch: { launchSummary: "Ready to go." },
    });
  });

  it("builds acknowledgement import keys idempotently", () => {
    const key = acknowledgementImportKey(
      "TRAVEL",
      "CAMPAIGN_MISSION",
      "mission-1",
    );
    expect(key).toBe("TRAVEL:CAMPAIGN_MISSION:mission-1");
    expect(
      validateAcknowledgementCreate({
        acknowledgementType: "TRAVEL",
        sourceType: "CAMPAIGN_MISSION",
        title: "Departure missing",
        status: "ACKNOWLEDGED",
      }).ok,
    ).toBe(true);
  });

  it("excludes completed and cancelled actions from due-before-launch", () => {
    const m = mission({
      missionId: "fu",
      followUp: {
        exists: true,
        status: "ACTIVE",
        closedAt: null,
        actions: [
          {
            id: "open",
            title: "Call before departure",
            sourceType: "EXECUTE_COMMITMENT",
            status: "OPEN",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-20T13:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
          {
            id: "done",
            title: "Done",
            sourceType: "EXECUTE_COMMITMENT",
            status: "COMPLETED",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-20T13:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
          {
            id: "cancel",
            title: "Cancelled",
            sourceType: "EXECUTE_COMMITMENT",
            status: "CANCELLED",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-20T13:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
        ],
      },
    });
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      operationalMissions: [m],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-19",
      launchReview: null,
    });
    expect(vm.dueBeforeLaunch.map((a) => a.id)).toEqual(["open"]);
  });

  it("does not expose raw prisma and keeps private notes off summary counts", () => {
    const vm = buildCampaignDayLaunchReviewViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      operationalMissions: [],
      priorCloseout: null,
      priorCloseoutDateKey: "2026-07-19",
      launchReview: {
        id: "lr",
        campaignDateKey: "2026-07-20",
        status: "IN_PROGRESS",
        readinessAssessment: "NO_MISSIONS_SCHEDULED",
        launchSummary: "Begin campaign workday.",
        overnightChangeNotes: null,
        acceptedRiskSummary: null,
        internalNotes: "Private ops note",
        startedAt: NOW.toISOString(),
        reviewedAt: null,
        launchedAt: null,
        startedByUserId: "u1",
        reviewedByUserId: null,
        launchedByUserId: null,
        updatedAt: NOW.toISOString(),
        acknowledgements: [],
      },
    });
    expect(vm.launchReview.internalNotes).toBe("Private ops note");
    expect(JSON.stringify(vm)).not.toMatch(/prisma/i);
    expect(vm.isolation.mutatesEventSchedule).toBe(false);
  });
});
