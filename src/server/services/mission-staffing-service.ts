import "server-only";
import {
  assertStaffingIsolation,
  assertStatusTransition,
  computeRequirementCoverage,
  evaluateStaffingFindings,
  identityKeyForAssignment,
  launchStaffingBlockers,
  normalizeRoleKey,
  planConfirmationFingerprint,
  scheduleFingerprint,
  staffingReadinessFromFindings,
  validateAssignmentTarget,
  validateRequirementCounts,
  type MissionStaffingContext,
  type StaffingPlanInput,
} from "@/lib/missions/v21/staffing";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  campaignDayBounds,
  missionIntersectsCampaignDay,
} from "@/lib/missions/v21/day-briefing/briefing-date";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";
import {
  createStaffingAssignment,
  createStaffingPlan,
  findStaffingPlanByMissionId,
  findStaffingPlansByMissionIds,
  updateStaffingAssignment,
  updateStaffingPlan,
  upsertStaffingAcknowledgement,
  upsertStaffingRequirement,
} from "@/server/repositories/mission-staffing-repository";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { prisma } from "@/server/db/prisma";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Staffing requires campaign leadership access.",
    );
  }
}

function toPlanInput(
  plan: NonNullable<Awaited<ReturnType<typeof findStaffingPlanByMissionId>>>,
): StaffingPlanInput {
  return {
    id: plan.id,
    missionId: plan.missionId,
    campaignDateKey: plan.campaignDateKey,
    status: plan.status,
    staffingRequired: plan.staffingRequired,
    confirmationFingerprint: plan.confirmationFingerprint,
    confirmedAt: plan.confirmedAt?.toISOString() ?? null,
    isStale: plan.isStale,
    isActive: plan.isActive,
    requirements: plan.requirements.map((r) => ({
      id: r.id,
      roleKey: r.roleKey,
      roleLabel: r.roleLabel,
      requiredCount: r.requiredCount,
      minimumCount: r.minimumCount,
      criticality: r.criticality,
      requiredByAt: r.requiredByAt?.toISOString() ?? null,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    })),
    assignments: plan.assignments.map((a) => ({
      id: a.id,
      requirementId: a.requirementId,
      status: a.status,
      targetType: a.targetType,
      campaignUserId: a.campaignUserId,
      localPersonId: a.localPersonId,
      manualDisplayLabel: a.manualDisplayLabel,
      confirmedExternalPersonId: a.confirmedExternalPersonId,
      mobilizeObservationId: a.mobilizeObservationId,
    })),
    acknowledgements: plan.acknowledgements.map((a) => ({
      issueKey: a.issueKey,
      disposition: a.disposition,
    })),
  };
}

async function loadMissionOrThrow(missionId: string) {
  const mission = await prisma.campaignMission.findFirst({
    where: { id: missionId },
  });
  if (!mission) throw new NotFoundError("Mission not found.");
  return mission;
}

async function buildContext(
  mission: Awaited<ReturnType<typeof loadMissionOrThrow>>,
  plan: Awaited<ReturnType<typeof findStaffingPlanByMissionId>>,
): Promise<MissionStaffingContext> {
  const linkedMobilizeCancellations: MissionStaffingContext["linkedMobilizeCancellations"] =
    [];
  if (plan) {
    for (const a of plan.assignments) {
      if (!a.mobilizeObservationId) continue;
      const obs = await prisma.mobilizeAttendanceObservation.findFirst({
        where: { id: a.mobilizeObservationId },
      });
      if (obs?.statusCategory === "CANCELLED") {
        linkedMobilizeCancellations.push({
          assignmentId: a.id,
          observationId: obs.id,
          statusCategory: obs.statusCategory,
        });
      }
    }
  }

  const peerAssignments: MissionStaffingContext["peerAssignments"] = [];
  const identityKeys = (plan?.assignments ?? [])
    .map((a) => identityKeyForAssignment(a))
    .filter(Boolean) as string[];
  if (identityKeys.length) {
    const others = await prisma.missionStaffingAssignment.findMany({
      where: {
        staffingPlanId: { not: plan?.id ?? "" },
        status: { in: ["PROPOSED", "ASSIGNED", "CONFIRMED", "CHECKED_IN"] },
      },
      include: { staffingPlan: { include: { mission: true } } },
      take: 200,
    });
    for (const row of others) {
      const key = identityKeyForAssignment(row);
      if (!key || !identityKeys.includes(key)) continue;
      peerAssignments.push({
        missionId: row.staffingPlan.missionId,
        startsAt: row.staffingPlan.mission.startsAt.toISOString(),
        endsAt: row.staffingPlan.mission.endsAt.toISOString(),
        identityKey: key,
        assignmentId: row.id,
      });
    }
  }

  return {
    missionId: mission.id,
    attendTitle: mission.attendTitle,
    startsAt: mission.startsAt.toISOString(),
    endsAt: mission.endsAt.toISOString(),
    timezone: mission.timezone,
    isCancelled: mission.missionStatus === "CANCELLED",
    scheduleFingerprint: scheduleFingerprint(
      mission.startsAt.toISOString(),
      mission.endsAt.toISOString(),
    ),
    linkedMobilizeCancellations,
    peerAssignments,
  };
}

function privacySafeAssignment(
  a: NonNullable<
    Awaited<ReturnType<typeof findStaffingPlanByMissionId>>
  >["assignments"][number],
) {
  return {
    id: a.id,
    requirementId: a.requirementId,
    status: a.status,
    targetType: a.targetType,
    displayLabel:
      a.manualDisplayLabel ??
      (a.campaignUserId ? `User ${a.campaignUserId.slice(0, 6)}…` : null) ??
      (a.localPersonId ? `Person ${a.localPersonId.slice(0, 6)}…` : null) ??
      (a.confirmedExternalPersonId
        ? `External ${a.confirmedExternalPersonId.slice(0, 6)}…`
        : "Unlabeled"),
    hasMobilizeLink: Boolean(a.mobilizeObservationId),
    checkedInAt: a.checkedInAt?.toISOString() ?? null,
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    // Never expose manualContactHint in broad views
  };
}

export async function getMissionStaffingWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const mission = await loadMissionOrThrow(missionId);
  // Read path: do NOT create a plan.
  const plan = await findStaffingPlanByMissionId(missionId);
  const context = await buildContext(mission, plan);
  const planInput = plan ? toPlanInput(plan) : null;
  const findings = evaluateStaffingFindings({ context, plan: planInput });
  const coverage = planInput ? computeRequirementCoverage(planInput) : [];
  const readiness = staffingReadinessFromFindings(findings, planInput);

  // Mobilize availability: aggregate-only signals for this mission's event.
  const mobilizeSignals = await loadMobilizeSignalsForMission(mission);

  return {
    mission: {
      id: mission.id,
      attendTitle: mission.attendTitle,
      startsAt: mission.startsAt.toISOString(),
      endsAt: mission.endsAt.toISOString(),
      timezone: mission.timezone,
      missionStatus: mission.missionStatus,
      sourceEventId: mission.sourceEventId,
    },
    plan: plan
      ? {
          id: plan.id,
          status: plan.status,
          staffingRequired: plan.staffingRequired,
          campaignDateKey: plan.campaignDateKey,
          confirmedAt: plan.confirmedAt?.toISOString() ?? null,
          isStale: plan.isStale,
          notes: plan.notes,
          requirements: plan.requirements.map((r) => ({
            id: r.id,
            roleKey: r.roleKey,
            roleLabel: r.roleLabel,
            requiredCount: r.requiredCount,
            minimumCount: r.minimumCount,
            criticality: r.criticality,
            requiredByAt: r.requiredByAt?.toISOString() ?? null,
            skillsNote: r.skillsNote,
            sortOrder: r.sortOrder,
            isActive: r.isActive,
          })),
          assignments: plan.assignments.map(privacySafeAssignment),
        }
      : null,
    coverage,
    findings,
    readiness,
    launchBlockers: launchStaffingBlockers(findings),
    mobilizeAvailability: mobilizeSignals,
    isolation: assertStaffingIsolation(),
    notice:
      "RSVP ≠ assignment ≠ check-in ≠ Execute. ACKNOWLEDGED does not clear blockers.",
  };
}

async function loadMobilizeSignalsForMission(
  mission: Awaited<ReturnType<typeof loadMissionOrThrow>>,
) {
  const observations = await prisma.mobilizeAttendanceObservation.findMany({
    where: { localMissionId: mission.id, isActive: true },
    take: 100,
  });
  const totals = {
    signupsRegistered: 0,
    signupsConfirmed: 0,
    cancellations: 0,
    attended: 0,
    unknown: 0,
  };
  for (const o of observations) {
    if (o.statusCategory === "SIGNUP_REGISTERED") totals.signupsRegistered += 1;
    else if (o.statusCategory === "SIGNUP_CONFIRMED") totals.signupsConfirmed += 1;
    else if (o.statusCategory === "CANCELLED") totals.cancellations += 1;
    else if (o.statusCategory === "ATTENDED") totals.attended += 1;
    else totals.unknown += 1;
  }
  return {
    observationCount: observations.length,
    totals,
    containsPii: false as const,
    note: "Aggregate Mobilize signals only — never a staffing roster.",
  };
}

export async function openMissionStaffingPlan(
  missionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const mission = await loadMissionOrThrow(missionId);
  const existing = await findStaffingPlanByMissionId(missionId);
  if (existing) {
    return getMissionStaffingWorkspace(missionId, actor);
  }
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const tz = getPublicAppConfig().campaignTimezone || mission.timezone;
  const plan = await createStaffingPlan({
    missionId,
    campaignDateKey: campaignDateKey(mission.startsAt, tz),
    staffingRequired: b.staffingRequired === true,
    staffingLeadName:
      typeof b.staffingLeadName === "string" ? b.staffingLeadName : null,
    staffingLeadUserId: actor.userId,
    notes: typeof b.notes === "string" ? b.notes : null,
    actorUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "staffing.plan.open",
    entityType: "MissionStaffingPlan",
    entityId: plan.id,
    metadata: { missionId },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function upsertMissionStaffingRequirement(
  missionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const plan = await findStaffingPlanByMissionId(missionId);
  if (!plan) throw new ValidationError("Open a staffing plan first.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const roleLabel = typeof b.roleLabel === "string" ? b.roleLabel.trim() : "";
  if (!roleLabel) throw new ValidationError("roleLabel required.");
  const roleKey =
    typeof b.roleKey === "string" && b.roleKey.trim()
      ? normalizeRoleKey(b.roleKey)
      : normalizeRoleKey(roleLabel);
  const requiredCount = Number(b.requiredCount ?? 1);
  const minimumCount = Number(b.minimumCount ?? requiredCount);
  const counts = validateRequirementCounts({ requiredCount, minimumCount });
  if (!counts.ok) throw new ValidationError(counts.message);
  const criticality =
    b.criticality === "CRITICAL" || b.criticality === "OPTIONAL"
      ? b.criticality
      : "STANDARD";
  await upsertStaffingRequirement({
    staffingPlanId: plan.id,
    roleKey,
    roleLabel,
    description: typeof b.description === "string" ? b.description : null,
    requiredCount,
    minimumCount,
    criticality,
    requiredByAt:
      typeof b.requiredByAt === "string" ? new Date(b.requiredByAt) : null,
    skillsNote: typeof b.skillsNote === "string" ? b.skillsNote : null,
    sortOrder: Number(b.sortOrder ?? 0),
    actorUserId: actor.userId,
  });
  await updateStaffingPlan(plan.id, {
    status: plan.status === "DRAFT" ? "IN_PROGRESS" : plan.status,
    isStale: Boolean(plan.confirmedAt),
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "staffing.requirement.upsert",
    entityType: "MissionStaffingRequirement",
    entityId: plan.id,
    metadata: { missionId, roleKey },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function assignMissionStaffing(
  missionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const plan = await findStaffingPlanByMissionId(missionId);
  if (!plan) throw new ValidationError("Open a staffing plan first.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const requirementId =
    typeof b.requirementId === "string" ? b.requirementId : "";
  const req = plan.requirements.find((r) => r.id === requirementId);
  if (!req) throw new ValidationError("Requirement not found.");

  const targetType = b.targetType as
    | "CAMPAIGN_USER"
    | "LOCAL_PERSON"
    | "MANUAL_SCOPED"
    | "CONFIRMED_EXTERNAL_REF";
  let externalMatchStatus: string | null = null;
  if (targetType === "CONFIRMED_EXTERNAL_REF") {
    const extId =
      typeof b.confirmedExternalPersonId === "string"
        ? b.confirmedExternalPersonId
        : "";
    const match = await prisma.externalPersonMatch.findFirst({
      where: { externalPersonId: extId, provider: "MOBILIZE" },
    });
    externalMatchStatus = match?.status ?? "UNMATCHED";
  }
  if (targetType === "LOCAL_PERSON") {
    const personId =
      typeof b.localPersonId === "string" ? b.localPersonId : "";
    const person = await prisma.person.findFirst({ where: { id: personId } });
    if (!person) throw new ValidationError("Local Person not found.");
  }
  if (targetType === "CAMPAIGN_USER") {
    const userId =
      typeof b.campaignUserId === "string" ? b.campaignUserId : "";
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new ValidationError("Campaign user not found.");
  }

  const targetCheck = validateAssignmentTarget({
    targetType,
    campaignUserId:
      typeof b.campaignUserId === "string" ? b.campaignUserId : null,
    localPersonId: typeof b.localPersonId === "string" ? b.localPersonId : null,
    manualDisplayLabel:
      typeof b.manualDisplayLabel === "string" ? b.manualDisplayLabel : null,
    manualContactHint:
      typeof b.manualContactHint === "string" ? b.manualContactHint : null,
    confirmedExternalPersonId:
      typeof b.confirmedExternalPersonId === "string"
        ? b.confirmedExternalPersonId
        : null,
    externalMatchStatus,
  });
  if (!targetCheck.ok) throw new ValidationError(targetCheck.message);

  // Never auto-assign from name/RSVP — only explicit operator payload.
  const assignment = await createStaffingAssignment({
    staffingPlanId: plan.id,
    requirementId,
    targetType,
    campaignUserId:
      typeof b.campaignUserId === "string" ? b.campaignUserId : null,
    localPersonId: typeof b.localPersonId === "string" ? b.localPersonId : null,
    manualDisplayLabel:
      typeof b.manualDisplayLabel === "string" ? b.manualDisplayLabel : null,
    manualContactHint:
      typeof b.manualContactHint === "string" ? b.manualContactHint : null,
    confirmedExternalPersonId:
      typeof b.confirmedExternalPersonId === "string"
        ? b.confirmedExternalPersonId
        : null,
    mobilizeObservationId:
      typeof b.mobilizeObservationId === "string"
        ? b.mobilizeObservationId
        : null,
    notes: typeof b.notes === "string" ? b.notes : null,
    provenance: "OPERATOR_EXPLICIT",
    actorUserId: actor.userId,
  });

  await updateStaffingPlan(plan.id, {
    isStale: Boolean(plan.confirmedAt),
    status: plan.status === "DRAFT" ? "IN_PROGRESS" : plan.status,
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "staffing.assignment.create",
    entityType: "MissionStaffingAssignment",
    entityId: assignment.id,
    metadata: { missionId, requirementId, targetType },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function transitionMissionStaffingAssignment(
  missionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const plan = await findStaffingPlanByMissionId(missionId);
  if (!plan) throw new ValidationError("Staffing plan not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const assignmentId =
    typeof b.assignmentId === "string" ? b.assignmentId : "";
  const toStatus = b.status as
    | "PROPOSED"
    | "ASSIGNED"
    | "CONFIRMED"
    | "DECLINED"
    | "CANCELLED"
    | "CHECKED_IN"
    | "RELEASED"
    | "NO_SHOW";
  const row = plan.assignments.find((a) => a.id === assignmentId);
  if (!row) throw new ValidationError("Assignment not found.");
  const transition = assertStatusTransition(row.status, toStatus);
  if (!transition.ok) throw new ValidationError(transition.message);

  const patch: Record<string, unknown> = {
    status: toStatus,
    updatedByUserId: actor.userId,
  };
  const now = new Date();
  if (toStatus === "CONFIRMED") {
    patch.confirmedAt = now;
    patch.confirmedByUserId = actor.userId;
  }
  if (toStatus === "CHECKED_IN") {
    patch.checkedInAt = now;
    patch.checkedInByUserId = actor.userId;
  }
  if (toStatus === "CANCELLED") patch.cancelledAt = now;
  if (toStatus === "RELEASED") patch.releasedAt = now;
  if (toStatus === "NO_SHOW") patch.noShowAt = now;

  await updateStaffingAssignment(assignmentId, patch);
  await updateStaffingPlan(plan.id, {
    isStale: Boolean(plan.confirmedAt),
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: `staffing.assignment.${toStatus.toLowerCase()}`,
    entityType: "MissionStaffingAssignment",
    entityId: assignmentId,
    metadata: { missionId, from: row.status, to: toStatus },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function confirmMissionStaffingPlan(
  missionId: string,
  actor: AuthenticatedActor,
) {
  assertLeadership(actor);
  const mission = await loadMissionOrThrow(missionId);
  const plan = await findStaffingPlanByMissionId(missionId);
  if (!plan) throw new ValidationError("Staffing plan not found.");
  const planInput = toPlanInput(plan);
  const context = await buildContext(mission, plan);
  const findings = evaluateStaffingFindings({ context, plan: planInput });
  const readiness = staffingReadinessFromFindings(findings, planInput);
  const fingerprint = planConfirmationFingerprint({
    scheduleFingerprint: context.scheduleFingerprint,
    requirements: planInput.requirements,
    assignments: planInput.assignments,
  });
  const status =
    readiness === "BLOCKED"
      ? "IN_PROGRESS"
      : readiness === "READY_WITH_RISK"
        ? "READY_WITH_RISK"
        : "READY";
  await updateStaffingPlan(plan.id, {
    confirmationFingerprint: fingerprint,
    confirmedAt: new Date(),
    confirmedByUserId: actor.userId,
    isStale: false,
    status,
    updatedByUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "staffing.plan.confirm",
    entityType: "MissionStaffingPlan",
    entityId: plan.id,
    metadata: { missionId, status, readiness },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function acknowledgeMissionStaffingFinding(
  missionId: string,
  actor: AuthenticatedActor,
  body: unknown,
) {
  assertLeadership(actor);
  const plan = await findStaffingPlanByMissionId(missionId);
  if (!plan) throw new ValidationError("Staffing plan not found.");
  const b = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;
  const issueKey = typeof b.issueKey === "string" ? b.issueKey : "";
  const disposition = b.disposition as
    | "ACKNOWLEDGED"
    | "ACCEPTED_RISK"
    | "RESOLVED"
    | "NOT_APPLICABLE";
  if (!issueKey || !disposition) {
    throw new ValidationError("issueKey and disposition required.");
  }
  if (
    disposition === "ACCEPTED_RISK" &&
    !(typeof b.acceptedRiskReason === "string" && b.acceptedRiskReason.trim())
  ) {
    throw new ValidationError("acceptedRiskReason required for ACCEPTED_RISK.");
  }
  await upsertStaffingAcknowledgement({
    staffingPlanId: plan.id,
    issueKey,
    issueType: typeof b.issueType === "string" ? b.issueType : "UNKNOWN",
    title: typeof b.title === "string" ? b.title : issueKey,
    disposition,
    note: typeof b.note === "string" ? b.note : null,
    acceptedRiskReason:
      typeof b.acceptedRiskReason === "string" ? b.acceptedRiskReason : null,
    actorUserId: actor.userId,
  });
  await writeAttributedAudit({
    actor,
    action: "staffing.acknowledgement",
    entityType: "MissionStaffingAcknowledgement",
    entityId: plan.id,
    metadata: { missionId, issueKey, disposition },
  });
  return getMissionStaffingWorkspace(missionId, actor);
}

export async function getDayStaffingBoard(
  dateKey: string,
  actor: AuthenticatedActor,
  now: Date = new Date(),
) {
  assertLeadership(actor);
  const tz = getPublicAppConfig().campaignTimezone;
  const { start, end } = campaignDayBounds(dateKey, tz);
  const missions = (
    await loadMissionsForDayBriefing({
      rangeStart: start,
      rangeEnd: end,
      operationalLookbackStart: start,
      now,
    })
  ).filter((m) =>
    missionIntersectsCampaignDay(m.startsAt, m.endsAt, dateKey, tz),
  );
  const plans = await findStaffingPlansByMissionIds(
    missions.map((m) => m.missionId),
  );
  const planByMission = new Map(plans.map((p) => [p.missionId, p]));

  const candidates = missions.map((m) => ({
    id: m.missionId,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    lifecyclePhase: m.lifecyclePhase,
  }));
  const first =
    [...candidates].sort(
      (a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
    )[0] ?? null;
  const primary = selectTodaysMission(candidates, { now, timezone: tz });

  const rows = [];
  for (const m of [...missions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )) {
    const plan = planByMission.get(m.missionId) ?? null;
    const planInput = plan ? toPlanInput(plan) : null;
    const missionRow = await loadMissionOrThrow(m.missionId);
    const context = await buildContext(missionRow, plan);
    const findings = evaluateStaffingFindings({ context, plan: planInput });
    const coverage = planInput ? computeRequirementCoverage(planInput) : [];
    rows.push({
      missionId: m.missionId,
      title: m.title,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      isCancelled: m.operationalStatus === "CANCELLED",
      isFirst: first?.id === m.missionId,
      isPrimary: primary.primaryId === m.missionId,
      planStatus: plan?.status ?? null,
      staffingRequired: plan?.staffingRequired ?? false,
      isStale: plan?.isStale ?? false,
      coverage,
      findingCounts: {
        blockers: findings.filter(
          (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
        ).length,
        warnings: findings.filter(
          (f) => f.severity === "WARNING" && !f.clearsForReadiness,
        ).length,
      },
      readiness: staffingReadinessFromFindings(findings, planInput),
      href: `/system/missions/${m.missionId}/staffing?date=${dateKey}`,
    });
  }

  return {
    campaignDateKey: dateKey,
    campaignTimezone: tz,
    firstMissionId: first?.id ?? null,
    primaryMissionId: primary.primaryId,
    missions: rows,
    isolation: assertStaffingIsolation(),
    createdPlans: 0,
  };
}

export async function getDayStaffingReport(
  dateKey: string,
  actor: AuthenticatedActor,
  now: Date = new Date(),
) {
  const board = await getDayStaffingBoard(dateKey, actor, now);
  return {
    ...board,
    report: true,
    privacy: "aggregate-only identity labels; no contact fields",
  };
}
