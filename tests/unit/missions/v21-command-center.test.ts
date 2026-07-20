import { describe, expect, it } from "vitest";
import {
  buildCommandCenterViewModel,
  compareAttentionItems,
  DEFAULT_COMMAND_CENTER_CONFIG,
  detectMissionAttention,
  parseCommandCenterFilters,
  rankAttentionItems,
  type CommandCenterMissionSnapshot,
  type MissionAttentionItem,
} from "@/lib/missions/v21/command-center";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T17:00:00.000Z"); // midday CDT

function snapshot(
  overrides: Partial<CommandCenterMissionSnapshot> & {
    missionId: string;
    title?: string;
  },
): CommandCenterMissionSnapshot {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T18:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T20:00:00.000Z",
    timezone: TZ,
    locationLabel: overrides.locationLabel ?? "Cave City",
    lifecyclePhase: overrides.lifecyclePhase ?? "PREPARE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    travelRequired: overrides.travelRequired ?? false,
    objective: overrides.objective ?? "Meet people",
    preparation: {
      exists: true,
      readiness: "READY",
      strategicPurpose: "Purpose",
      keyMessage: "Message",
      ...overrides.preparation,
    },
    execution: {
      exists: false,
      status: null,
      arrivedAt: null,
      startedAt: null,
      endedAt: null,
      observationCount: 0,
      commitmentCount: 0,
      followUpCount: 0,
      ...overrides.execution,
    },
    debrief: {
      exists: false,
      status: null,
      outcomeAssessment: null,
      approvedFollowUpCount: 0,
      completedAt: null,
      approvedAt: null,
      ...overrides.debrief,
    },
    followUp: {
      exists: false,
      status: null,
      completedAt: null,
      closedAt: null,
      closedByUserId: null,
      closeoutSummary: null,
      actions: [],
      ...overrides.followUp,
    },
  };
}

function attention(
  partial: Partial<MissionAttentionItem> & {
    missionId: string;
    reason: MissionAttentionItem["reason"];
    severity: MissionAttentionItem["severity"];
  },
): MissionAttentionItem {
  return {
    id: `${partial.missionId}:${partial.reason}`,
    missionTitle: "T",
    severityLabel: "x",
    label: "l",
    explanation: "e",
    phase: "EXECUTE",
    phaseLabel: "Execute",
    timeContext: null,
    href: "/x",
    primaryActionLabel: "Go",
    relevantAt: null,
    rank: 0,
    ...partial,
  };
}

describe("V2.1 Mission Command Center", () => {
  it("uses campaign timezone for campaign date", () => {
    const nearUtcMidnight = new Date("2026-07-21T04:30:00.000Z"); // still Jul 20 in Chicago
    expect(campaignDateKey(nearUtcMidnight, TZ)).toBe("2026-07-20");
    const vm = buildCommandCenterViewModel({
      missions: [],
      now: nearUtcMidnight,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.campaignDate).toBe("2026-07-20");
    expect(vm.campaignTimezone).toBe(TZ);
  });

  it("validates filters and falls back safely", () => {
    expect(parseCommandCenterFilters({ view: "attention" }).activeView).toBe(
      "attention",
    );
    expect(parseCommandCenterFilters({ view: "bogus" }).activeView).toBe(
      "overview",
    );
    expect(parseCommandCenterFilters({ phase: "debrief" }).phase).toBe("DEBRIEF");
    expect(parseCommandCenterFilters({ phase: "nope" }).phase).toBeNull();
    expect(
      parseCommandCenterFilters({ search: "  mayor  " }).search,
    ).toBe("mayor");
  });

  it("ranks critical above high above normal with stable ties", () => {
    const items = rankAttentionItems([
      attention({
        missionId: "b",
        reason: "DEBRIEF_AWAITING_APPROVAL",
        severity: "NORMAL",
        relevantAt: "2026-07-19T12:00:00.000Z",
      }),
      attention({
        missionId: "a",
        reason: "EXECUTION_NOT_STARTED",
        severity: "CRITICAL",
        relevantAt: "2026-07-20T12:00:00.000Z",
      }),
      attention({
        missionId: "c",
        reason: "DEBRIEF_NOT_STARTED",
        severity: "HIGH",
        relevantAt: "2026-07-18T12:00:00.000Z",
      }),
    ]);
    expect(items.map((i) => i.missionId)).toEqual(["a", "c", "b"]);
    expect(compareAttentionItems(items[0], items[1])).toBeLessThan(0);
  });

  it("flags execute not started after grace, not before", () => {
    const late = snapshot({
      missionId: "exec1",
      lifecyclePhase: "EXECUTE",
      startsAt: "2026-07-20T16:00:00.000Z", // 60 min before NOW
      endsAt: "2026-07-20T19:00:00.000Z",
      execution: {
        exists: true,
        status: "NOT_STARTED",
        arrivedAt: null,
        startedAt: null,
        endedAt: null,
        observationCount: 0,
        commitmentCount: 0,
        followUpCount: 0,
      },
    });
    const after = detectMissionAttention(
      late,
      NOW,
      DEFAULT_COMMAND_CENTER_CONFIG,
      TZ,
    );
    expect(after.some((a) => a.reason === "EXECUTION_NOT_STARTED")).toBe(true);

    const early = snapshot({
      missionId: "exec2",
      lifecyclePhase: "EXECUTE",
      startsAt: "2026-07-20T16:45:00.000Z", // 15 min before NOW < 30 grace
      endsAt: "2026-07-20T19:00:00.000Z",
      execution: {
        exists: true,
        status: "NOT_STARTED",
        arrivedAt: null,
        startedAt: null,
        endedAt: null,
        observationCount: 0,
        commitmentCount: 0,
        followUpCount: 0,
      },
    });
    const before = detectMissionAttention(
      early,
      NOW,
      DEFAULT_COMMAND_CENTER_CONFIG,
      TZ,
    );
    expect(before.some((a) => a.reason === "EXECUTION_NOT_STARTED")).toBe(false);
  });

  it("places active and upcoming missions in correct queues", () => {
    const active = snapshot({
      missionId: "active",
      lifecyclePhase: "EXECUTE",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T19:00:00.000Z",
      execution: {
        exists: true,
        status: "IN_PROGRESS",
        arrivedAt: "2026-07-20T15:50:00.000Z",
        startedAt: "2026-07-20T16:05:00.000Z",
        endedAt: null,
        observationCount: 1,
        commitmentCount: 0,
        followUpCount: 0,
      },
    });
    const upcoming = snapshot({
      missionId: "next",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-22T15:00:00.000Z",
      endsAt: "2026-07-22T17:00:00.000Z",
      preparation: {
        exists: true,
        readiness: "DRAFT",
        strategicPurpose: null,
        keyMessage: null,
      },
    });
    const oldClosed = snapshot({
      missionId: "old",
      lifecyclePhase: "COMPLETE",
      startsAt: "2026-06-01T15:00:00.000Z",
      endsAt: "2026-06-01T17:00:00.000Z",
      followUp: {
        exists: true,
        status: "CLOSED",
        completedAt: "2026-06-02T12:00:00.000Z",
        closedAt: "2026-06-02T12:00:00.000Z",
        closedByUserId: "u1",
        closeoutSummary: "Done",
        actions: [],
      },
    });
    const vm = buildCommandCenterViewModel({
      missions: [active, upcoming, oldClosed],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.activeNow.map((m) => m.missionId)).toContain("active");
    expect(vm.comingNext.map((m) => m.missionId)).toContain("next");
    expect(vm.recentlyClosed.map((m) => m.missionId)).not.toContain("old");
    expect(vm.isolation.mutatesRecords).toBe(false);
  });

  it("keeps old missions with unresolved follow-up in the operating set", () => {
    const oldOpen = snapshot({
      missionId: "old-fu",
      lifecyclePhase: "FOLLOW_UP",
      startsAt: "2026-05-01T15:00:00.000Z",
      endsAt: "2026-05-01T17:00:00.000Z",
      followUp: {
        exists: true,
        status: "ACTIVE",
        completedAt: null,
        closedAt: null,
        closedByUserId: null,
        closeoutSummary: null,
        actions: [
          {
            id: "a1",
            title: "Call mayor",
            sourceType: "EXECUTE_COMMITMENT",
            status: "OPEN",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "Kelly",
            dueAt: "2026-07-01T12:00:00.000Z",
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: null,
            relatedPersonName: "Mayor",
            relatedOrganizationName: null,
            sourceSnapshot: { originalText: "Call the mayor" },
          },
        ],
      },
    });
    const vm = buildCommandCenterViewModel({
      missions: [oldOpen],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.commitments.some((c) => c.actionId === "a1")).toBe(true);
    expect(
      vm.immediateAttention.some((a) => a.reason === "URGENT_COMMITMENT_OVERDUE"),
    ).toBe(true);
  });

  it("surfaces preparation risk within window and skips ready prep", () => {
    const risk = snapshot({
      missionId: "risk",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-21T15:00:00.000Z",
      endsAt: "2026-07-21T17:00:00.000Z",
      preparation: {
        exists: true,
        readiness: "DRAFT",
        strategicPurpose: null,
        keyMessage: null,
      },
    });
    const ready = snapshot({
      missionId: "ready",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-21T18:00:00.000Z",
      endsAt: "2026-07-21T20:00:00.000Z",
      preparation: {
        exists: true,
        readiness: "READY",
        strategicPurpose: "Purpose",
        keyMessage: "Message",
      },
    });
    const vm = buildCommandCenterViewModel({
      missions: [risk, ready],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.preparationRisk.map((m) => m.missionId)).toEqual(["risk"]);
  });

  it("queues debrief groups and ready-to-close / recently closed", () => {
    const notStarted = snapshot({
      missionId: "d1",
      lifecyclePhase: "DEBRIEF",
      startsAt: "2026-07-19T15:00:00.000Z",
      endsAt: "2026-07-19T17:00:00.000Z",
      execution: {
        exists: true,
        status: "COMPLETED",
        arrivedAt: "2026-07-19T14:50:00.000Z",
        startedAt: "2026-07-19T15:00:00.000Z",
        endedAt: "2026-07-19T17:05:00.000Z",
        observationCount: 2,
        commitmentCount: 1,
        followUpCount: 0,
      },
      debrief: {
        exists: false,
        status: null,
        outcomeAssessment: null,
        approvedFollowUpCount: 0,
        completedAt: null,
        approvedAt: null,
      },
    });
    const awaiting = snapshot({
      missionId: "d2",
      lifecyclePhase: "DEBRIEF",
      startsAt: "2026-07-18T15:00:00.000Z",
      endsAt: "2026-07-18T17:00:00.000Z",
      execution: {
        exists: true,
        status: "COMPLETED",
        arrivedAt: null,
        startedAt: null,
        endedAt: "2026-07-18T17:00:00.000Z",
        observationCount: 1,
        commitmentCount: 0,
        followUpCount: 0,
      },
      debrief: {
        exists: true,
        status: "COMPLETED",
        outcomeAssessment: "PARTIALLY_ACHIEVED",
        approvedFollowUpCount: 0,
        completedAt: "2026-07-19T12:00:00.000Z",
        approvedAt: null,
      },
    });
    const rtc = snapshot({
      missionId: "close1",
      lifecyclePhase: "FOLLOW_UP",
      followUp: {
        exists: true,
        status: "READY_TO_CLOSE",
        completedAt: "2026-07-20T12:00:00.000Z",
        closedAt: null,
        closedByUserId: null,
        closeoutSummary: "Ready",
        actions: [
          {
            id: "done1",
            title: "Done",
            sourceType: "OPERATOR_ADDED",
            status: "COMPLETED",
            priority: "NORMAL",
            ownerType: "EXTERNAL",
            ownerName: "Ops",
            dueAt: null,
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: null,
          },
        ],
      },
    });
    const recent = snapshot({
      missionId: "closed1",
      lifecyclePhase: "COMPLETE",
      followUp: {
        exists: true,
        status: "CLOSED",
        completedAt: "2026-07-18T12:00:00.000Z",
        closedAt: "2026-07-18T12:00:00.000Z",
        closedByUserId: "u1",
        closeoutSummary: "Closed",
        actions: [],
      },
    });
    const vm = buildCommandCenterViewModel({
      missions: [notStarted, awaiting, rtc, recent],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.debriefQueue.find((d) => d.missionId === "d1")?.group).toBe(
      "NOT_STARTED",
    );
    expect(vm.debriefQueue.find((d) => d.missionId === "d2")?.group).toBe(
      "READY_FOR_APPROVAL",
    );
    expect(vm.readyToClose.map((m) => m.missionId)).toContain("close1");
    expect(vm.readyToClose.map((m) => m.missionId)).not.toContain("closed1");
    expect(vm.recentlyClosed.map((m) => m.missionId)).toContain("closed1");
  });

  it("handles waiting nextCheckAt, blocked, unassigned, and excludes completed/cancelled commitments", () => {
    const m = snapshot({
      missionId: "fu",
      lifecyclePhase: "FOLLOW_UP",
      followUp: {
        exists: true,
        status: "ACTIVE",
        completedAt: null,
        closedAt: null,
        closedByUserId: null,
        closeoutSummary: null,
        actions: [
          {
            id: "wait-future",
            title: "Wait future",
            sourceType: "OPERATOR_ADDED",
            status: "WAITING",
            priority: "NORMAL",
            ownerType: "EXTERNAL",
            ownerName: "A",
            dueAt: null,
            nextCheckAt: "2026-07-25T12:00:00.000Z",
            waitingReason: "Pending",
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: null,
          },
          {
            id: "wait-due",
            title: "Wait due",
            sourceType: "OPERATOR_ADDED",
            status: "WAITING",
            priority: "NORMAL",
            ownerType: "EXTERNAL",
            ownerName: "A",
            dueAt: null,
            nextCheckAt: "2026-07-19T12:00:00.000Z",
            waitingReason: "Pending",
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: null,
          },
          {
            id: "blocked",
            title: "Blocked item",
            sourceType: "OPERATOR_ADDED",
            status: "BLOCKED",
            priority: "IMPORTANT",
            ownerType: "EXTERNAL",
            ownerName: "A",
            dueAt: null,
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: "Needs decision",
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: null,
          },
          {
            id: "unassigned",
            title: "Needs owner",
            sourceType: "OPERATOR_ADDED",
            status: "OPEN",
            priority: "URGENT",
            ownerType: "UNASSIGNED",
            ownerName: null,
            dueAt: null,
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: null,
          },
          {
            id: "done-commit",
            title: "Done commitment",
            sourceType: "EXECUTE_COMMITMENT",
            status: "COMPLETED",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "A",
            dueAt: "2026-07-01T12:00:00.000Z",
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: { originalText: "Done" },
          },
          {
            id: "cancel-commit",
            title: "Cancelled commitment",
            sourceType: "EXECUTE_COMMITMENT",
            status: "CANCELLED",
            priority: "URGENT",
            ownerType: "EXTERNAL",
            ownerName: "A",
            dueAt: "2026-07-01T12:00:00.000Z",
            nextCheckAt: null,
            waitingReason: null,
            blockedReason: null,
            relatedPersonName: null,
            relatedOrganizationName: null,
            sourceSnapshot: { originalText: "Cancelled" },
          },
        ],
      },
    });
    const vm = buildCommandCenterViewModel({
      missions: [m],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.followUpAccountability.some((a) => a.actionId === "wait-future")).toBe(
      false,
    );
    expect(vm.followUpAccountability.some((a) => a.actionId === "wait-due")).toBe(
      true,
    );
    expect(vm.blockedWork.some((a) => a.actionId === "blocked")).toBe(true);
    expect(
      vm.immediateAttention.some((a) => a.reason === "FOLLOW_UP_UNASSIGNED"),
    ).toBe(true);
    expect(vm.commitments.some((c) => c.actionId === "done-commit")).toBe(false);
    expect(vm.commitments.some((c) => c.actionId === "cancel-commit")).toBe(false);
  });

  it("enforces section limits and does not expose private notes", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      snapshot({
        missionId: `m${i}`,
        lifecyclePhase: "EXECUTE",
        startsAt: `2026-07-20T${String(10 + (i % 5)).padStart(2, "0")}:00:00.000Z`,
        endsAt: `2026-07-20T${String(12 + (i % 5)).padStart(2, "0")}:00:00.000Z`,
        execution: {
          exists: true,
          status: "IN_PROGRESS",
          arrivedAt: null,
          startedAt: "2026-07-20T10:00:00.000Z",
          endedAt: null,
          observationCount: 0,
          commitmentCount: 0,
          followUpCount: 0,
        },
      }),
    );
    const vm = buildCommandCenterViewModel({
      missions: many,
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.activeNow.length).toBeLessThanOrEqual(
      DEFAULT_COMMAND_CENTER_CONFIG.sectionLimits.activeNow,
    );
    const json = JSON.stringify(vm);
    expect(json).not.toContain("internalNotes");
    expect(json).not.toContain("operatorNotes");
    expect(json).not.toContain("fieldNotes");
  });

  it("detects integrity warning without inventing mutations", () => {
    const m = snapshot({
      missionId: "integrity",
      lifecyclePhase: "FOLLOW_UP",
      debrief: {
        exists: true,
        status: "IN_PROGRESS",
        outcomeAssessment: null,
        approvedFollowUpCount: 0,
        completedAt: null,
        approvedAt: null,
      },
      followUp: {
        exists: true,
        status: "ACTIVE",
        completedAt: null,
        closedAt: null,
        closedByUserId: null,
        closeoutSummary: null,
        actions: [],
      },
    });
    const items = detectMissionAttention(
      m,
      NOW,
      DEFAULT_COMMAND_CENTER_CONFIG,
      TZ,
    );
    expect(items.some((a) => a.reason === "RECORD_INTEGRITY_REVIEW")).toBe(true);
    const vm = buildCommandCenterViewModel({
      missions: [m],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.isolation.readOnly).toBe(true);
    expect(vm.isolation.eventScheduleEditableHere).toBe(false);
  });

  it("orders coming next and ready-to-close deterministically", () => {
    const a = snapshot({
      missionId: "z",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-23T15:00:00.000Z",
      endsAt: "2026-07-23T17:00:00.000Z",
    });
    const b = snapshot({
      missionId: "a",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-22T15:00:00.000Z",
      endsAt: "2026-07-22T17:00:00.000Z",
    });
    const c = snapshot({
      missionId: "b",
      lifecyclePhase: "PREPARE",
      startsAt: "2026-07-22T15:00:00.000Z",
      endsAt: "2026-07-22T17:00:00.000Z",
    });
    const vm = buildCommandCenterViewModel({
      missions: [a, c, b],
      now: NOW,
      campaignTimezone: TZ,
      filters: parseCommandCenterFilters({}),
    });
    expect(vm.comingNext.map((m) => m.missionId)).toEqual(["a", "b", "z"]);
  });
});
