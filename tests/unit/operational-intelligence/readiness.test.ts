import { describe, expect, it } from "vitest";
import {
  calculateEventCompletion,
  calculateEventReadiness,
} from "@/features/operational-intelligence/services/readiness-service";
import { getWorkflowBySlug } from "@/features/operational-intelligence/workflow-definitions/registry";

describe("readiness engine", () => {
  it("empty event scores low", () => {
    const result = calculateEventReadiness({ event: { id: "e", version: 1 } });
    expect(result.overallScore).toBeLessThan(50);
    expect(["NOT_STARTED", "AT_RISK"]).toContain(result.readinessLevel);
  });

  it("critical blocker overrides ready labeling", () => {
    const result = calculateEventReadiness({
      event: {
        id: "e",
        version: 2,
        eventType: "Fundraiser",
        campaignDisplayTitle: "Community Reception",
        startsAt: new Date(),
        endsAt: new Date(),
        city: "Little Rock",
        candidateRole: "Speaker",
        hostContactPresent: true,
        objectivesCount: 1,
        programFlowCount: 3,
        staffRequiredCount: 2,
        staffAssignedCount: 2,
        packingCount: 2,
        packingPackedCount: 2,
        communicationsRequiredCount: 1,
        communicationsReadyCount: 1,
        followupsScheduled: 1,
        complianceApprovalMissing: true,
      },
      workflow: getWorkflowBySlug("fundraiser"),
    });
    expect(result.criticalBlockers.length).toBeGreaterThan(0);
    expect(result.readinessLevel).not.toBe("READY");
    expect(result.readinessLevel).not.toBe("COMPLETE");
  });

  it("not-required sections do not reduce score for protected personal", () => {
    const result = calculateEventReadiness({
      event: {
        id: "p",
        version: 1,
        eventType: "Protected Personal Time",
        campaignDisplayTitle: "Protected Personal Time",
        startsAt: new Date(),
        endsAt: new Date(),
        defaultVisibility: "PROTECTED",
      },
      workflow: getWorkflowBySlug("protected-personal-time"),
    });
    const program = result.domains.find((d) => d.domain === "Program Flow");
    expect(program?.status).toBe("NOT_REQUIRED");
  });

  it("completion separates occurred and attendance confirmation", () => {
    const result = calculateEventCompletion({
      event: {
        id: "c",
        version: 1,
        historicalOccurredConfirmed: true,
        historicalAttendanceConfirmed: false,
      },
    });
    expect(result.occurredConfirmed).toBe(true);
    expect(result.candidateAttendanceConfirmed).toBe(false);
  });
});
