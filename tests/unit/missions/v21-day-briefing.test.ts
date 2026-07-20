import { describe, expect, it } from "vitest";
import {
  assertBriefingDateInRange,
  buildCampaignDayBriefingViewModel,
  campaignDayBounds,
  campaignLocalDateTimeToUtc,
  classifyBriefingDay,
  DEFAULT_DAY_BRIEFING_CONFIG,
  parseBriefingDateKey,
  type DayBriefingMissionSnapshot,
} from "@/lib/missions/v21/day-briefing";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T17:00:00.000Z");

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
    lifecyclePhase: overrides.lifecyclePhase ?? "PREPARE",
    operationalStatus: overrides.operationalStatus ?? "READY",
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
      arrivalInstructions: "Front door",
      parkingInstructions: "Lot A",
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

describe("V2.1 Campaign Day Briefing", () => {
  it("parses and rejects invalid dates", () => {
    expect(parseBriefingDateKey("2026-07-20").ok).toBe(true);
    expect(parseBriefingDateKey("07/20/2026").ok).toBe(false);
    expect(parseBriefingDateKey("2026-13-01").ok).toBe(false);
  });

  it("enforces allowed past/future range", () => {
    expect(
      assertBriefingDateInRange("2026-07-20", NOW, TZ).ok,
    ).toBe(true);
    expect(
      assertBriefingDateInRange("2025-01-01", NOW, TZ).ok,
    ).toBe(false);
    expect(
      assertBriefingDateInRange("2027-01-01", NOW, TZ).ok,
    ).toBe(false);
  });

  it("uses campaign timezone near UTC midnight", () => {
    const nearUtcMidnight = new Date("2026-07-21T04:30:00.000Z");
    expect(campaignDateKey(nearUtcMidnight, TZ)).toBe("2026-07-20");
    const { isToday } = classifyBriefingDay("2026-07-20", nearUtcMidnight, TZ);
    expect(isToday).toBe(true);
  });

  it("builds campaign-local day bounds without UTC day shift", () => {
    const { start, end } = campaignDayBounds("2026-07-20", TZ);
    expect(campaignDateKey(start, TZ)).toBe("2026-07-20");
    expect(campaignDateKey(end, TZ)).toBe("2026-07-20");
    const noon = campaignLocalDateTimeToUtc("2026-07-20", 12, 0, 0, TZ);
    expect(campaignDateKey(noon, TZ)).toBe("2026-07-20");
  });

  it("labels past, today, and future accurately", () => {
    expect(classifyBriefingDay("2026-07-19", NOW, TZ)).toMatchObject({
      isPast: true,
      isToday: false,
      isFuture: false,
    });
    expect(classifyBriefingDay("2026-07-20", NOW, TZ)).toMatchObject({
      isToday: true,
    });
    expect(classifyBriefingDay("2026-07-21", NOW, TZ)).toMatchObject({
      isFuture: true,
    });
  });

  it("selects earliest scheduled mission for a future day", () => {
    const a = mission({
      missionId: "b",
      startsAt: "2026-07-22T18:00:00.000Z",
      endsAt: "2026-07-22T20:00:00.000Z",
    });
    const b = mission({
      missionId: "a",
      startsAt: "2026-07-22T15:00:00.000Z",
      endsAt: "2026-07-22T17:00:00.000Z",
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-22",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [a, b],
      selectorMissions: [a, b],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.isFuture).toBe(true);
    expect(vm.dayKindLabel).toBe("Future briefing");
    expect(vm.primaryMission?.missionId).toBe("a");
    expect(vm.isolation.mutatesRecords).toBe(false);
  });

  it("includes scheduled missions, all-day without fabricated clock, and overlaps", () => {
    const m1 = mission({
      missionId: "m1",
      startsAt: "2026-07-20T14:00:00.000Z",
      endsAt: "2026-07-20T16:30:00.000Z",
    });
    const m2 = mission({
      missionId: "m2",
      title: "Overlap Mission",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T18:00:00.000Z",
      locationLabel: "Little Rock",
    });
    const allDay = mission({
      missionId: "ad",
      title: "All day canvass",
      isAllDay: true,
      startsAt: "2026-07-20T05:00:00.000Z",
      endsAt: "2026-07-21T04:59:00.000Z",
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m1, m2, allDay],
      selectorMissions: [m1, m2, allDay],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.executiveSummary.scheduledMissionCount).toBe(3);
    expect(vm.timeline.some((t) => t.isAllDay && t.timeLabel === "All day")).toBe(
      true,
    );
    expect(vm.risks.some((r) => r.category === "SCHEDULE")).toBe(true);
    expect(vm.isolation.eventScheduleEditableHere).toBe(false);
  });

  it("does not fabricate departure or travel duration", () => {
    const m = mission({
      missionId: "travel",
      travelPlan: null,
      eventDepartureAt: null,
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      selectorMissions: [m],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.travel[0].missingDeparture).toBe(true);
    expect(vm.travel[0].durationMinutes).toBeNull();
    expect(vm.executiveSummary.firstDepartureTime).toBeNull();
  });

  it("surfaces missing key message and preparation gaps honestly", () => {
    const m = mission({
      missionId: "prep",
      // Still upcoming relative to NOW (17:00Z) so status is Needs preparation
      startsAt: "2026-07-20T19:00:00.000Z",
      endsAt: "2026-07-20T21:00:00.000Z",
      preparation: {
        exists: true,
        readiness: "DRAFT",
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
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      selectorMissions: [m],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.briefingStatus).toBe("NEEDS_PREPARATION");
    expect(
      vm.preparation.some((p) =>
        p.requirement.includes("No key message has been prepared"),
      ),
    ).toBe(true);
    expect(vm.primaryMission?.keyMessage).toBeNull();
  });

  it("classifies due today, overdue, waiting nextCheck, and excludes completed/cancelled", () => {
    const m = mission({
      missionId: "fu",
      lifecyclePhase: "FOLLOW_UP",
      followUp: {
        exists: true,
        status: "ACTIVE",
        closedAt: null,
        actions: [
          {
            id: "due1",
            title: "Due today commitment",
            sourceType: "EXECUTE_COMMITMENT",
            status: "OPEN",
            priority: "IMPORTANT",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: "2026-07-20T12:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
          {
            id: "od1",
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
            id: "wait1",
            title: "Waiting due",
            sourceType: "OPERATOR_ADDED",
            status: "WAITING",
            priority: "NORMAL",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: null,
            nextCheckAt: "2026-07-20T12:00:00.000Z",
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
            dueAt: "2026-07-18T12:00:00.000Z",
            nextCheckAt: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
          },
        ],
      },
    });
    // Note: COMPLETED won't be in snapshot actions from repo, but include for builder safety
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      selectorMissions: [m],
      operationalMissions: [m],
      tomorrowMissions: [],
    });
    expect(vm.dueToday.some((a) => a.id === "due1")).toBe(true);
    expect(vm.dueToday.some((a) => a.id === "wait1")).toBe(true);
    expect(vm.overdue.some((a) => a.id === "od1")).toBe(true);
    expect(vm.overdue[0].id).toBe("od1");
    expect(vm.dueToday.some((a) => a.id === "done")).toBe(false);
    expect(vm.overdue.some((a) => a.id === "done")).toBe(false);
  });

  it("surfaces leadership decisions and historical disclaimer", () => {
    const m = mission({
      missionId: "hist",
      startsAt: "2026-07-15T14:00:00.000Z",
      endsAt: "2026-07-15T16:00:00.000Z",
      lifecyclePhase: "DEBRIEF",
      execution: {
        exists: true,
        status: "COMPLETED",
        arrivedAt: null,
        startedAt: null,
        endedAt: "2026-07-15T16:00:00.000Z",
      },
      debrief: {
        exists: true,
        status: "COMPLETED",
        outcomeAssessment: "PARTIALLY_ACHIEVED",
        completedAt: "2026-07-15T18:00:00.000Z",
        approvedAt: null,
      },
      followUp: {
        exists: true,
        status: "READY_TO_CLOSE",
        closedAt: null,
        actions: [],
      },
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-15",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      selectorMissions: [m],
      operationalMissions: [m],
      tomorrowMissions: [],
    });
    expect(vm.isPast).toBe(true);
    expect(vm.historicalDisclaimer).toMatch(/current state of campaign records/i);
    expect(
      vm.leadershipDecisions.some((d) => d.reason === "DEBRIEF_APPROVAL_REQUIRED"),
    ).toBe(true);
    expect(
      vm.leadershipDecisions.some((d) => d.reason === "MISSION_CLOSEOUT_REVIEW"),
    ).toBe(true);
  });

  it("builds no-mission day without calling it a day off", () => {
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [],
      selectorMissions: [],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.briefingStatus).toBe("NO_SCHEDULED_MISSIONS");
    expect(vm.executiveSummary.sentences.join(" ")).toMatch(/follow-up/i);
    expect(vm.executiveSummary.sentences.join(" ").toLowerCase()).not.toContain(
      "day off",
    );
  });

  it("does not show fabricated actual execution on future briefings", () => {
    const m = mission({
      missionId: "fut",
      startsAt: "2026-07-25T14:00:00.000Z",
      endsAt: "2026-07-25T16:00:00.000Z",
      execution: {
        exists: true,
        status: "COMPLETED",
        arrivedAt: null,
        startedAt: null,
        endedAt: "2026-07-25T16:00:00.000Z",
      },
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-25",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [m],
      selectorMissions: [m],
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.isFuture).toBe(true);
    expect(
      vm.risks.some((r) => r.issue.includes("future Mission")),
    ).toBe(true);
    expect(vm.briefingStatus).not.toBe("ACTIVE_DAY");
  });

  it("enforces section limits and omits private notes from payload", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mission({
        missionId: `m${i}`,
        startsAt: `2026-07-20T${String(12 + (i % 6)).padStart(2, "0")}:00:00.000Z`,
        endsAt: `2026-07-20T${String(13 + (i % 6)).padStart(2, "0")}:00:00.000Z`,
      }),
    );
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: many,
      selectorMissions: many,
      operationalMissions: [],
      tomorrowMissions: [],
    });
    expect(vm.timeline.length).toBeLessThanOrEqual(
      DEFAULT_DAY_BRIEFING_CONFIG.sectionLimits.timeline,
    );
    expect(vm.timelineTotal).toBeGreaterThan(vm.timeline.length);
    const json = JSON.stringify(vm);
    expect(json).not.toContain("operatorNotes");
    expect(json).not.toContain("internalNotes");
    expect(json).not.toContain("fieldNotes");
    expect(json).not.toContain("privateNotes");
  });

  it("builds tomorrow preview with honest missing departure", () => {
    const today = mission({ missionId: "t" });
    const tomorrow = mission({
      missionId: "tmr",
      title: "Hope County Visit",
      startsAt: "2026-07-21T13:30:00.000Z",
      endsAt: "2026-07-21T15:00:00.000Z",
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
    });
    const vm = buildCampaignDayBriefingViewModel({
      briefingDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      dayMissions: [today],
      selectorMissions: [today],
      operationalMissions: [],
      tomorrowMissions: [tomorrow],
    });
    expect(vm.tomorrowPreview?.firstMissionTitle).toBe("Hope County Visit");
    expect(vm.tomorrowPreview?.missingDeparture).toBe(true);
    expect(vm.endOfDay.some((e) => e.reason === "TOMORROW_PREPARATION_NOT_READY")).toBe(
      true,
    );
  });
});
