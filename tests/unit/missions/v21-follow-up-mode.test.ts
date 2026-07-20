import { describe, expect, it } from "vitest";
import { emptyMissionDebrief } from "@/lib/missions/v21/debrief";
import {
  buildImportKey,
  canCloseMission,
  canMarkReadyToClose,
  canTransitionFollowUpAction,
  canTransitionFollowUpWorkspace,
  collectApprovedFollowUpCandidates,
  emptyMissionFollowUp,
  selectNextRequiredAction,
  validateFollowUpPatch,
  type MissionFollowUpActionRecord,
} from "@/lib/missions/v21/follow-up";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";

function action(
  overrides: Partial<MissionFollowUpActionRecord> & {
    id: string;
    priority?: MissionFollowUpActionRecord["priority"];
  },
): MissionFollowUpActionRecord {
  return {
    followUpId: "fu_1",
    sourceType: "OPERATOR_ADDED",
    sourceRecordId: null,
    importKey: null,
    sourceSnapshot: null,
    title: "Action",
    description: null,
    status: "OPEN",
    priority: "NORMAL",
    ownerType: "EXTERNAL",
    ownerUserId: null,
    ownerName: "Owner",
    ownerRole: null,
    relatedPersonName: null,
    relatedOrganizationName: null,
    dueAt: null,
    nextCheckAt: null,
    waitingReason: null,
    blockedReason: null,
    completionSummary: null,
    completionEvidence: [],
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdByUserId: null,
    updatedByUserId: null,
    completedByUserId: null,
    cancelledByUserId: null,
    sortOrder: 0,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

const tz = "America/Chicago";
const now = new Date("2026-07-20T17:00:00.000Z"); // afternoon UTC ≈ midday CDT

describe("V2.1 Follow-up Mode", () => {
  it("routes FOLLOW_UP CTA to canonical /follow-up", () => {
    const start = primaryActionForPhase("m1", "FOLLOW_UP");
    expect(start.href).toBe("/system/missions/m1/follow-up");
    expect(start.forthcomingNote).toBeNull();
    const cont = primaryActionForPhase("m1", "FOLLOW_UP", {
      followUpStatus: "ACTIVE",
    });
    expect(cont.label).toBe("Continue Follow-up");
  });

  it("imports only human-approved Debrief items", () => {
    const debrief = emptyMissionDebrief("m1");
    debrief.debriefStatus = "APPROVED";
    debrief.commitmentReviews = [
      {
        id: "cr1",
        executeCommitmentId: "c1",
        originalText: "Send packet",
        clarification: null,
        owner: "Kelly",
        dueAt: null,
        confirmed: true,
        resolved: false,
        uncertain: false,
        approvedForFollowUp: true,
        notes: null,
        updatedAt: now.toISOString(),
      },
      {
        id: "cr2",
        executeCommitmentId: "c2",
        originalText: "Skip me",
        clarification: null,
        owner: null,
        dueAt: null,
        confirmed: false,
        resolved: false,
        uncertain: false,
        approvedForFollowUp: false,
        notes: null,
        updatedAt: now.toISOString(),
      },
    ];
    debrief.peopleOutcomes = [
      {
        id: "po1",
        name: "Alex",
        roleOrOrg: null,
        prepareGoal: null,
        executeState: "SPOKE_WITH",
        executeNote: null,
        relationshipOutcome: "STRENGTHENED",
        recommendedNextStep: "Call next week",
        followUpNeeded: true,
        notes: null,
        updatedAt: now.toISOString(),
      },
    ];
    const candidates = collectApprovedFollowUpCandidates("m1", debrief);
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.sourceRecordId).sort()).toEqual([
      "cr1",
      "po1",
    ]);
    expect(candidates[0]?.importKey).toBe(
      buildImportKey("m1", candidates[0]!.sourceType, candidates[0]!.sourceRecordId),
    );
  });

  it("builds deterministic import keys", () => {
    expect(
      buildImportKey("m1", "EXECUTE_COMMITMENT", "cr1"),
    ).toBe("m1::EXECUTE_COMMITMENT::cr1");
  });

  it("rejects Event schedule and phase mutation fields", () => {
    const result = validateFollowUpPatch({
      section: "notes",
      startsAt: "2026-07-24T15:00:00.000Z",
      lifecyclePhase: "COMPLETE",
      debriefStatus: "APPROVED",
      missionStatus: "COMPLETE",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "FORBIDDEN_FIELD")).toBe(true);
  });

  it("requires title for operator-added actions", () => {
    const result = validateFollowUpPatch({
      section: "addAction",
      action: { title: "   " },
    });
    expect(result.ok).toBe(false);
  });

  it("normalizes empty closeout notes to null", () => {
    const result = validateFollowUpPatch({
      section: "notes",
      closeoutSummary: "   ",
    });
    expect(result.ok).toBe(true);
    expect(result.value?.closeoutSummary).toBeNull();
  });

  it("enforces action status transitions", () => {
    expect(canTransitionFollowUpAction("OPEN", "COMPLETED")).toBe(true);
    expect(canTransitionFollowUpAction("COMPLETED", "OPEN")).toBe(false);
    expect(canTransitionFollowUpAction("CANCELLED", "IN_PROGRESS")).toBe(false);
  });

  it("enforces workspace transitions", () => {
    expect(canTransitionFollowUpWorkspace("NOT_STARTED", "ACTIVE")).toBe(true);
    expect(canTransitionFollowUpWorkspace("ACTIVE", "READY_TO_CLOSE")).toBe(
      true,
    );
    expect(canTransitionFollowUpWorkspace("CLOSED", "ACTIVE")).toBe(false);
  });

  it("selects overdue urgent over due-today urgent", () => {
    const next = selectNextRequiredAction(
      [
        action({
          id: "a2",
          priority: "URGENT",
          dueAt: "2026-07-20T17:00:00.000Z",
          title: "Due today urgent",
        }),
        action({
          id: "a1",
          priority: "URGENT",
          dueAt: "2026-07-18T17:00:00.000Z",
          title: "Overdue urgent",
        }),
      ],
      { now, campaignTimezone: tz },
    );
    expect(next?.id).toBe("a1");
  });

  it("selects due-today urgent over overdue important", () => {
    const next = selectNextRequiredAction(
      [
        action({
          id: "imp",
          priority: "IMPORTANT",
          dueAt: "2026-07-18T17:00:00.000Z",
        }),
        action({
          id: "urg",
          priority: "URGENT",
          dueAt: "2026-07-20T17:00:00.000Z",
        }),
      ],
      { now, campaignTimezone: tz },
    );
    expect(next?.id).toBe("urg");
  });

  it("excludes completed and cancelled from next action", () => {
    const next = selectNextRequiredAction(
      [
        action({ id: "done", status: "COMPLETED", priority: "URGENT" }),
        action({ id: "cancel", status: "CANCELLED", priority: "URGENT" }),
        action({ id: "open", priority: "NORMAL" }),
      ],
      { now, campaignTimezone: tz },
    );
    expect(next?.id).toBe("open");
  });

  it("deprioritizes waiting before nextCheckAt", () => {
    const next = selectNextRequiredAction(
      [
        action({
          id: "wait",
          status: "WAITING",
          priority: "URGENT",
          nextCheckAt: "2026-08-01T12:00:00.000Z",
          waitingReason: "Clerk",
        }),
        action({
          id: "open",
          priority: "NORMAL",
          dueAt: "2026-07-25T12:00:00.000Z",
        }),
      ],
      { now, campaignTimezone: tz },
    );
    expect(next?.id).toBe("open");
  });

  it("uses stable id tie-break", () => {
    const next = selectNextRequiredAction(
      [
        action({ id: "b", priority: "NORMAL", sortOrder: 1 }),
        action({ id: "a", priority: "NORMAL", sortOrder: 1 }),
      ],
      { now, campaignTimezone: tz },
    );
    expect(next?.id).toBe("a");
  });

  it("rejects ready-to-close when open actions remain", () => {
    const record = emptyMissionFollowUp("m1");
    record.id = "fu";
    record.followUpStatus = "ACTIVE";
    record.closeoutSummary = "Ready";
    record.actions = [action({ id: "a1", status: "OPEN", ownerName: "Kelly" })];
    const result = canMarkReadyToClose(record, {
      debriefApproved: true,
      now,
      campaignTimezone: tz,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects ready-to-close without closeout summary", () => {
    const record = emptyMissionFollowUp("m1");
    record.id = "fu";
    record.followUpStatus = "ACTIVE";
    record.actions = [];
    const result = canMarkReadyToClose(record, {
      debriefApproved: true,
      now,
      campaignTimezone: tz,
    });
    expect(result.ok).toBe(false);
  });

  it("allows ready-to-close when checks pass", () => {
    const record = emptyMissionFollowUp("m1");
    record.id = "fu";
    record.followUpStatus = "ACTIVE";
    record.closeoutSummary = "All commitments honored.";
    record.actions = [
      action({
        id: "a1",
        status: "COMPLETED",
        sourceType: "EXECUTE_COMMITMENT",
        completionSummary: "Sent packet",
        ownerName: "Kelly",
      }),
    ];
    const result = canMarkReadyToClose(record, {
      debriefApproved: true,
      now,
      campaignTimezone: tz,
    });
    expect(result.ok).toBe(true);
  });

  it("requires READY_TO_CLOSE and approved Debrief to close", () => {
    const record = emptyMissionFollowUp("m1");
    record.followUpStatus = "ACTIVE";
    record.closeoutSummary = "Done";
    expect(canCloseMission(record, true).ok).toBe(false);
    record.followUpStatus = "READY_TO_CLOSE";
    expect(canCloseMission(record, false).ok).toBe(false);
    expect(canCloseMission(record, true).ok).toBe(true);
  });

  it("cancellation is not counted as completed in closeout checks", () => {
    const record = emptyMissionFollowUp("m1");
    record.followUpStatus = "ACTIVE";
    record.closeoutSummary = "Closed with waiver";
    record.actions = [
      action({
        id: "a1",
        status: "CANCELLED",
        sourceType: "EXECUTE_COMMITMENT",
        cancellationReason: "Recipient declined",
        ownerName: "Kelly",
      }),
    ];
    expect(
      canMarkReadyToClose(record, {
        debriefApproved: true,
        now,
        campaignTimezone: tz,
      }).ok,
    ).toBe(true);
  });
});
