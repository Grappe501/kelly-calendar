import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  ACTIVATION_BUILD_ID,
  buildActivationPreview,
  buildScheduleFingerprint,
  getTemplateByLevel,
  type PlaybookLevel,
  type WorkstreamCode,
} from "@/lib/missions/activation";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  countPlans,
  countTasks,
  createPlanWithTasks,
  deactivatePlan,
  findActivePlanForMission,
  findPlanByFingerprint,
  getMissionWithEvent,
  listNotifications,
  listTasksForDepartment,
  listVolunteerNeedsOpen,
} from "@/server/repositories/mission-activation-repository";
import type { DepartmentCode } from "@/lib/missions/activation/types";

function requireAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Mission activation requires campaign calendar access.",
    );
  }
}

const LEVELS: PlaybookLevel[] = [
  "NONE",
  "MINIMAL",
  "STANDARD",
  "MAJOR",
  "CUSTOM",
];

function asLevel(value: unknown): PlaybookLevel {
  if (typeof value === "string" && (LEVELS as string[]).includes(value)) {
    return value as PlaybookLevel;
  }
  throw new ValidationError("Invalid playbookLevel.");
}

/**
 * Read workspace — creates ZERO plans/tasks.
 */
export async function getActivationWorkspace(
  actor: AuthenticatedActor,
  missionId: string,
  now: Date = new Date(),
) {
  requireAccess(actor);
  const mission = await getMissionWithEvent(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  const event = mission.sourceEvent;
  const fingerprint = buildScheduleFingerprint({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    isAllDay: event.isAllDay,
  });
  const plan = await findActivePlanForMission(missionId);
  const recommendPreview = buildActivationPreview({
    playbookLevel: "STANDARD",
    schedule: {
      eventCreatedAt: event.createdAt,
      missionCreatedAt: mission.createdAt,
      activationAppliedAt: now,
      eventStartsAt: event.startsAt,
      eventEndsAt: event.endsAt,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
    },
    now,
    recommendFrom: {
      expectedAttendance: event.expectedAttendance,
      isMultiDay: event.isMultiDay,
      hasMission: true,
    },
  });

  return {
    buildId: ACTIVATION_BUILD_ID,
    mission: {
      id: mission.id,
      title: mission.attendTitle,
      eventId: event.id,
      eventNumber: event.eventNumber,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      lifecyclePhase: mission.lifecyclePhase,
      missionStatus: mission.missionStatus,
    },
    scheduleFingerprint: fingerprint,
    recommendedPlaybook: recommendPreview.recommendedLevel,
    plan: plan
      ? {
          id: plan.id,
          playbookLevel: plan.playbookLevel,
          status: plan.status,
          templateCode: plan.templateCode,
          templateVersion: plan.templateVersion,
          appliedAt: plan.appliedAt.toISOString(),
          taskCount: plan.tasks.length,
          workstreams: plan.workstreams.map((w) => w.workstream),
          earliestDueAt:
            plan.tasks
              .map((t) => t.dueAt)
              .filter(Boolean)
              .sort(
                (a, b) => (a as Date).getTime() - (b as Date).getTime(),
              )[0]
              ?.toISOString() ?? null,
          tasks: plan.tasks.map((t) => ({
            id: t.id,
            stepKey: t.stepKey,
            title: t.title,
            department: t.department,
            workstream: t.workstream,
            dueAt: t.dueAt?.toISOString() ?? null,
            status: t.status,
            windowLabel: t.windowLabel,
            requiresExternalProvider: t.requiresExternalProvider,
            commCoordStatus: t.commCoordStatus,
          })),
          volunteerNeeds: plan.volunteerNeeds.map((v) => ({
            id: v.id,
            role: v.role,
            status: v.status,
            assignedPersonId: v.assignedPersonId,
          })),
        }
      : null,
    guarantees: {
      readsCreateZeroRecords: true,
      externalDispatchBlocked: true,
      autoVolunteerAssignBlocked: true,
      scheduleMutationBlocked: true,
    },
  };
}

export async function previewActivation(
  actor: AuthenticatedActor,
  missionId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireAccess(actor);
  const mission = await getMissionWithEvent(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  const level = asLevel(body.playbookLevel ?? "STANDARD");
  const event = mission.sourceEvent;
  const enabledWorkstreams = Array.isArray(body.enabledWorkstreams)
    ? (body.enabledWorkstreams as WorkstreamCode[])
    : null;

  const preview = buildActivationPreview({
    playbookLevel: level,
    enabledWorkstreams,
    schedule: {
      eventCreatedAt: event.createdAt,
      missionCreatedAt: mission.createdAt,
      activationAppliedAt: now,
      eventStartsAt: event.startsAt,
      eventEndsAt: event.endsAt,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
    },
    now,
    recommendFrom: {
      expectedAttendance: event.expectedAttendance,
      isMultiDay: event.isMultiDay,
      hasMission: true,
    },
  });

  return {
    buildId: ACTIVATION_BUILD_ID,
    preview: {
      ...preview,
      tasks: preview.tasks.map((t) => ({
        ...t,
        dueAt: t.dueAt?.toISOString() ?? null,
      })),
    },
    createdRecords: 0,
  };
}

/**
 * Intentional apply. Idempotent on mission+template+version+fingerprint.
 * NONE creates zero tasks. Never sends/publishes/purchases/assigns.
 */
export async function applyActivation(
  actor: AuthenticatedActor,
  missionId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
) {
  requireAccess(actor);
  if (body.confirmApply !== true) {
    throw new ValidationError("confirmApply: true is required.");
  }
  const level = asLevel(body.playbookLevel ?? "STANDARD");
  const mission = await getMissionWithEvent(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  const event = mission.sourceEvent;

  // Snapshot schedule before any work — must remain unchanged
  const scheduleBefore = {
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    lifecyclePhase: mission.lifecyclePhase,
    missionStatus: mission.missionStatus,
  };

  const fingerprint = buildScheduleFingerprint({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    isAllDay: event.isAllDay,
  });
  const template = getTemplateByLevel(level);

  if (level === "NONE") {
    return {
      buildId: ACTIVATION_BUILD_ID,
      applied: false,
      reason: "No activation work — zero department tasks created.",
      plan: null,
      created: { plans: 0, tasks: 0, volunteerNeeds: 0 },
      duplicates: 0,
      scheduleUnchanged: true,
      scheduleBefore,
      zeros: {
        externalEmails: 0,
        externalTexts: 0,
        socialPosts: 0,
        adsPurchased: 0,
        autoVolunteerAssign: 0,
        eventMutations: 0,
        missionMutations: 0,
        openai: 0,
        reddirtWrites: 0,
      },
    };
  }

  const existing = await findPlanByFingerprint({
    missionId,
    templateCode: template.code,
    templateVersion: template.version,
    scheduleFingerprint: fingerprint,
  });
  if (existing) {
    return {
      buildId: ACTIVATION_BUILD_ID,
      applied: false,
      idempotentHit: true,
      plan: {
        id: existing.id,
        taskCount: existing.tasks.length,
        volunteerNeedCount: existing.volunteerNeeds.length,
      },
      created: { plans: 0, tasks: 0, volunteerNeeds: 0 },
      duplicates: 0,
      scheduleUnchanged: true,
      scheduleBefore,
      zeros: {
        externalEmails: 0,
        externalTexts: 0,
        socialPosts: 0,
        adsPurchased: 0,
        autoVolunteerAssign: 0,
        eventMutations: 0,
        missionMutations: 0,
        openai: 0,
        reddirtWrites: 0,
      },
    };
  }

  const enabledWorkstreams = Array.isArray(body.enabledWorkstreams)
    ? (body.enabledWorkstreams as WorkstreamCode[])
    : null;

  const preview = buildActivationPreview({
    playbookLevel: level,
    enabledWorkstreams,
    schedule: {
      eventCreatedAt: event.createdAt,
      missionCreatedAt: mission.createdAt,
      activationAppliedAt: now,
      eventStartsAt: event.startsAt,
      eventEndsAt: event.endsAt,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
    },
    now,
  });

  const plan = await createPlanWithTasks({
    missionId,
    eventId: event.id,
    templateCode: template.code,
    templateVersion: template.version,
    playbookLevel: level,
    scheduleFingerprint: fingerprint,
    appliedByUserId: actor.userId,
    workstreams: preview.workstreams,
    tasks: preview.tasks.map((t) => ({
      stepKey: t.stepKey,
      department: t.department,
      workstream: t.workstream,
      title: t.title,
      instructions: t.instructions,
      timingAnchor: t.timingAnchor,
      dueAt: t.dueAt,
      windowLabel: t.windowLabel,
      required: t.required,
      requiresConsent: t.requiresConsent,
      requiresContentApproval: t.requiresContentApproval,
      requiresAudienceApproval: t.requiresAudienceApproval,
      requiresExternalProvider: t.requiresExternalProvider,
      volunteerEligible: t.volunteerEligible,
      createVolunteerNeed: t.createVolunteerNeed,
    })),
  });

  // Prove schedule unchanged
  const after = await getMissionWithEvent(missionId);
  const scheduleUnchanged =
    after?.sourceEvent.startsAt.toISOString() === scheduleBefore.startsAt &&
    after?.sourceEvent.endsAt.toISOString() === scheduleBefore.endsAt &&
    after?.lifecyclePhase === scheduleBefore.lifecyclePhase &&
    after?.missionStatus === scheduleBefore.missionStatus;

  const autoAssigned = plan.volunteerNeeds.filter((v) => v.assignedPersonId).length;

  return {
    buildId: ACTIVATION_BUILD_ID,
    applied: true,
    idempotentHit: false,
    plan: {
      id: plan.id,
      taskCount: plan.tasks.length,
      volunteerNeedCount: plan.volunteerNeeds.length,
      workstreams: plan.workstreams.map((w) => w.workstream),
    },
    created: {
      plans: 1,
      tasks: plan.tasks.length,
      volunteerNeeds: plan.volunteerNeeds.length,
    },
    duplicates: 0,
    scheduleUnchanged,
    scheduleBefore,
    zeros: {
      externalEmails: 0,
      externalTexts: 0,
      socialPosts: 0,
      adsPurchased: 0,
      autoVolunteerAssign: autoAssigned,
      eventMutations: scheduleUnchanged ? 0 : 1,
      missionMutations: scheduleUnchanged ? 0 : 1,
      openai: 0,
      reddirtWrites: 0,
    },
  };
}

export async function deactivateActivation(
  actor: AuthenticatedActor,
  missionId: string,
) {
  requireAccess(actor);
  const plan = await findActivePlanForMission(missionId);
  if (!plan) throw new NotFoundError("No active activation plan.");
  await deactivatePlan(plan.id, actor.userId);
  return getActivationWorkspace(actor, missionId);
}

export async function getOperationsBoard(
  actor: AuthenticatedActor,
  board:
    | "events"
    | "communications"
    | "volunteers"
    | "logistics"
    | "field"
    | "tasks"
    | "notifications",
) {
  requireAccess(actor);
  if (board === "notifications") {
    const items = await listNotifications();
    return { board, items, pushDeliveryClaimed: false };
  }
  if (board === "volunteers") {
    const needs = await listVolunteerNeedsOpen();
    return {
      board,
      needs: needs.map((n) => ({
        id: n.id,
        role: n.role,
        status: n.status,
        missionId: n.plan.missionId,
        taskTitle: n.task?.title ?? null,
        dueAt: n.task?.dueAt?.toISOString() ?? null,
        assignedPersonId: n.assignedPersonId,
        autoAssigned: false,
      })),
      note: "RSVP is not assignment. Assignment is not consent.",
    };
  }

  const departmentMap: Record<string, DepartmentCode[]> = {
    events: ["EVENTS"],
    communications: ["COMMUNICATIONS", "GRAPHICS", "SOCIAL_MEDIA", "DIGITAL", "PRESS", "TEXTING", "PHONE_BANK"],
    logistics: ["LOGISTICS", "TRAVEL", "LODGING", "DINING", "MATERIALS"],
    field: ["FIELD_CANVASS", "PHONE_BANK", "VOLUNTEER_MANAGEMENT"],
    tasks: [
      "EVENTS",
      "COMMUNICATIONS",
      "GRAPHICS",
      "SOCIAL_MEDIA",
      "DIGITAL",
      "PRESS",
      "FIELD_CANVASS",
      "PHONE_BANK",
      "TEXTING",
      "VOLUNTEER_MANAGEMENT",
      "FUNDRAISING",
      "LOGISTICS",
      "TRAVEL",
      "LODGING",
      "DINING",
      "MATERIALS",
      "CANDIDATE",
      "LEADERSHIP",
    ],
  };

  const departments = departmentMap[board] ?? departmentMap.tasks!;
  const rows = [];
  for (const d of departments) {
    rows.push(...(await listTasksForDepartment(d)));
  }

  return {
    board,
    tasks: rows.map((t) => ({
      id: t.id,
      title: t.title,
      department: t.department,
      workstream: t.workstream,
      status: t.status,
      dueAt: t.dueAt?.toISOString() ?? null,
      windowLabel: t.windowLabel,
      missionId: t.plan.missionId,
      requiresExternalProvider: t.requiresExternalProvider,
      commCoordStatus: t.commCoordStatus,
      /** Never SENT without verified dispatch — we only store WORK_REQUESTED/DRAFT/etc. */
      labeledSentWithoutEvidence: false,
    })),
    d20Coordination:
      board === "communications"
        ? {
            note: "Coordinate with /system/communications — do not duplicate D20 queue.",
            href: "/system/communications",
          }
        : null,
    logisticsReuse:
      board === "logistics"
        ? {
            travelHref: "/system/briefing/movement",
            logisticsHref: "/system/briefing/logistics",
            fieldOpsHref: "/system/briefing/field-ops",
          }
        : null,
  };
}

export async function getActivationCounts() {
  return {
    plans: await countPlans(),
    tasks: await countTasks(),
  };
}
