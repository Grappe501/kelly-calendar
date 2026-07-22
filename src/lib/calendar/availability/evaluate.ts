import {
  classifyFromIntervals,
  expandExceptionIntervals,
  expandRuleIntervals,
  overlapInterval,
} from "@/lib/calendar/availability/expand";
import {
  computeEvaluationFingerprint,
  computeRuleSetFingerprint,
} from "@/lib/calendar/availability/fingerprint";
import {
  classificationBlocksSave,
  classificationSeverity,
  type AvailabilityAssessment,
  type AvailabilityExceptionSnapshot,
  type AvailabilityFinding,
  type AvailabilityInterval,
  type AvailabilityRuleSnapshot,
} from "@/lib/calendar/availability/types";

export function evaluateAvailability(input: {
  rules: AvailabilityRuleSnapshot[];
  exceptions: AvailabilityExceptionSnapshot[];
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  eventStatus?: string | null;
  subjectType?: string;
  evaluatedAt?: Date;
}): AvailabilityAssessment {
  const subjectType = input.subjectType ?? "CANDIDATE";
  const evaluatedAt = input.evaluatedAt ?? new Date();

  if (input.endsAt <= input.startsAt) {
    const ruleSetFingerprint = computeRuleSetFingerprint(
      input.rules,
      input.exceptions,
    );
    return {
      classification: "REQUIRES_REVIEW",
      findings: [
        {
          key: "invalid-interval",
          severity: "blocking",
          classification: "REQUIRES_REVIEW",
          overlapStartsAt: input.startsAt,
          overlapEndsAt: input.endsAt,
          explanation: "Proposed interval end must be after start.",
          blocksSave: true,
          requiresAcknowledgement: true,
        },
      ],
      applicableIntervals: [],
      ruleSetFingerprint,
      evaluationFingerprint: computeEvaluationFingerprint({
        ruleSetFingerprint,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        isAllDay: input.isAllDay,
        eventStatus: input.eventStatus,
        subjectType,
      }),
      truncated: false,
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  // Cancelled / archived: informational only
  const status = (input.eventStatus ?? "").toUpperCase();
  if (status === "CANCELLED" || status === "ARCHIVED") {
    const ruleSetFingerprint = computeRuleSetFingerprint(
      input.rules,
      input.exceptions,
    );
    return {
      classification: "AVAILABLE",
      findings: [],
      applicableIntervals: [],
      ruleSetFingerprint,
      evaluationFingerprint: computeEvaluationFingerprint({
        ruleSetFingerprint,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone,
        isAllDay: input.isAllDay,
        eventStatus: input.eventStatus,
        subjectType,
      }),
      truncated: false,
      evaluatedAt: evaluatedAt.toISOString(),
    };
  }

  const activeRules = input.rules.filter(
    (r) => r.isActive && r.approvalState === "ACTIVE",
  );
  const activeExceptions = input.exceptions.filter(
    (e) => e.isActive && e.approvalState === "ACTIVE",
  );

  const applicableIntervals: AvailabilityInterval[] = [];
  let truncated = false;

  for (const ex of activeExceptions) {
    applicableIntervals.push(
      ...expandExceptionIntervals({
        exception: ex,
        rangeStartsAt: input.startsAt,
        rangeEndsAt: input.endsAt,
      }),
    );
  }

  for (const rule of activeRules) {
    const expanded = expandRuleIntervals({
      rule,
      rangeStartsAt: input.startsAt,
      rangeEndsAt: input.endsAt,
    });
    if (expanded.truncated) truncated = true;
    applicableIntervals.push(...expanded.intervals);
  }

  const overlapping = applicableIntervals.filter((iv) =>
    overlapInterval(
      input.startsAt,
      input.endsAt,
      iv.startsAt,
      iv.endsAt,
    ),
  );

  // Exceptions are deliberate, one-off human overrides of the standing rule
  // set. When an ACTIVE exception overlaps the proposed time, it takes
  // precedence over rule-sourced intervals for that same overlap — an
  // AVAILABLE exception can open an otherwise UNAVAILABLE office-hours
  // block. Hardest-wins semantics still apply among multiple overlapping
  // exceptions (or, absent any exception, among multiple overlapping
  // rules). Rule-sourced overlaps that are superseded by an exception are
  // dropped entirely so they cannot silently force an acknowledgement the
  // exception already resolved.
  const exceptionOverlaps = overlapping.filter((iv) => iv.exceptionId);
  const decisiveIntervals =
    exceptionOverlaps.length > 0 ? exceptionOverlaps : overlapping;

  const findings: AvailabilityFinding[] = [];
  for (const iv of decisiveIntervals) {
    const ov = overlapInterval(
      input.startsAt,
      input.endsAt,
      iv.startsAt,
      iv.endsAt,
    );
    if (!ov) continue;
    // Touching boundaries (zero-width) are not overlaps — already half-open
    if (ov.startsAt.getTime() === ov.endsAt.getTime()) continue;

    const key = [
      iv.exceptionId ? `ex:${iv.exceptionId}` : `rule:${iv.ruleId ?? "unknown"}`,
      iv.classification,
      ov.startsAt.toISOString(),
    ].join("|");

    findings.push({
      key,
      severity: classificationSeverity(iv.classification),
      classification: iv.classification,
      ruleId: iv.ruleId,
      exceptionId: iv.exceptionId,
      overlapStartsAt: ov.startsAt,
      overlapEndsAt: ov.endsAt,
      explanation: iv.explanation,
      blocksSave: classificationBlocksSave(iv.classification),
      requiresAcknowledgement: classificationBlocksSave(iv.classification),
    });
  }

  findings.sort((a, b) => a.key.localeCompare(b.key));

  const classification =
    activeRules.length === 0 && activeExceptions.length === 0
      ? "UNKNOWN"
      : decisiveIntervals.length === 0
        ? "AVAILABLE"
        : classifyFromIntervals(decisiveIntervals);

  // Missing rules → UNKNOWN (do not treat silence as available)
  const finalClassification =
    activeRules.length === 0 && activeExceptions.length === 0
      ? "UNKNOWN"
      : classification;

  if (
    finalClassification === "UNKNOWN" &&
    activeRules.length === 0 &&
    activeExceptions.length === 0
  ) {
    findings.push({
      key: "no-active-rules",
      severity: "warning",
      classification: "UNKNOWN",
      overlapStartsAt: input.startsAt,
      overlapEndsAt: input.endsAt,
      explanation:
        "No approved active availability rules apply. UNKNOWN is not the same as available.",
      blocksSave: false,
      requiresAcknowledgement: false,
    });
  }

  const ruleSetFingerprint = computeRuleSetFingerprint(
    input.rules,
    input.exceptions,
  );

  return {
    classification: finalClassification,
    findings,
    applicableIntervals: overlapping,
    ruleSetFingerprint,
    evaluationFingerprint: computeEvaluationFingerprint({
      ruleSetFingerprint,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      isAllDay: input.isAllDay,
      eventStatus: input.eventStatus,
      subjectType,
    }),
    truncated,
    evaluatedAt: evaluatedAt.toISOString(),
  };
}

export function assessmentRequiresAcknowledgement(
  assessment: AvailabilityAssessment,
): boolean {
  return assessment.findings.some((f) => f.requiresAcknowledgement);
}
