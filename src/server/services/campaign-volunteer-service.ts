import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { maturityFromEventAttendanceAlone } from "@/lib/organization/access";
import { prioritizeTop, type PriorityInput } from "@/lib/volunteers/priority";
import { DRILL_DOWN_LINKS } from "@/lib/volunteers/taxonomy";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { prisma } from "@/server/db/prisma";
import {
  addVolunteerAvailability,
  addVolunteerInterest,
  confirmVolunteerAssignment,
  countVolunteerOps,
  createVolunteerProfile,
  ensureTrainingCatalog,
  findAcmPosition,
  findLogisticsLeadPosition,
  listOpenVolunteerNeeds,
  listVolunteerAssignmentsForCalendar,
  listVolunteerProfiles,
  proposeVolunteerAssignment,
} from "@/server/repositories/campaign-volunteer-repository";
import { countOrgScaffold } from "@/server/repositories/campaign-organization-repository";

function requireVolunteerOpsAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError("Volunteer operations require campaign access.");
  }
}

/** Quiet Volunteer Manager home — reads create ZERO records. */
export async function getVolunteerManagerHome(actor: AuthenticatedActor) {
  requireVolunteerOpsAccess(actor);
  const [needs, profiles, assignments, vacantCaptains, orgCounts] =
    await Promise.all([
      listOpenVolunteerNeeds(),
      listVolunteerProfiles(),
      listVolunteerAssignmentsForCalendar(),
      prisma.campaignOrgPosition.count({
        where: {
          key: { startsWith: "COUNTY_CAPTAIN_" },
          status: "VACANT",
        },
      }),
      countOrgScaffold(),
    ]);

  const awaitingPlacement = profiles.filter((p) =>
    ["PROSPECT", "INTAKE_NEEDED", "ONBOARDING", "READY"].includes(p.lifecycleStatus),
  ).length;
  const awaitingConfirmation = assignments.filter((a) =>
    ["PROPOSED", "INVITED", "ASSIGNED"].includes(a.status),
  ).length;

  const priorityInputs: PriorityInput[] = [];
  for (const need of needs.slice(0, 20)) {
    priorityInputs.push({
      id: need.id,
      title: need.role,
      dueAt: need.shiftStartsAt ?? need.task?.dueAt ?? null,
      criticalRoleUnfilled: need.status === "OPEN",
      blocksMissionWithinHours: need.shiftStartsAt
        ? (need.shiftStartsAt.getTime() - Date.now()) / 36e5
        : null,
      noOwner: !need.assignedPersonId,
      sourceHref: need.plan?.missionId
        ? `/system/missions/${need.plan.missionId}/activation`
        : "/system/volunteers/opportunities",
    });
  }
  if (vacantCaptains > 0) {
    priorityInputs.push({
      id: "county-leadership-gaps",
      title: `${vacantCaptains} County Captain seats vacant`,
      countyLeadershipVacancy: true,
      sourceHref: "/system/volunteers/counties",
    });
  }
  if (awaitingPlacement > 0) {
    priorityInputs.push({
      id: "awaiting-placement",
      title: `${awaitingPlacement} volunteers awaiting placement`,
      noOwner: true,
      sourceHref: "/system/volunteers/placement",
    });
  }

  const priorities = prioritizeTop(priorityInputs, 5);
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });

  const calendarEntries = assignments
    .filter((a) => a.startsAt || a.status === "CONFIRMED")
    .slice(0, 12)
    .map((a) => ({
      id: a.id,
      title: a.opportunityTitle,
      startsAt: a.startsAt?.toISOString() ?? null,
      status: a.status,
      volunteer: a.profile.preferredDisplayName,
      sourceHref: "/system/volunteers/assignments",
      copiedEvent: false,
    }));

  return {
    buildId: "KCCC-IC-02D-VOLUNTEER-OPERATIONS-CAMPAIGN-WORK-1.0",
    header: {
      title: "Volunteer and Organizing",
      todayLabel,
      posture:
        awaitingPlacement > 0 || needs.length > 0
          ? "Needs attention — keep it calm and sequential"
          : "Steady — place people into meaningful next actions",
      primaryAction: {
        label: awaitingPlacement > 0 ? "Place a volunteer" : "Review priorities",
        href:
          awaitingPlacement > 0
            ? "/system/volunteers/placement"
            : "/system/volunteers/opportunities",
      },
    },
    priorities,
    maxPrioritiesShown: 5,
    needsAttention: {
      awaitingPlacement,
      awaitingConfirmation,
      unfilledShifts: needs.filter((n) => n.status === "OPEN").length,
      cancellationsNoShows: assignments.filter((a) =>
        ["CANCELLED", "NO_SHOW", "DECLINED"].includes(a.status),
      ).length,
      overdueTraining: 0,
      countyLeadershipGaps: vacantCaptains,
      coordinatorsNeedingSupport: 0,
    },
    coordinatorStatus: [
      { key: "intake", label: "Intake & Placement", href: "/system/volunteers/intake", vacant: orgCounts.assignments === 0 },
      { key: "training", label: "Training", href: "/system/volunteers/training", vacant: true },
      { key: "county", label: "County Organizing", href: "/system/volunteers/counties", vacant: vacantCaptains > 0 },
      { key: "voter", label: "Voter Engagement", href: "/system/volunteers/voter-engagement", vacant: true },
      { key: "youth", label: "College & Youth", href: "/system/volunteers/youth", vacant: true },
      { key: "events", label: "Events & Actions", href: "/system/volunteers/events", vacant: needs.length > 0 },
    ],
    todayCalendar: calendarEntries,
    drillDown: [...DRILL_DOWN_LINKS],
    guarantees: {
      readsCreateZeroRecords: true,
      noAiRanking: true,
      derivedCalendarCopiesEvents: false,
      countyMaturityFromEventAlone: maturityFromEventAttendanceAlone(),
    },
  };
}

export async function mutateVolunteerOps(
  actor: AuthenticatedActor,
  body: Record<string, unknown>,
) {
  requireVolunteerOpsAccess(actor);
  const action = String(body.action ?? "");

  if (action === "create_profile") {
    if (body.autoMatchByName === true) {
      throw new ValidationError("Name-only person linking is blocked.");
    }
    const localPersonId = String(body.localPersonId ?? "");
    const preferredDisplayName = String(body.preferredDisplayName ?? "").trim();
    if (!localPersonId || !preferredDisplayName) {
      throw new ValidationError("localPersonId and preferredDisplayName required.");
    }
    return createVolunteerProfile({
      localPersonId,
      preferredDisplayName,
      actorUserId: actor.userId,
      autoMatchByName: false,
    });
  }

  if (action === "add_interest") {
    return addVolunteerInterest({
      profileId: String(body.profileId ?? ""),
      interestKey: String(body.interestKey ?? ""),
    });
  }

  if (action === "add_availability") {
    return addVolunteerAvailability({
      profileId: String(body.profileId ?? ""),
      kind: body.kind ? String(body.kind) : undefined,
      weekday: typeof body.weekday === "number" ? body.weekday : null,
      startLocalTime: body.startLocalTime ? String(body.startLocalTime) : null,
      endLocalTime: body.endLocalTime ? String(body.endLocalTime) : null,
      remoteOk: body.remoteOk !== false,
      inPersonOk: body.inPersonOk !== false,
      idempotencyNote: body.idempotencyNote ? String(body.idempotencyNote) : undefined,
    });
  }

  if (action === "propose_assignment") {
    if (body.autoAssign === true) {
      throw new ValidationError("Automatic assignment is blocked.");
    }
    return proposeVolunteerAssignment({
      profileId: String(body.profileId ?? ""),
      opportunityTitle: String(body.opportunityTitle ?? "Volunteer opportunity"),
      whyItMatters: body.whyItMatters ? String(body.whyItMatters) : undefined,
      definitionOfDone: body.definitionOfDone
        ? String(body.definitionOfDone)
        : undefined,
      missionId: body.missionId ? String(body.missionId) : null,
      activationVolunteerNeedId: body.activationVolunteerNeedId
        ? String(body.activationVolunteerNeedId)
        : null,
      startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
      endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
      actorUserId: actor.userId,
      idempotencyKey: String(body.idempotencyKey ?? ""),
      autoAssign: false,
    });
  }

  if (action === "confirm_assignment") {
    return confirmVolunteerAssignment({
      assignmentId: String(body.assignmentId ?? ""),
      actorUserId: actor.userId,
    });
  }

  if (action === "ensure_training_catalog") {
    await ensureTrainingCatalog();
    return { ok: true, inferredConsent: false };
  }

  throw new ValidationError(`Unknown volunteer action: ${action}`);
}

export async function getAssistantCampaignManagerHome(actor: AuthenticatedActor) {
  requireVolunteerOpsAccess(actor);
  const acm = await findAcmPosition();
  const tasks = await prisma.missionActivationTask.findMany({
    where: {
      status: { in: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING"] },
    },
    orderBy: { dueAt: "asc" },
    take: 40,
    include: { plan: { select: { missionId: true } } },
  });

  const priorityInputs: PriorityInput[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueAt: t.dueAt,
    noOwner: !t.accountableOwnerUserId,
    blocksMissionWithinHours: t.dueAt
      ? (t.dueAt.getTime() - Date.now()) / 36e5
      : null,
    sourceHref: t.plan?.missionId
      ? `/system/missions/${t.plan.missionId}/activation`
      : "/system/work",
  }));

  return {
    buildId: "KCCC-IC-02D-VOLUNTEER-OPERATIONS-CAMPAIGN-WORK-1.0",
    position: acm
      ? { key: acm.key, title: acm.title, status: acm.status, reportsTo: acm.reportsToPositionKey }
      : null,
    assistantVacant: !acm || acm.status === "VACANT",
    campaignPriorities: prioritizeTop(priorityInputs, 5),
    workDueToday: tasks.filter((t) => {
      if (!t.dueAt) return false;
      const d = t.dueAt;
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length,
    overdue: tasks.filter((t) => t.dueAt && t.dueAt.getTime() < Date.now()).length,
    unowned: tasks.filter((t) => !t.accountableOwnerUserId).length,
    financeRestrictedDetailVisible: false,
    canImpersonateDepartmentApproval: false,
    derivedCalendarCopiesEvents: false,
    views: [
      { href: "/system/work", label: "Work list" },
      { href: "/system/work/portfolio", label: "Portfolio" },
      { href: "/system/work/timeline", label: "Timeline" },
      { href: "/system/work/workload", label: "Workload" },
    ],
  };
}

export async function getCampaignLogisticsBoard(actor: AuthenticatedActor) {
  requireVolunteerOpsAccess(actor);
  const lead = await findLogisticsLeadPosition();
  const [travel, logistics, field] = await Promise.all([
    prisma.missionTravelPlan.count(),
    prisma.missionLogisticsPack.count(),
    prisma.missionFieldOpsSession.count(),
  ]);

  return {
    buildId: "KCCC-IC-02D-VOLUNTEER-OPERATIONS-CAMPAIGN-WORK-1.0",
    reportsTo: "CAMPAIGN_MANAGER",
    ownedByVolunteerDepartment: false,
    ownedByOperationsData: false,
    leadPosition: lead
      ? { key: lead.key, title: lead.title, status: lead.status, reportsTo: lead.reportsToPositionKey }
      : null,
    reuse: {
      travelHref: "/system/briefing/movement",
      logisticsHref: "/system/briefing/logistics",
      fieldOpsHref: "/system/briefing/field-ops",
      doctrine: "Reuses D11–D13 facts — does not duplicate state machines.",
    },
    counts: { travelPlans: travel, logisticsPacks: logistics, fieldOpsSessions: field },
    sections: [
      { href: "/system/logistics/calendar", label: "Calendar" },
      { href: "/system/logistics/missions", label: "Missions" },
      { href: "/system/logistics/travel", label: "Travel" },
      { href: "/system/logistics/lodging", label: "Lodging" },
      { href: "/system/logistics/dining", label: "Dining" },
      { href: "/system/logistics/materials", label: "Materials" },
      { href: "/system/logistics/assignments", label: "Assignments" },
      { href: "/system/logistics/readiness", label: "Readiness" },
    ],
  };
}

export async function getWorkPortfolio(actor: AuthenticatedActor) {
  requireVolunteerOpsAccess(actor);
  const tasks = await prisma.missionActivationTask.findMany({
    where: { status: { notIn: ["CANCELLED", "NOT_APPLICABLE"] } },
    orderBy: { dueAt: "asc" },
    take: 80,
    include: { plan: { select: { missionId: true } } },
  });
  return {
    hierarchy: [
      "Campaign",
      "Department",
      "Program / Workstream",
      "Mission or Project",
      "Section",
      "Task",
      "Subtask / Checklist",
    ],
    items: tasks.map((t) => ({
      id: t.id,
      sourceType: "MISSION_ACTIVATION_TASK",
      sourceRecordId: t.id,
      title: t.title,
      department: t.department,
      status: t.status,
      dueAt: t.dueAt?.toISOString() ?? null,
      missionId: t.plan?.missionId ?? null,
      sourceHref: t.plan?.missionId
        ? `/system/missions/${t.plan.missionId}/activation`
        : "/system/work",
      copiedMutableTruth: false,
    })),
    indexRowsCreated: 0,
  };
}

export async function getVolunteerCounts(actor: AuthenticatedActor) {
  requireVolunteerOpsAccess(actor);
  return countVolunteerOps();
}

export async function getVolunteerProfileOrThrow(id: string) {
  const profile = await prisma.campaignVolunteerProfile.findUnique({
    where: { id },
    include: { interests: true, availability: true, assignments: true },
  });
  if (!profile) throw new NotFoundError("Volunteer profile not found.");
  return profile;
}
