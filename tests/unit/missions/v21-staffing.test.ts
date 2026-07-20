import { describe, expect, it } from "vitest";
import {
  assertStaffingIsolation,
  assertStatusTransition,
  buildDayStaffingBoardView,
  computeRequirementCoverage,
  evaluateStaffingFindings,
  launchStaffingBlockers,
  normalizeRoleKey,
  planConfirmationFingerprint,
  scheduleFingerprint,
  staffingDispositionClearsForReadiness,
  staffingIssueKey,
  staffingReadinessFromFindings,
  validateAssignmentTarget,
  validateRequirementCounts,
  type MissionStaffingContext,
  type StaffingPlanInput,
} from "@/lib/missions/v21/staffing";

const TZ = "America/Chicago";
const NOW = "2026-07-20T18:00:00.000Z";

function plan(overrides: Partial<StaffingPlanInput> = {}): StaffingPlanInput {
  return {
    id: "plan1",
    missionId: "m1",
    campaignDateKey: "2026-07-20",
    status: "IN_PROGRESS",
    staffingRequired: true,
    confirmationFingerprint: null,
    confirmedAt: null,
    isStale: false,
    isActive: true,
    requirements: [
      {
        id: "req1",
        roleKey: "GREETER",
        roleLabel: "Greeter",
        requiredCount: 2,
        minimumCount: 1,
        criticality: "CRITICAL",
        requiredByAt: null,
        isActive: true,
        sortOrder: 0,
      },
    ],
    assignments: [],
    acknowledgements: [],
    ...overrides,
  };
}

function context(
  overrides: Partial<MissionStaffingContext> = {},
): MissionStaffingContext {
  return {
    missionId: "m1",
    attendTitle: "Town Hall",
    startsAt: "2026-07-20T16:00:00.000Z",
    endsAt: "2026-07-20T18:00:00.000Z",
    timezone: TZ,
    isCancelled: false,
    scheduleFingerprint: scheduleFingerprint(
      "2026-07-20T16:00:00.000Z",
      "2026-07-20T18:00:00.000Z",
    ),
    linkedMobilizeCancellations: [],
    peerAssignments: [],
    ...overrides,
  };
}

describe("D19 volunteer staffing", () => {
  it("keeps requirement counts valid and ordered role keys stable", () => {
    expect(validateRequirementCounts({ requiredCount: 2, minimumCount: 1 }).ok).toBe(
      true,
    );
    expect(
      validateRequirementCounts({ requiredCount: 1, minimumCount: 2 }).ok,
    ).toBe(false);
    expect(normalizeRoleKey("Door Greeter!")).toBe("DOOR_GREETER");
  });

  it("blocks unreviewed and DO_NOT_LINK external identities", () => {
    expect(
      validateAssignmentTarget({
        targetType: "CONFIRMED_EXTERNAL_REF",
        confirmedExternalPersonId: "ext1",
        externalMatchStatus: "SUGGESTED",
      }).ok,
    ).toBe(false);
    expect(
      validateAssignmentTarget({
        targetType: "CONFIRMED_EXTERNAL_REF",
        confirmedExternalPersonId: "ext1",
        externalMatchStatus: "DO_NOT_LINK",
      }).ok,
    ).toBe(false);
    expect(
      validateAssignmentTarget({
        targetType: "CONFIRMED_EXTERNAL_REF",
        confirmedExternalPersonId: "ext1",
        externalMatchStatus: "AMBIGUOUS",
      }).ok,
    ).toBe(false);
    expect(
      validateAssignmentTarget({
        targetType: "CONFIRMED_EXTERNAL_REF",
        confirmedExternalPersonId: "ext1",
        externalMatchStatus: "CONFIRMED",
      }).ok,
    ).toBe(true);
    expect(
      validateAssignmentTarget({
        targetType: "MANUAL_SCOPED",
        manualDisplayLabel: "Volunteer A",
      }).ok,
    ).toBe(true);
  });

  it("separates proposed, assigned, confirmed, and checked-in coverage", () => {
    const p = plan({
      assignments: [
        {
          id: "a1",
          requirementId: "req1",
          status: "PROPOSED",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "A",
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
        {
          id: "a2",
          requirementId: "req1",
          status: "ASSIGNED",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "B",
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
        {
          id: "a3",
          requirementId: "req1",
          status: "CONFIRMED",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "C",
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
        {
          id: "a4",
          requirementId: "req1",
          status: "CHECKED_IN",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "D",
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
        {
          id: "a5",
          requirementId: "req1",
          status: "CANCELLED",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "E",
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
      ],
    });
    const [row] = computeRequirementCoverage(p);
    expect(row.proposed).toBe(1);
    expect(row.assigned).toBe(3);
    expect(row.confirmed).toBe(2);
    expect(row.checkedIn).toBe(1);
    expect(row.cancelled).toBe(1);
    expect(row.remainingGap).toBe(0);
  });

  it("emits critical uncovered blocker and keeps ACKNOWLEDGED from clearing", () => {
    const findings = evaluateStaffingFindings({
      context: context(),
      plan: plan(),
      nowIso: NOW,
    });
    const critical = findings.find((f) => f.issueType === "CRITICAL_ROLE_UNCOVERED");
    expect(critical?.severity).toBe("BLOCKER");
    expect(staffingIssueKey("CRITICAL_ROLE_UNCOVERED", "req1")).toBe(
      "CRITICAL_ROLE_UNCOVERED:req1",
    );

    const acked = evaluateStaffingFindings({
      context: context(),
      plan: plan({
        acknowledgements: [
          {
            issueKey: "CRITICAL_ROLE_UNCOVERED:req1",
            disposition: "ACKNOWLEDGED",
          },
        ],
      }),
      nowIso: NOW,
    });
    const row = acked.find((f) => f.issueType === "CRITICAL_ROLE_UNCOVERED");
    expect(row?.disposition).toBe("ACKNOWLEDGED");
    expect(row?.clearsForReadiness).toBe(false);
    expect(staffingDispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(staffingReadinessFromFindings(acked, plan())).toBe("BLOCKED");
    expect(launchStaffingBlockers(acked).length).toBeGreaterThan(0);
  });

  it("warns on linked Mobilize cancellation without mutating assignment status", () => {
    const p = plan({
      assignments: [
        {
          id: "a1",
          requirementId: "req1",
          status: "CONFIRMED",
          targetType: "MANUAL_SCOPED",
          campaignUserId: null,
          localPersonId: null,
          manualDisplayLabel: "Linked",
          confirmedExternalPersonId: null,
          mobilizeObservationId: "obs1",
        },
      ],
    });
    const findings = evaluateStaffingFindings({
      context: context({
        linkedMobilizeCancellations: [
          {
            assignmentId: "a1",
            observationId: "obs1",
            statusCategory: "CANCELLED",
          },
        ],
      }),
      plan: p,
      nowIso: NOW,
    });
    expect(
      findings.some((f) => f.issueType === "MOBILIZE_CANCELLATION_LINKED"),
    ).toBe(true);
    expect(p.assignments[0].status).toBe("CONFIRMED");
  });

  it("detects overlapping peer assignments", () => {
    const p = plan({
      assignments: [
        {
          id: "a1",
          requirementId: "req1",
          status: "ASSIGNED",
          targetType: "CAMPAIGN_USER",
          campaignUserId: "u1",
          localPersonId: null,
          manualDisplayLabel: null,
          confirmedExternalPersonId: null,
          mobilizeObservationId: null,
        },
      ],
    });
    const findings = evaluateStaffingFindings({
      context: context({
        peerAssignments: [
          {
            missionId: "m2",
            startsAt: "2026-07-20T17:00:00.000Z",
            endsAt: "2026-07-20T19:00:00.000Z",
            identityKey: "user:u1",
            assignmentId: "peer1",
          },
        ],
      }),
      plan: p,
      nowIso: NOW,
    });
    expect(
      findings.some((f) => f.issueType === "OVERLAPPING_MISSION_ASSIGNMENT"),
    ).toBe(true);
  });

  it("marks plan stale when confirmation fingerprint drifts", () => {
    const fingerprint = planConfirmationFingerprint({
      scheduleFingerprint: scheduleFingerprint(
        "2026-07-20T16:00:00.000Z",
        "2026-07-20T18:00:00.000Z",
      ),
      requirements: [
        {
          roleKey: "GREETER",
          requiredCount: 2,
          minimumCount: 1,
          criticality: "CRITICAL",
        },
      ],
      assignments: [],
    });
    const findings = evaluateStaffingFindings({
      context: context({
        scheduleFingerprint: scheduleFingerprint(
          "2026-07-20T17:00:00.000Z",
          "2026-07-20T19:00:00.000Z",
        ),
      }),
      plan: plan({
        confirmationFingerprint: fingerprint,
        confirmedAt: NOW,
      }),
      nowIso: NOW,
    });
    expect(findings.some((f) => f.issueType === "STAFFING_PLAN_STALE")).toBe(
      true,
    );
  });

  it("allows explicit status transitions and rejects illegal ones", () => {
    expect(assertStatusTransition("PROPOSED", "ASSIGNED").ok).toBe(true);
    expect(assertStatusTransition("ASSIGNED", "CONFIRMED").ok).toBe(true);
    expect(assertStatusTransition("CONFIRMED", "CHECKED_IN").ok).toBe(true);
    expect(assertStatusTransition("PROPOSED", "CHECKED_IN").ok).toBe(false);
  });

  it("asserts lifecycle isolation invariants", () => {
    const iso = assertStaffingIsolation();
    expect(iso.mutatesExecute).toBe(false);
    expect(iso.mutatesFieldOps).toBe(false);
    expect(iso.autoAssignsFromRsvp).toBe(false);
    expect(iso.treatsAttendanceAsCheckIn).toBe(false);
    expect(iso.infersCommunicationConsent).toBe(false);
    expect(iso.writesMobilizePeople).toBe(false);
  });

  it("builds a day board view without creating plans", () => {
    const view = buildDayStaffingBoardView(
      {
        campaignDateKey: "2026-07-20",
        campaignTimezone: TZ,
        firstMissionId: "m1",
        primaryMissionId: "m1",
        createdPlans: 0,
        isolation: assertStaffingIsolation(),
        missions: [
          {
            missionId: "m1",
            title: "Town Hall",
            startsAt: "2026-07-20T16:00:00.000Z",
            endsAt: "2026-07-20T18:00:00.000Z",
            isCancelled: false,
            isFirst: true,
            isPrimary: true,
            planStatus: null,
            staffingRequired: false,
            isStale: false,
            coverage: [],
            findingCounts: { blockers: 0, warnings: 0 },
            readiness: "NOT_ASSESSED",
            href: "/system/missions/m1/staffing",
          },
        ],
      },
      new Date(NOW),
    );
    expect(view.createdPlans).toBe(0);
    expect(view.summary.withoutPlanCount).toBe(1);
    expect(view.missions[0].isFirst).toBe(true);
    expect(view.missions[0].isPrimary).toBe(true);
    expect(view.navigation.reportHref).toContain("/staffing/report");
  });
});
