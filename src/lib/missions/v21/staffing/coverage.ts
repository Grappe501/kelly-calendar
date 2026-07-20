import {
  ACTIVE_COVERAGE_STATUSES,
  CONFIRMED_LIKE,
  identityKeyForAssignment,
  staffingDispositionClearsForReadiness,
} from "@/lib/missions/v21/staffing/labels";
import type {
  MissionStaffingContext,
  RequirementCoverage,
  StaffingAssignmentInput,
  StaffingFinding,
  StaffingPlanInput,
} from "@/lib/missions/v21/staffing/types";

export const staffingIssueKey = (issueType: string, scopeId: string) =>
  `${issueType}:${scopeId}`;

export function scheduleFingerprint(startsAt: string, endsAt: string) {
  return `${startsAt}|${endsAt}`;
}

export function planConfirmationFingerprint(input: {
  scheduleFingerprint: string;
  requirements: Array<{
    roleKey: string;
    requiredCount: number;
    minimumCount: number;
    criticality: string;
  }>;
  assignments: Array<{ id: string; status: string; requirementId: string }>;
}): string {
  const req = input.requirements
    .map((r) => `${r.roleKey}:${r.requiredCount}:${r.minimumCount}:${r.criticality}`)
    .sort()
    .join("|");
  const asg = input.assignments
    .map((a) => `${a.id}:${a.requirementId}:${a.status}`)
    .sort()
    .join("|");
  return `${input.scheduleFingerprint}#${req}#${asg}`;
}

function countByStatus(
  assignments: StaffingAssignmentInput[],
  statuses: string[],
): number {
  return assignments.filter((a) => statuses.includes(a.status)).length;
}

export function computeRequirementCoverage(
  plan: StaffingPlanInput,
): RequirementCoverage[] {
  return plan.requirements
    .filter((r) => r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.roleKey.localeCompare(b.roleKey))
    .map((req) => {
      const rows = plan.assignments.filter((a) => a.requirementId === req.id);
      const confirmed = countByStatus(rows, CONFIRMED_LIKE);
      const checkedIn = countByStatus(rows, ["CHECKED_IN"]);
      const assigned = countByStatus(rows, ["ASSIGNED", ...CONFIRMED_LIKE]);
      const proposed = countByStatus(rows, ["PROPOSED"]);
      const cancelled = countByStatus(rows, ["CANCELLED"]);
      const declined = countByStatus(rows, ["DECLINED"]);
      const noShow = countByStatus(rows, ["NO_SHOW"]);
      const activeCoverage = countByStatus(rows, ACTIVE_COVERAGE_STATUSES.filter((s) => s !== "PROPOSED"));
      // Coverage uses assigned+confirmed+checked_in (not proposed-only).
      const covering = assigned;
      return {
        requirementId: req.id,
        roleKey: req.roleKey,
        roleLabel: req.roleLabel,
        criticality: req.criticality,
        requiredCount: req.requiredCount,
        minimumCount: req.minimumCount,
        proposed,
        assigned: covering,
        confirmed,
        checkedIn,
        cancelled,
        declined,
        noShow,
        remainingGap: Math.max(0, req.requiredCount - covering),
        remainingMinimumGap: Math.max(0, req.minimumCount - covering),
      };
    });
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = Date.parse(aStart);
  const ae = Date.parse(aEnd);
  const bs = Date.parse(bStart);
  const be = Date.parse(bEnd);
  if (![as, ae, bs, be].every(Number.isFinite)) return false;
  return as < be && bs < ae;
}

/**
 * Deterministic coverage findings from stored facts only.
 * Does not infer skills, RSVP confirmation, or check-in from Mobilize.
 */
export function evaluateStaffingFindings(input: {
  context: MissionStaffingContext;
  plan: StaffingPlanInput | null;
  nowIso?: string;
}): StaffingFinding[] {
  const { context: ctx, plan } = input;
  const now = input.nowIso ? Date.parse(input.nowIso) : Date.now();
  const findings: StaffingFinding[] = [];

  const push = (
    f: Omit<StaffingFinding, "disposition" | "clearsForReadiness">,
  ) => {
    const ack = plan?.acknowledgements.find((a) => a.issueKey === f.issueKey);
    findings.push({
      ...f,
      disposition: ack?.disposition ?? null,
      clearsForReadiness: staffingDispositionClearsForReadiness(ack?.disposition),
    });
  };

  if (!plan || !plan.isActive) {
    if (plan?.staffingRequired || (!plan && false)) {
      // Missing plan is only a blocker when staffingRequired was previously set —
      // without a plan we cannot know; Launch may pass staffingRequired via context later.
    }
    return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
  }

  if (ctx.isCancelled && plan.status !== "CLOSED") {
    push({
      issueKey: staffingIssueKey("CANCELLED_MISSION_ACTIVE_PLAN", ctx.missionId),
      issueType: "CANCELLED_MISSION_ACTIVE_PLAN",
      title: "Cancelled Mission retains active staffing plan",
      explanation:
        "Mission is cancelled but staffing plan is not closed. Active assignments remain operator-owned.",
      severity: "WARNING",
      missionId: ctx.missionId,
      requirementId: null,
    });
  }

  if (plan.isStale || (plan.confirmedAt && plan.confirmationFingerprint)) {
    const current = planConfirmationFingerprint({
      scheduleFingerprint: ctx.scheduleFingerprint,
      requirements: plan.requirements,
      assignments: plan.assignments,
    });
    if (
      plan.confirmationFingerprint &&
      plan.confirmationFingerprint !== current
    ) {
      push({
        issueKey: staffingIssueKey("STAFFING_PLAN_STALE", plan.id),
        issueType: "STAFFING_PLAN_STALE",
        title: "Staffing plan is stale",
        explanation:
          "Mission schedule or staffing facts changed after the last staffing confirmation.",
        severity: "WARNING",
        missionId: ctx.missionId,
        requirementId: null,
      });
    }
  }

  const coverage = computeRequirementCoverage(plan);
  for (const row of coverage) {
    if (row.criticality === "CRITICAL" && row.assigned === 0) {
      push({
        issueKey: staffingIssueKey("CRITICAL_ROLE_UNCOVERED", row.requirementId),
        issueType: "CRITICAL_ROLE_UNCOVERED",
        title: `Critical role uncovered: ${row.roleLabel}`,
        explanation: `Required ${row.requiredCount}; assigned/confirmed/checked-in covering count is 0.`,
        severity: "BLOCKER",
        missionId: ctx.missionId,
        requirementId: row.requirementId,
      });
    } else if (row.remainingGap > 0 && row.criticality === "CRITICAL") {
      push({
        issueKey: staffingIssueKey("CRITICAL_ROLE_SHORT", row.requirementId),
        issueType: "CRITICAL_ROLE_SHORT",
        title: `Critical role short: ${row.roleLabel}`,
        explanation: `Required ${row.requiredCount}; covering ${row.assigned}; gap ${row.remainingGap}.`,
        severity: "BLOCKER",
        missionId: ctx.missionId,
        requirementId: row.requirementId,
      });
    } else if (row.remainingGap > 0) {
      push({
        issueKey: staffingIssueKey("ROLE_COVERAGE_GAP", row.requirementId),
        issueType: "ROLE_COVERAGE_GAP",
        title: `Coverage gap: ${row.roleLabel}`,
        explanation: `Required ${row.requiredCount}; covering ${row.assigned}; gap ${row.remainingGap}.`,
        severity: "WARNING",
        missionId: ctx.missionId,
        requirementId: row.requirementId,
      });
    }

    const req = plan.requirements.find((r) => r.id === row.requirementId);
    if (
      req?.requiredByAt &&
      Date.parse(req.requiredByAt) <= now &&
      row.checkedIn < row.minimumCount
    ) {
      push({
        issueKey: staffingIssueKey("CHECKIN_BELOW_MINIMUM", row.requirementId),
        issueType: "CHECKIN_BELOW_MINIMUM",
        title: `Checked-in below minimum: ${row.roleLabel}`,
        explanation: `Minimum ${row.minimumCount}; checked in ${row.checkedIn} at/after required-by time.`,
        severity: row.criticality === "CRITICAL" ? "BLOCKER" : "WARNING",
        missionId: ctx.missionId,
        requirementId: row.requirementId,
      });
    }

    if (row.cancelled > 0 && plan.confirmedAt) {
      push({
        issueKey: staffingIssueKey(
          "ASSIGNMENT_CANCELLED_AFTER_CONFIRM",
          row.requirementId,
        ),
        issueType: "ASSIGNMENT_CANCELLED_AFTER_CONFIRM",
        title: `Cancellation after staffing confirmation: ${row.roleLabel}`,
        explanation: `${row.cancelled} assignment(s) cancelled after plan confirmation.`,
        severity: "WARNING",
        missionId: ctx.missionId,
        requirementId: row.requirementId,
      });
    }
  }

  // Duplicate active assignments same identity + requirement
  for (const req of plan.requirements.filter((r) => r.isActive)) {
    const rows = plan.assignments.filter(
      (a) =>
        a.requirementId === req.id &&
        ACTIVE_COVERAGE_STATUSES.includes(a.status),
    );
    const seen = new Map<string, string>();
    for (const a of rows) {
      const key = identityKeyForAssignment(a);
      if (!key) continue;
      if (seen.has(key)) {
        push({
          issueKey: staffingIssueKey("DUPLICATE_ASSIGNMENT", `${req.id}:${key}`),
          issueType: "DUPLICATE_ASSIGNMENT",
          title: `Duplicate assignment on ${req.roleLabel}`,
          explanation: "Same identity has multiple active assignments on one requirement.",
          severity: "WARNING",
          missionId: ctx.missionId,
          requirementId: req.id,
        });
      } else {
        seen.set(key, a.id);
      }
    }
  }

  // Multi-role on same Mission
  const byIdentity = new Map<string, string[]>();
  for (const a of plan.assignments.filter((x) =>
    ACTIVE_COVERAGE_STATUSES.includes(x.status),
  )) {
    const key = identityKeyForAssignment(a);
    if (!key) continue;
    const list = byIdentity.get(key) ?? [];
    list.push(a.requirementId);
    byIdentity.set(key, list);
  }
  for (const [key, reqIds] of byIdentity) {
    const unique = new Set(reqIds);
    if (unique.size > 1) {
      push({
        issueKey: staffingIssueKey("MULTI_ROLE_SAME_MISSION", key),
        issueType: "MULTI_ROLE_SAME_MISSION",
        title: "Identity assigned to multiple roles on one Mission",
        explanation:
          "Same identity has active assignments across multiple roles. Allow only with explicit operator awareness.",
        severity: "INFO",
        missionId: ctx.missionId,
        requirementId: null,
      });
    }
  }

  // Overlap across Missions
  for (const a of plan.assignments.filter((x) =>
    ACTIVE_COVERAGE_STATUSES.includes(x.status),
  )) {
    const key = identityKeyForAssignment(a);
    if (!key) continue;
    for (const peer of ctx.peerAssignments) {
      if (peer.identityKey !== key) continue;
      if (peer.missionId === ctx.missionId) continue;
      if (
        rangesOverlap(ctx.startsAt, ctx.endsAt, peer.startsAt, peer.endsAt)
      ) {
        push({
          issueKey: staffingIssueKey(
            "OVERLAPPING_MISSION_ASSIGNMENT",
            `${key}:${peer.missionId}`,
          ),
          issueType: "OVERLAPPING_MISSION_ASSIGNMENT",
          title: "Overlapping Mission assignment",
          explanation: `Identity also assigned on Mission ${peer.missionId} with overlapping times.`,
          severity: "WARNING",
          missionId: ctx.missionId,
          requirementId: a.requirementId,
        });
      }
    }
  }

  for (const link of ctx.linkedMobilizeCancellations) {
    push({
      issueKey: staffingIssueKey(
        "MOBILIZE_CANCELLATION_LINKED",
        link.assignmentId,
      ),
      issueType: "MOBILIZE_CANCELLATION_LINKED",
      title: "Linked Mobilize RSVP cancelled",
      explanation:
        "A Mobilize observation linked to an assignment shows cancellation. Assignment status was not auto-changed.",
      severity: "WARNING",
      missionId: ctx.missionId,
      requirementId: null,
    });
  }

  // Overnight unresolved release
  const startDay = ctx.startsAt.slice(0, 10);
  const endDay = ctx.endsAt.slice(0, 10);
  if (startDay !== endDay) {
    const stillActive = plan.assignments.some((a) =>
      ["ASSIGNED", "CONFIRMED", "CHECKED_IN"].includes(a.status),
    );
    if (stillActive && plan.status !== "CLOSED" && plan.status !== "WRAP_PENDING") {
      push({
        issueKey: staffingIssueKey("OVERNIGHT_WRAP_PENDING", plan.id),
        issueType: "OVERNIGHT_WRAP_PENDING",
        title: "Overnight Mission has unresolved staffing wrap",
        explanation:
          "Mission spans campaign dates with active assignments; release/wrap not completed.",
        severity: "INFO",
        missionId: ctx.missionId,
        requirementId: null,
      });
    }
  }

  if (plan.staffingRequired && coverage.every((c) => c.assigned === 0) && coverage.length === 0) {
    push({
      issueKey: staffingIssueKey("STAFFING_REQUIRED_NO_ROLES", plan.id),
      issueType: "STAFFING_REQUIRED_NO_ROLES",
      title: "Staffing required but no roles defined",
      explanation: "Plan is marked staffingRequired without active requirements.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
      requirementId: null,
    });
  }

  return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}

export function staffingReadinessFromFindings(
  findings: StaffingFinding[],
  plan: StaffingPlanInput | null,
): "NOT_ASSESSED" | "READY" | "READY_WITH_RISK" | "BLOCKED" {
  if (!plan) return "NOT_ASSESSED";
  const openBlockers = findings.filter(
    (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
  );
  if (openBlockers.length > 0) return "BLOCKED";
  const openWarnings = findings.filter(
    (f) => f.severity === "WARNING" && !f.clearsForReadiness,
  );
  if (openWarnings.length > 0 || plan.status === "READY_WITH_RISK") {
    return "READY_WITH_RISK";
  }
  return "READY";
}

/** Launch Review: critical staffing gaps may block when staffing is required. */
export function launchStaffingBlockers(findings: StaffingFinding[]): StaffingFinding[] {
  return findings.filter(
    (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
  );
}
