import { describe, expect, it } from "vitest";
import {
  canTransitionReadiness,
  mergePreparationPatch,
  validatePreparationPatch,
  emptyMissionPreparation,
  buildPreparationReadinessChecks,
} from "@/lib/missions/v21/preparation";
import type { CampaignMission } from "@/lib/missions/v21/types";
import type { MissionPreparationRecord } from "@/lib/missions/v21/preparation/types";

function samplePrep(overrides: Partial<MissionPreparationRecord> = {}): MissionPreparationRecord {
  const empty = emptyMissionPreparation("mission_1");
  return {
    ...empty,
    id: "prep_1",
    strategicPurpose: "Build Sharp County relationships",
    keyMessage: "Integrity and local presence",
    talkingPoints: [{ id: "tp1", text: "Election integrity" }],
    questionsToAsk: [{ id: "q1", text: "What issues matter most here?" }],
    preparationTasks: [
      {
        id: "t1",
        label: "Confirm host",
        owner: "Advance",
        dueAt: null,
        completed: false,
        notes: null,
        sortOrder: 0,
        createdAt: "2026-07-20T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("V2.1 Prepare Mode validation & merge", () => {
  it("rejects Event schedule fields", () => {
    const result = validatePreparationPatch({
      section: "logistics",
      startsAt: "2026-07-24T15:00:00.000Z",
      arrivalInstructions: "Use side entrance",
    });
    expect(result.ok).toBe(false);
    expect(
      result.issues.some((i) => i.code === "FORBIDDEN_SCHEDULE_FIELD"),
    ).toBe(true);
  });

  it("rejects unknown readiness and oversized text", () => {
    const badReady = validatePreparationPatch({
      section: "readiness",
      readinessState: "LOCKED",
    });
    expect(badReady.ok).toBe(false);

    const huge = "x".repeat(5001);
    const badLen = validatePreparationPatch({
      section: "strategy",
      strategicPurpose: huge,
    });
    expect(badLen.ok).toBe(false);
  });

  it("normalizes empty strings and accepts section patches", () => {
    const result = validatePreparationPatch({
      section: "strategy",
      strategicPurpose: "  Build presence  ",
      desiredImpression: "   ",
    });
    expect(result.ok).toBe(true);
    expect(result.value?.strategicPurpose).toBe("Build presence");
    expect(result.value?.desiredImpression).toBeNull();
  });

  it("updates one section while preserving others", () => {
    const before = samplePrep();
    const patch = validatePreparationPatch({
      section: "logistics",
      arrivalInstructions: "Park behind chamber",
    });
    expect(patch.ok).toBe(true);
    const merged = mergePreparationPatch(before, patch.value!, "user_1");
    expect(merged.arrivalInstructions).toBe("Park behind chamber");
    expect(merged.strategicPurpose).toBe(before.strategicPurpose);
    expect(merged.keyMessage).toBe(before.keyMessage);
    expect(merged.talkingPoints).toEqual(before.talkingPoints);
    expect(merged.preparationTasks).toEqual(before.preparationTasks);
  });

  it("allows readiness transitions without implying lifecycle change", () => {
    expect(canTransitionReadiness("DRAFT", "READY")).toBe(true);
    expect(canTransitionReadiness("READY", "DRAFT")).toBe(true);
    const before = samplePrep({ readinessState: "DRAFT" });
    const patch = validatePreparationPatch({
      section: "readiness",
      readinessState: "READY",
    });
    const merged = mergePreparationPatch(before, patch.value!, "user_1");
    expect(merged.readinessState).toBe("READY");
    expect(merged.markedReadyByUserId).toBe("user_1");
    expect(merged.markedReadyAt).toBeTruthy();
  });

  it("task updates preserve unrelated preparation content", () => {
    const before = samplePrep();
    const tasks = before.preparationTasks.map((t) => ({
      ...t,
      completed: true,
    }));
    const patch = validatePreparationPatch({
      section: "tasks",
      preparationTasks: tasks,
    });
    const merged = mergePreparationPatch(before, patch.value!, "user_1");
    expect(merged.preparationTasks[0]?.completed).toBe(true);
    expect(merged.strategicPurpose).toBe(before.strategicPurpose);
    expect(merged.questionsToAsk).toEqual(before.questionsToAsk);
  });

  it("checklist does not auto-claim READY", () => {
    const prep = samplePrep({
      readinessState: "DRAFT",
      arrivalInstructions: "Side door",
      materialsNeeded: [{ id: "m1", text: "Cards" }],
      peopleBriefings: [
        {
          id: "p1",
          name: "Mayor (placeholder)",
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
      preparationTasks: [
        {
          id: "t1",
          label: "Done",
          owner: null,
          dueAt: null,
          completed: true,
          notes: null,
          sortOrder: 0,
          createdAt: "2026-07-20T00:00:00.000Z",
          updatedAt: "2026-07-20T00:00:00.000Z",
        },
      ],
    });
    const checks = buildPreparationReadinessChecks(prep, {
      hasObjective: true,
      hasSuccessCriteria: true,
    });
    expect(checks.find((c) => c.id === "markedReady")?.ok).toBe(false);
    expect(prep.readinessState).toBe("DRAFT");
  });

  it("reprojection of CampaignMission cannot erase preparation (separate record)", () => {
    const before = samplePrep();
    // Simulate Event change → new CampaignMission projection while prep stays put.
    const projected: CampaignMission = {
      id: "mission_1",
      sourceEventId: "evt_1",
      sourceEventNumber: "KCCC-1",
      sourceEventVersion: 3,
      projectionVersion: "v2.1.0",
      attendTitle: "Updated title from Event",
      objective: "Updated objective",
      objectiveSource: "OBJECTIVE",
      successCriteria: [{ text: "Meet mayor", source: "OBJECTIVE" }],
      missionStatus: "PREPARING",
      lifecyclePhase: "PREPARE",
      intelligence: {
        county: "Sharp",
        city: "Cave City",
        region: null,
        organizations: ["Chamber"],
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
        hasSuccessCriteria: true,
        hasGeography: true,
        hasIntelligenceSignal: true,
        isDraftValid: true,
        unknownFields: [],
      },
      startsAt: "2026-07-24T15:00:00.000Z",
      endsAt: "2026-07-24T19:00:00.000Z",
      timezone: "America/Chicago",
      operatorOwnedFields: [],
      projectedAt: "2026-07-20T12:00:00.000Z",
    };

    expect("strategicPurpose" in projected).toBe(false);
    expect("talkingPoints" in projected).toBe(false);
    expect(before.strategicPurpose).toBe("Build Sharp County relationships");
    expect(before.keyMessage).toBe("Integrity and local presence");
    expect(before.talkingPoints[0]?.text).toBe("Election integrity");
    // Projected Event change appears on mission; briefing content remains on preparation.
    expect(projected.attendTitle).toBe("Updated title from Event");
    expect(before.missionId).toBe("mission_1");
  });
});
