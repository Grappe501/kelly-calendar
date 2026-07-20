import { describe, expect, it } from "vitest";
import {
  canApproveDebrief,
  canCompleteDebrief,
  canTransitionDebrief,
  emptyMissionDebrief,
  mergeDebriefPatch,
  seedDebriefReviews,
  validateDebriefPatch,
  type MissionDebriefRecord,
} from "@/lib/missions/v21/debrief";
import { primaryActionForPhase } from "@/lib/missions/v21/mission-home-view-model";

function sampleDebrief(
  overrides: Partial<MissionDebriefRecord> = {},
): MissionDebriefRecord {
  return {
    ...emptyMissionDebrief("mission_1"),
    id: "debrief_1",
    ...overrides,
  };
}

const ctx = { hasExecutionRecord: true, successCriteriaCount: 1 };

describe("V2.1 Debrief Mode transitions & validation", () => {
  it("allows NOT_STARTED → IN_PROGRESS and records startedAt", () => {
    const before = sampleDebrief({ debriefStatus: "NOT_STARTED" });
    const patch = validateDebriefPatch({ section: "start" });
    expect(patch.ok).toBe(true);
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.debriefStatus).toBe("IN_PROGRESS");
    expect(merged.record.startedAt).toBeTruthy();
    expect(merged.record.startedByUserId).toBe("user_1");
  });

  it("persists outcome assessment and summary", () => {
    const before = sampleDebrief({ debriefStatus: "IN_PROGRESS" });
    const patch = validateDebriefPatch({
      section: "outcome",
      outcomeAssessment: "PARTIALLY_ACHIEVED",
      outcomeSummary: "Met local contacts; chamber absent.",
    });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.outcomeAssessment).toBe("PARTIALLY_ACHIEVED");
    expect(merged.record.outcomeSummary).toContain("chamber");
  });

  it("rejects NOT_ASSESSED approval", () => {
    const before = sampleDebrief({
      debriefStatus: "COMPLETED",
      outcomeAssessment: "NOT_ASSESSED",
      outcomeSummary: "Something",
    });
    expect(canApproveDebrief(before).ok).toBe(false);
    const patch = validateDebriefPatch({ section: "approve" });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(false);
  });

  it("rejects incomplete completion", () => {
    const before = sampleDebrief({
      debriefStatus: "IN_PROGRESS",
      outcomeAssessment: "NOT_ASSESSED",
    });
    expect(canCompleteDebrief(before, ctx).ok).toBe(false);
    const patch = validateDebriefPatch({ section: "complete" });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(false);
  });

  it("completes when checklist requirements are met", () => {
    const before = sampleDebrief({
      debriefStatus: "IN_PROGRESS",
      outcomeAssessment: "ACHIEVED",
      outcomeSummary: "Objective met with local educators.",
      criterionAssessments: [
        {
          id: "crit_0",
          criterionText: "Meet local educators",
          assessment: "MET",
          evidence: "Spoke with two teachers",
          notes: null,
          updatedAt: "2026-07-20T12:00:00.000Z",
        },
      ],
      whatWorked: [
        {
          id: "ww_1",
          statement: "Early arrival helped",
          category: null,
          explanation: null,
          practiceOrChange: null,
          rootCause: null,
          importance: "NORMAL",
          createdAt: "2026-07-20T12:00:00.000Z",
          createdByUserId: null,
        },
      ],
      commitmentReviews: [],
      followUpReviews: [],
    });
    const patch = validateDebriefPatch({ section: "complete" });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.debriefStatus).toBe("COMPLETED");
    expect(merged.record.completedAt).toBeTruthy();
    expect(merged.record.completedByUserId).toBe("user_1");
  });

  it("approves completed assessed debrief and records actor", () => {
    const before = sampleDebrief({
      debriefStatus: "COMPLETED",
      outcomeAssessment: "ACHIEVED",
      outcomeSummary: "Done well.",
      completedAt: "2026-07-20T13:00:00.000Z",
    });
    const patch = validateDebriefPatch({ section: "approve" });
    const merged = mergeDebriefPatch(before, patch.value!, "leader_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.debriefStatus).toBe("APPROVED");
    expect(merged.record.approvedAt).toBeTruthy();
    expect(merged.record.approvedByUserId).toBe("leader_1");
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionDebrief("NOT_STARTED", "APPROVED")).toBe(false);
    expect(canTransitionDebrief("APPROVED", "IN_PROGRESS")).toBe(false);
  });

  it("rejects Event schedule and Prepare/Execute mutation fields", () => {
    const result = validateDebriefPatch({
      section: "notes",
      startsAt: "2026-07-24T15:00:00.000Z",
      lifecyclePhase: "COMPLETE",
      executionStatus: "COMPLETED",
      readinessState: "READY",
      keyMessage: "hack",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "FORBIDDEN_FIELD")).toBe(true);
  });

  it("preserves unrelated sections when updating outcome", () => {
    const before = sampleDebrief({
      debriefStatus: "IN_PROGRESS",
      lessonsLearned: [
        {
          id: "l1",
          statement: "Keep lesson",
          evidence: null,
          recommendedChange: null,
          applicability: null,
          category: null,
          importance: "NORMAL",
          recommendForCampaignKnowledge: false,
          createdAt: "2026-07-20T12:00:00.000Z",
          createdByUserId: null,
        },
      ],
      internalNotes: "private",
    });
    const patch = validateDebriefPatch({
      section: "outcome",
      outcomeAssessment: "INCONCLUSIVE",
      outcomeSummary: "Need more info",
    });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.lessonsLearned).toHaveLength(1);
    expect(merged.record.internalNotes).toBe("private");
  });

  it("stores criterion assessment separately from original text", () => {
    const before = sampleDebrief({ debriefStatus: "IN_PROGRESS" });
    const patch = validateDebriefPatch({
      section: "criteria",
      criterionAssessments: [
        {
          id: "crit_0",
          criterionText: "Meet Mayor",
          assessment: "PARTIALLY_MET",
          evidence: "Mayor staff only",
          notes: null,
        },
      ],
    });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.criterionAssessments[0]?.criterionText).toBe(
      "Meet Mayor",
    );
    expect(merged.record.criterionAssessments[0]?.assessment).toBe(
      "PARTIALLY_MET",
    );
  });

  it("persists commitment review without rewriting original text", () => {
    const before = sampleDebrief({ debriefStatus: "IN_PROGRESS" });
    const patch = validateDebriefPatch({
      section: "commitmentReviews",
      commitmentReviews: [
        {
          id: "cr_1",
          executeCommitmentId: "c1",
          originalText: "Send election packet",
          clarification: "Email PDF",
          owner: "Kelly",
          dueAt: null,
          confirmed: true,
          resolved: false,
          uncertain: false,
          approvedForFollowUp: true,
          notes: null,
        },
      ],
    });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.record.commitmentReviews[0]?.originalText).toBe(
      "Send election packet",
    );
    expect(merged.record.commitmentReviews[0]?.approvedForFollowUp).toBe(true);
  });

  it("rejects oversized outcome summary", () => {
    const result = validateDebriefPatch({
      section: "outcome",
      outcomeAssessment: "ACHIEVED",
      outcomeSummary: "x".repeat(5000),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "MAX_LENGTH")).toBe(true);
  });

  it("rejects malformed arrays", () => {
    const result = validateDebriefPatch({
      section: "lessons",
      lessonsLearned: "not-an-array",
    });
    expect(result.ok).toBe(false);
  });

  it("normalizes empty strings to null", () => {
    const result = validateDebriefPatch({
      section: "notes",
      internalNotes: "   ",
    });
    expect(result.ok).toBe(true);
    expect(result.value?.internalNotes).toBeNull();
  });

  it("seeds reviews from prepare/execute without inventing outcomes", () => {
    const seeded = seedDebriefReviews(emptyMissionDebrief("m1"), {
      successCriteria: ["Meet educators"],
      preparePeople: [
        {
          id: "p1",
          name: "Alex",
          roleOrTitle: "Chair",
          organization: "County",
          conversationGoal: "Intro",
        },
      ],
      prepareOrgs: [],
      peopleContacts: [
        {
          id: "pc1",
          preparePersonId: "p1",
          name: "Alex",
          state: "SPOKE_WITH",
          note: "Good chat",
          updatedAt: "2026-07-20T12:00:00.000Z",
        },
      ],
      organizationContacts: [],
      commitments: [
        {
          id: "c1",
          text: "Send packet",
          madeTo: "Alex",
          owner: null,
          dueAt: null,
          needsFollowUp: true,
          completed: false,
          notes: null,
          createdAt: "2026-07-20T12:00:00.000Z",
          updatedAt: "2026-07-20T12:00:00.000Z",
          createdByUserId: null,
        },
      ],
      immediateFollowUps: [],
    });
    expect(seeded.criterionAssessments[0]?.assessment).toBe("UNKNOWN");
    expect(seeded.peopleOutcomes[0]?.relationshipOutcome).toBe("UNCLEAR");
    expect(seeded.commitmentReviews[0]?.approvedForFollowUp).toBe(false);
    expect(seeded.outcomeAssessment).toBe("NOT_ASSESSED");
  });

  it("routes DEBRIEF CTA to canonical /debrief", () => {
    const start = primaryActionForPhase("m1", "DEBRIEF");
    expect(start.href).toBe("/system/missions/m1/debrief");
    expect(start.label).toBe("Start Debrief");
    expect(start.forthcomingNote).toBeNull();
    const cont = primaryActionForPhase("m1", "DEBRIEF", {
      debriefStatus: "IN_PROGRESS",
    });
    expect(cont.label).toBe("Continue Debrief");
  });

  it("does not invent lifecycle mutation via merge", () => {
    const before = sampleDebrief({
      debriefStatus: "IN_PROGRESS",
      outcomeAssessment: "ACHIEVED",
      outcomeSummary: "ok",
      whatWorked: [
        {
          id: "ww",
          statement: "x",
          category: null,
          explanation: null,
          practiceOrChange: null,
          rootCause: null,
          importance: "NORMAL",
          createdAt: "2026-07-20T12:00:00.000Z",
          createdByUserId: null,
        },
      ],
      criterionAssessments: [
        {
          id: "c",
          criterionText: "t",
          assessment: "MET",
          evidence: "e",
          notes: null,
          updatedAt: "2026-07-20T12:00:00.000Z",
        },
      ],
    });
    const patch = validateDebriefPatch({ section: "complete" });
    const merged = mergeDebriefPatch(before, patch.value!, "user_1", ctx);
    expect(merged.ok).toBe(true);
    // Merge only touches debrief record fields — no lifecycle/ops fields exist on record.
    if (!merged.ok) return;
    expect(merged.record.missionId).toBe("mission_1");
  });
});
