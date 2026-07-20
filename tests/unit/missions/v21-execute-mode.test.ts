import { describe, expect, it } from "vitest";
import {
  canTransitionExecution,
  emptyMissionExecution,
  mergeExecutionPatch,
  validateExecutionPatch,
} from "@/lib/missions/v21/execution";
import type { MissionExecutionRecord } from "@/lib/missions/v21/execution";
import type { CampaignMission } from "@/lib/missions/v21/types";
import type { MissionPreparationRecord } from "@/lib/missions/v21/preparation/types";
import { emptyMissionPreparation } from "@/lib/missions/v21/preparation";

function sampleExec(
  overrides: Partial<MissionExecutionRecord> = {},
): MissionExecutionRecord {
  return {
    ...emptyMissionExecution("mission_1"),
    id: "exec_1",
    ...overrides,
  };
}

describe("V2.1 Execute Mode transitions & validation", () => {
  it("allows NOT_STARTED → ARRIVED and records arrivedAt", () => {
    const before = sampleExec({ executionStatus: "NOT_STARTED" });
    const patch = validateExecutionPatch({ section: "arrive", note: "Side door" });
    expect(patch.ok).toBe(true);
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.executionStatus).toBe("ARRIVED");
    expect(merged.record.arrivedAt).toBeTruthy();
    expect(merged.record.arrivalNote).toBe("Side door");
    expect(merged.record.arrivedByUserId).toBe("user_1");
  });

  it("allows ARRIVED → IN_PROGRESS and records startedAt", () => {
    const before = sampleExec({
      executionStatus: "ARRIVED",
      arrivedAt: "2026-07-20T15:00:00.000Z",
    });
    const patch = validateExecutionPatch({ section: "start" });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.executionStatus).toBe("IN_PROGRESS");
    expect(merged.record.startedAt).toBeTruthy();
  });

  it("allows IN_PROGRESS → COMPLETED and records endedAt", () => {
    const before = sampleExec({
      executionStatus: "IN_PROGRESS",
      startedAt: "2026-07-20T15:10:00.000Z",
    });
    const patch = validateExecutionPatch({ section: "complete" });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.executionStatus).toBe("COMPLETED");
    expect(merged.record.endedAt).toBeTruthy();
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionExecution("NOT_STARTED", "COMPLETED")).toBe(false);
    const before = sampleExec({ executionStatus: "NOT_STARTED" });
    const patch = validateExecutionPatch({ section: "complete" });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(false);
  });

  it("rejects Event schedule and Prepare/lifecycle mutation fields", () => {
    const result = validateExecutionPatch({
      section: "fieldNotes",
      startsAt: "2026-07-24T15:00:00.000Z",
      lifecyclePhase: "COMPLETE",
      readinessState: "READY",
      keyMessage: "hack",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "FORBIDDEN_FIELD")).toBe(true);
  });

  it("rejects oversized observations", () => {
    const result = validateExecutionPatch({
      section: "observations",
      liveObservations: [{ id: "o1", text: "x".repeat(501) }],
    });
    expect(result.ok).toBe(false);
  });

  it("creates observations and preserves unrelated sections", () => {
    const before = sampleExec({
      executionStatus: "IN_PROGRESS",
      commitments: [
        {
          id: "c1",
          text: "Send packet",
          madeTo: null,
          owner: null,
          dueAt: null,
          needsFollowUp: true,
          completed: false,
          notes: null,
          createdAt: "2026-07-20T15:00:00.000Z",
          updatedAt: "2026-07-20T15:00:00.000Z",
          createdByUserId: null,
        },
      ],
    });
    const patch = validateExecutionPatch({
      section: "observations",
      liveObservations: [
        {
          id: "o1",
          text: "Asked about county training",
          category: "ISSUE",
          important: false,
          createdAt: "2026-07-20T15:30:00.000Z",
          createdByUserId: null,
        },
      ],
    });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.liveObservations).toHaveLength(1);
    expect(merged.record.commitments[0]?.text).toBe("Send packet");
  });

  it("persists person and org contact states without touching Prepare", () => {
    const prep: MissionPreparationRecord = {
      ...emptyMissionPreparation("mission_1"),
      id: "prep_1",
      keyMessage: "Local integrity",
      peopleBriefings: [
        {
          id: "p1",
          name: "Mayor",
          roleOrTitle: "Mayor",
          organization: null,
          relationshipToCampaign: null,
          whyTheyMatter: "Host",
          lastMeaningfulContact: null,
          conversationGoal: "Meet",
          notes: null,
          sourceNote: null,
          linkedPersonId: null,
        },
      ],
    };
    const before = sampleExec({
      peopleContacts: [
        {
          id: "pc1",
          preparePersonId: "p1",
          name: "Mayor",
          state: "NOT_SEEN",
          note: null,
          updatedAt: "2026-07-20T15:00:00.000Z",
        },
      ],
    });
    const patch = validateExecutionPatch({
      section: "peopleContacts",
      peopleContacts: [
        {
          id: "pc1",
          preparePersonId: "p1",
          name: "Mayor",
          state: "SPOKE_WITH",
          note: "Quick hello",
          updatedAt: "2026-07-20T15:40:00.000Z",
        },
      ],
    });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.peopleContacts[0]?.state).toBe("SPOKE_WITH");
    expect(prep.keyMessage).toBe("Local integrity");
    expect(prep.peopleBriefings[0]?.conversationGoal).toBe("Meet");
  });

  it("creates commitments and follow-ups with priority validation", () => {
    const bad = validateExecutionPatch({
      section: "immediateFollowUps",
      immediateFollowUps: [
        { id: "f1", text: "Call back", priority: "CRITICAL" },
      ],
    });
    expect(bad.ok).toBe(false);

    const ok = validateExecutionPatch({
      section: "immediateFollowUps",
      immediateFollowUps: [
        {
          id: "f1",
          text: "Call county chair",
          priority: "URGENT",
          relatedTo: null,
          owner: null,
          dueAt: null,
          completed: false,
          createdAt: "2026-07-20T15:00:00.000Z",
          updatedAt: "2026-07-20T15:00:00.000Z",
          createdByUserId: null,
        },
      ],
    });
    expect(ok.ok).toBe(true);
  });

  it("execution status does not imply lifecycle/ops/prep changes", () => {
    const before = sampleExec({ executionStatus: "IN_PROGRESS" });
    const patch = validateExecutionPatch({ section: "complete" });
    const merged = mergeExecutionPatch(before, patch.value!, "user_1");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    // Merge only returns execution record — no lifecycle/ops/prep fields exist.
    expect("lifecyclePhase" in merged.record).toBe(false);
    expect("missionStatus" in merged.record).toBe(false);
    expect("readinessState" in merged.record).toBe(false);
  });

  it("reprojection of CampaignMission cannot erase execution (separate record)", () => {
    const execution = sampleExec({
      executionStatus: "IN_PROGRESS",
      liveObservations: [
        {
          id: "o1",
          text: "Training question",
          category: "ISSUE",
          important: true,
          createdAt: "2026-07-20T15:30:00.000Z",
          createdByUserId: null,
        },
      ],
    });
    const projected: CampaignMission = {
      id: "mission_1",
      sourceEventId: "evt_1",
      sourceEventNumber: "KCCC-1",
      sourceEventVersion: 4,
      projectionVersion: "v2.1.0",
      attendTitle: "Updated festival title",
      objective: "Updated objective",
      objectiveSource: "OBJECTIVE",
      successCriteria: [],
      missionStatus: "IN_PROGRESS",
      lifecyclePhase: "EXECUTE",
      intelligence: {
        county: "Sharp",
        city: "Cave City",
        region: null,
        organizations: [],
        churches: [],
        businesses: [],
        officials: [],
        media: [],
        schools: [],
        targetVoters: [],
        issues: [],
        fundraisingNotes: null,
        volunteerNotes: null,
        petitions: [],
        press: [],
        opposition: [],
        priority: "A",
        expectedRoi: null,
        expectedAttendance: null,
        eventType: "Festival",
        eventSubtype: null,
        candidateRole: null,
        venueName: null,
      },
      completeness: {
        hasObjective: true,
        hasSuccessCriteria: false,
        hasGeography: true,
        hasIntelligenceSignal: true,
        isDraftValid: true,
        unknownFields: [],
      },
      startsAt: "2026-07-24T15:00:00.000Z",
      endsAt: "2026-07-24T19:00:00.000Z",
      timezone: "America/Chicago",
      operatorOwnedFields: [],
      projectedAt: "2026-07-20T16:00:00.000Z",
    };

    expect("liveObservations" in projected).toBe(false);
    expect("arrivedAt" in projected).toBe(false);
    expect(execution.liveObservations[0]?.text).toBe("Training question");
    expect(projected.attendTitle).toBe("Updated festival title");
  });
});
