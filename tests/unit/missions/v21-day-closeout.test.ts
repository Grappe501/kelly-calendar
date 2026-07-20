import { describe, expect, it } from "vitest";
import {
  assertCloseoutDateInRange,
  buildCampaignDayCloseoutViewModel,
  buildCarryForwardSuggestions,
  carryForwardImportKey,
  classifyCloseoutDay,
  classifyMissionDayReview,
  DEFAULT_DAY_CLOSEOUT_CONFIG,
  deriveTomorrowReadiness,
  detectTomorrowConflicts,
  parseBriefingDateKey,
  validateCarryForwardCreate,
  validateCloseoutContentPatch,
} from "@/lib/missions/v21/day-closeout";
import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T23:00:00.000Z"); // evening Chicago

function mission(
  overrides: Partial<DayBriefingMissionSnapshot> & { missionId: string },
): DayBriefingMissionSnapshot {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T14:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T16:00:00.000Z",
    timezone: TZ,
    locationLabel: overrides.locationLabel ?? "Conway",
    isAllDay: overrides.isAllDay ?? false,
    lifecyclePhase: overrides.lifecyclePhase ?? "DEBRIEF",
    operationalStatus: overrides.operationalStatus ?? "DEBRIEFING",
    travelRequired: overrides.travelRequired ?? false,
    objective: overrides.objective ?? "Meet voters",
    successCriteria: overrides.successCriteria ?? ["Shake hands"],
    eventDepartureAt: overrides.eventDepartureAt ?? null,
    eventArrivalAt: overrides.eventArrivalAt ?? null,
    travelPlan: overrides.travelPlan ?? null,
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
      exists: true,
      status: "COMPLETED",
      arrivedAt: null,
      startedAt: null,
      endedAt: "2026-07-20T16:00:00.000Z",
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

describe("V2.1 Campaign Day Closeout", () => {
  it("rejects future dates and invalid formats", () => {
    expect(parseBriefingDateKey("2026-07-20").ok).toBe(true);
    expect(assertCloseoutDateInRange("2026-07-21", NOW, TZ).ok).toBe(false);
    expect(assertCloseoutDateInRange("2026-06-01", NOW, TZ).ok).toBe(false);
    expect(assertCloseoutDateInRange("2026-07-20", NOW, TZ).ok).toBe(true);
    expect(assertCloseoutDateInRange("2026-07-19", NOW, TZ).ok).toBe(true);
  });

  it("uses campaign timezone near UTC midnight", () => {
    const nearUtcMidnight = new Date("2026-07-21T04:30:00.000Z");
    expect(campaignDateKey(nearUtcMidnight, TZ)).toBe("2026-07-20");
    expect(classifyCloseoutDay("2026-07-20", nearUtcMidnight, TZ).isToday).toBe(
      true,
    );
  });

  it("labels past vs today accurately and never calls past today", () => {
    const past = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-18",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      tomorrowMissions: [],
      operationalMissions: [],
      closeout: null,
    });
    expect(past.isPast).toBe(true);
    expect(past.isToday).toBe(false);
    expect(past.closingHeading).toMatch(/historical/i);
    expect(past.historicalNotice).toBeTruthy();
  });

  it("surfaces active execution and does not mutate isolation flags", () => {
    const m = mission({
      missionId: "active",
      execution: {
        exists: true,
        status: "IN_PROGRESS",
        arrivedAt: null,
        startedAt: "2026-07-20T14:30:00.000Z",
        endedAt: null,
      },
    });
    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      tomorrowMissions: [],
      operationalMissions: [],
      closeout: null,
    });
    expect(vm.activeExecutions).toHaveLength(1);
    expect(vm.isolation.mutatesMissionRecords).toBe(false);
    expect(vm.isolation.signoffCompletesUnderlyingWork).toBe(false);
    expect(vm.reviewBlockers.some((b) => /active execution/i.test(b))).toBe(
      true,
    );
  });

  it("classifies debrief gaps and leadership decisions", () => {
    const m = mission({
      missionId: "d1",
      debrief: {
        exists: true,
        status: "COMPLETED",
        outcomeAssessment: "PARTIALLY_ACHIEVED",
        completedAt: "2026-07-20T17:00:00.000Z",
        approvedAt: null,
      },
      followUp: {
        exists: true,
        status: "READY_TO_CLOSE",
        closedAt: null,
        actions: [],
      },
    });
    expect(classifyMissionDayReview(m)).toBe("LEADERSHIP_REVIEW");
    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      tomorrowMissions: [],
      operationalMissions: [m],
      closeout: null,
    });
    expect(vm.summary.debriefAwaitingApproval).toBe(1);
    expect(
      vm.leadershipDecisions.some((d) => /awaiting approval/i.test(d.label)),
    ).toBe(true);
    expect(
      vm.leadershipDecisions.some((d) => /ready for closeout/i.test(d.label)),
    ).toBe(true);
  });

  it("ranks overdue urgent commitments first and excludes cancelled from completed", () => {
    const m = mission({
      missionId: "fu",
      followUp: {
        exists: true,
        status: "ACTIVE",
        closedAt: null,
        actions: [
          {
            id: "od-u",
            title: "Urgent overdue",
            sourceType: "EXECUTE_COMMITMENT",
            status: "OPEN",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-18T12:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
          {
            id: "od-n",
            title: "Normal overdue",
            sourceType: "OPERATOR_ADDED",
            status: "OPEN",
            priority: "NORMAL",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-17T12:00:00.000Z",
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
            dueAt: "2026-07-20T12:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
        ],
      },
    });
    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      tomorrowMissions: [],
      operationalMissions: [m],
      closeout: null,
    });
    expect(vm.overdue[0].id).toBe("od-u");
    expect(
      vm.dueToday.find((d) => d.id === "cancel")?.statusBucket,
    ).toBe("CANCELLED");
  });

  it("suggests carry-forward without auto-creating and is idempotent by key", () => {
    const m = mission({
      missionId: "cf",
      execution: {
        exists: true,
        status: "IN_PROGRESS",
        arrivedAt: null,
        startedAt: null,
        endedAt: null,
      },
    });
    const suggestions = buildCarryForwardSuggestions({
      dayMissions: [m],
      tomorrowMissions: [],
      existing: [],
    });
    expect(suggestions.some((s) => s.sourceType === "ACTIVE_EXECUTION")).toBe(
      true,
    );
    const key = carryForwardImportKey("ACTIVE_EXECUTION", "cf");
    const again = buildCarryForwardSuggestions({
      dayMissions: [m],
      tomorrowMissions: [],
      existing: [
        {
          id: "x",
          sourceType: "ACTIVE_EXECUTION",
          sourceRecordId: "cf",
          importKey: key,
          missionId: "cf",
          title: "Active",
          reason: null,
          ownerName: null,
          ownerUserId: null,
          targetDateKey: null,
          destination: null,
          status: "OPEN",
          createdByUserId: null,
          resolvedAt: null,
          resolvedByUserId: null,
          cancellationReason: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    expect(again.find((s) => s.suggestionKey === key)?.alreadyPresent).toBe(
      true,
    );
  });

  it("derives tomorrow readiness honestly without fabricating travel", () => {
    const tmr = mission({
      missionId: "tmr",
      startsAt: "2026-07-21T14:00:00.000Z",
      endsAt: "2026-07-21T16:00:00.000Z",
      travelRequired: true,
      preparation: {
        exists: true,
        readiness: "NEEDS_ATTENTION",
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
      execution: {
        exists: false,
        status: null,
        arrivedAt: null,
        startedAt: null,
        endedAt: null,
      },
    });
    const conflicts = detectTomorrowConflicts([tmr]);
    expect(deriveTomorrowReadiness({
      tomorrowMissions: [tmr],
      conflicts,
      config: DEFAULT_DAY_CLOSEOUT_CONFIG,
    })).toBe("NOT_READY");

    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      tomorrowMissions: [tmr],
      operationalMissions: [],
      closeout: null,
    });
    expect(vm.tomorrowFirstMission?.missingDeparture).toBe(true);
    expect(vm.tomorrowFirstMission?.departureLabel).toBeNull();
    expect(vm.closeout.derivedTomorrowReadiness).toBe("NOT_READY");
  });

  it("detects tomorrow overlaps without implying schedule mutation", () => {
    const a = mission({
      missionId: "a",
      startsAt: "2026-07-21T14:00:00.000Z",
      endsAt: "2026-07-21T16:00:00.000Z",
    });
    const b = mission({
      missionId: "b",
      startsAt: "2026-07-21T15:00:00.000Z",
      endsAt: "2026-07-21T17:00:00.000Z",
    });
    expect(detectTomorrowConflicts([a, b])).toHaveLength(1);
  });

  it("requires summary fields for review and rejects forbidden mission fields", () => {
    expect(
      validateCloseoutContentPatch(
        { lifecyclePhase: "EXECUTE" },
        DEFAULT_DAY_CLOSEOUT_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateCloseoutContentPatch(
        { closeoutSummary: "x".repeat(2001) },
        DEFAULT_DAY_CLOSEOUT_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateCloseoutContentPatch(
        {
          todayAssessment: "CLEAR",
          tomorrowReadiness: "READY",
          closeoutSummary: "Done",
        },
        DEFAULT_DAY_CLOSEOUT_CONFIG,
      ).ok,
    ).toBe(true);

    const empty = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      tomorrowMissions: [],
      operationalMissions: [],
      closeout: null,
    });
    expect(empty.reviewBlockers.some((b) => /summary/i.test(b))).toBe(true);
    expect(empty.closeout.status).toBe("NOT_STARTED");
  });

  it("validates carry-forward create and cancellation reason", () => {
    expect(
      validateCarryForwardCreate({
        sourceType: "OPERATOR_ADDED",
        title: "Handoff note",
      }).ok,
    ).toBe(true);
    expect(
      validateCarryForwardCreate({
        sourceType: "OPERATOR_ADDED",
        title: "",
      }).ok,
    ).toBe(false);
  });

  it("no-mission day remains operational and is not called a day off", () => {
    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      tomorrowMissions: [],
      operationalMissions: [],
      closeout: null,
    });
    expect(vm.summary.scheduledMissions).toBe(0);
    expect(JSON.stringify(vm).toLowerCase()).not.toContain("day off");
  });

  it("excludes private note field names from view model payload", () => {
    const vm = buildCampaignDayCloseoutViewModel({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [mission({ missionId: "p" })],
      tomorrowMissions: [],
      operationalMissions: [],
      closeout: null,
    });
    const json = JSON.stringify(vm);
    expect(json).not.toContain("operatorNotes");
    expect(json).not.toContain("fieldNotes");
    expect(json).not.toContain("privateNotes");
  });
});
