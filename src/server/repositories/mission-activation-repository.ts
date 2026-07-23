import "server-only";

import { prisma } from "@/server/db/prisma";
import { ACTIVATION_CAMPAIGN_SCOPE } from "@/lib/missions/activation/types";
import type {
  DepartmentCode,
  PlaybookLevel,
  TimingAnchor,
  WindowLabel,
  WorkstreamCode,
} from "@/lib/missions/activation/types";

export async function findActivePlanForMission(missionId: string) {
  return prisma.missionActivationPlan.findFirst({
    where: { missionId, status: "ACTIVE", campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE },
    include: {
      workstreams: true,
      tasks: { orderBy: { dueAt: "asc" } },
      volunteerNeeds: true,
      notifications: { take: 20, orderBy: { createdAt: "desc" } },
    },
    orderBy: { appliedAt: "desc" },
  });
}

export async function findPlanByFingerprint(input: {
  missionId: string;
  templateCode: string;
  templateVersion: string;
  scheduleFingerprint: string;
}) {
  return prisma.missionActivationPlan.findUnique({
    where: {
      missionId_templateCode_templateVersion_scheduleFingerprint: {
        missionId: input.missionId,
        templateCode: input.templateCode,
        templateVersion: input.templateVersion,
        scheduleFingerprint: input.scheduleFingerprint,
      },
    },
    include: {
      workstreams: true,
      tasks: true,
      volunteerNeeds: true,
    },
  });
}

export async function countPlans(missionId?: string) {
  return prisma.missionActivationPlan.count({
    where: missionId
      ? { missionId, campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE }
      : { campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE },
  });
}

export async function countTasks(planId?: string) {
  return prisma.missionActivationTask.count({
    where: planId
      ? { planId }
      : { campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE },
  });
}

export async function createPlanWithTasks(input: {
  missionId: string;
  eventId: string;
  templateCode: string;
  templateVersion: string;
  playbookLevel: PlaybookLevel;
  scheduleFingerprint: string;
  appliedByUserId?: string | null;
  workstreams: WorkstreamCode[];
  tasks: Array<{
    stepKey: string;
    department: DepartmentCode;
    workstream: WorkstreamCode;
    title: string;
    instructions?: string | null;
    timingAnchor: TimingAnchor;
    dueAt: Date | null;
    windowLabel: WindowLabel;
    required: boolean;
    requiresConsent: boolean;
    requiresContentApproval: boolean;
    requiresAudienceApproval: boolean;
    requiresExternalProvider: boolean;
    volunteerEligible: boolean;
    createVolunteerNeed: boolean;
    commCoordStatus?: "WORK_REQUESTED" | null;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.missionActivationPlan.create({
      data: {
        campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE,
        missionId: input.missionId,
        eventId: input.eventId,
        templateCode: input.templateCode,
        templateVersion: input.templateVersion,
        playbookLevel: input.playbookLevel,
        scheduleFingerprint: input.scheduleFingerprint,
        appliedByUserId: input.appliedByUserId ?? null,
        status: "ACTIVE",
        workstreams: {
          create: input.workstreams.map((w) => ({
            workstream: w,
            enabled: true,
          })),
        },
      },
    });

    for (const t of input.tasks) {
      const task = await tx.missionActivationTask.create({
        data: {
          planId: plan.id,
          campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE,
          stepKey: t.stepKey,
          department: t.department,
          workstream: t.workstream,
          title: t.title,
          instructions: t.instructions ?? null,
          timingAnchor: t.timingAnchor,
          dueAt: t.dueAt,
          windowLabel: t.windowLabel,
          required: t.required,
          requiresConsent: t.requiresConsent,
          requiresContentApproval: t.requiresContentApproval,
          requiresAudienceApproval: t.requiresAudienceApproval,
          requiresExternalProvider: t.requiresExternalProvider,
          volunteerEligible: t.volunteerEligible,
          status: "NOT_STARTED",
          commCoordStatus: t.requiresExternalProvider
            ? "WORK_REQUESTED"
            : t.requiresContentApproval
              ? "DRAFT"
              : null,
        },
      });
      if (t.createVolunteerNeed) {
        await tx.missionActivationVolunteerNeed.create({
          data: {
            planId: plan.id,
            taskId: task.id,
            role: t.title,
            description: "Volunteer need from activation playbook — not auto-assigned.",
            numberNeeded: 1,
            status: "OPEN",
          },
        });
      }
    }

    await tx.missionActivationAuditEvent.create({
      data: {
        campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE,
        planId: plan.id,
        action: "APPLY_PLAYBOOK",
        actorUserId: input.appliedByUserId ?? null,
        detailJson: {
          templateCode: input.templateCode,
          templateVersion: input.templateVersion,
          taskCount: input.tasks.length,
          externalSends: 0,
          autoAssignments: 0,
        },
      },
    });

    await tx.missionActivationNotification.create({
      data: {
        campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE,
        planId: plan.id,
        kind: "PLAN_APPLIED",
        title: "Mission activation applied",
        body: `${input.tasks.length} department tasks created. No external dispatch.`,
        deepLink: `/system/missions/${input.missionId}/activation`,
      },
    });

    return tx.missionActivationPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: {
        workstreams: true,
        tasks: { orderBy: { dueAt: "asc" } },
        volunteerNeeds: true,
      },
    });
  });
}

export async function deactivatePlan(
  planId: string,
  actorUserId?: string | null,
) {
  return prisma.missionActivationPlan.update({
    where: { id: planId },
    data: {
      status: "DEACTIVATED",
      deactivatedAt: new Date(),
      deactivatedByUserId: actorUserId ?? null,
    },
  });
}

export async function listTasksForDepartment(department: DepartmentCode) {
  return prisma.missionActivationTask.findMany({
    where: {
      campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE,
      department,
      status: { notIn: ["CANCELLED", "NOT_APPLICABLE"] },
      plan: { status: "ACTIVE" },
    },
    include: {
      plan: {
        select: {
          id: true,
          missionId: true,
          eventId: true,
          playbookLevel: true,
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
}

export async function listVolunteerNeedsOpen() {
  return prisma.missionActivationVolunteerNeed.findMany({
    where: {
      status: { in: ["OPEN", "PROPOSED", "ASSIGNED", "CONFIRMED"] },
      plan: { status: "ACTIVE", campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE },
    },
    include: {
      plan: { select: { id: true, missionId: true, eventId: true } },
      task: { select: { id: true, title: true, dueAt: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listNotifications(limit = 50) {
  return prisma.missionActivationNotification.findMany({
    where: { campaignScopeKey: ACTIVATION_CAMPAIGN_SCOPE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getMissionWithEvent(missionId: string) {
  return prisma.campaignMission.findUnique({
    where: { id: missionId },
    include: {
      sourceEvent: {
        select: {
          id: true,
          eventNumber: true,
          startsAt: true,
          endsAt: true,
          timezone: true,
          isAllDay: true,
          isMultiDay: true,
          createdAt: true,
          expectedAttendance: true,
          campaignDisplayTitle: true,
          internalTitle: true,
          status: true,
        },
      },
    },
  });
}
