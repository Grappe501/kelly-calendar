import "server-only";
import { prisma } from "@/server/db/prisma";

export async function findStaffingPlanByMissionId(missionId: string) {
  return prisma.missionStaffingPlan.findUnique({
    where: { missionId },
    include: {
      requirements: { orderBy: [{ sortOrder: "asc" }, { roleKey: "asc" }] },
      assignments: { orderBy: { createdAt: "asc" } },
      acknowledgements: true,
    },
  });
}

export async function findStaffingPlansByMissionIds(missionIds: string[]) {
  if (!missionIds.length) return [];
  return prisma.missionStaffingPlan.findMany({
    where: { missionId: { in: missionIds } },
    include: {
      requirements: { orderBy: [{ sortOrder: "asc" }, { roleKey: "asc" }] },
      assignments: true,
      acknowledgements: true,
    },
  });
}

export async function createStaffingPlan(input: {
  missionId: string;
  campaignDateKey: string;
  staffingRequired?: boolean;
  staffingLeadName?: string | null;
  staffingLeadUserId?: string | null;
  notes?: string | null;
  actorUserId: string;
}) {
  return prisma.missionStaffingPlan.create({
    data: {
      missionId: input.missionId,
      campaignDateKey: input.campaignDateKey,
      staffingRequired: input.staffingRequired ?? false,
      staffingLeadName: input.staffingLeadName ?? null,
      staffingLeadUserId: input.staffingLeadUserId ?? null,
      notes: input.notes ?? null,
      status: "DRAFT",
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    include: {
      requirements: true,
      assignments: true,
      acknowledgements: true,
    },
  });
}

export async function updateStaffingPlan(
  planId: string,
  data: Record<string, unknown>,
) {
  return prisma.missionStaffingPlan.update({
    where: { id: planId },
    data: data as never,
    include: {
      requirements: { orderBy: [{ sortOrder: "asc" }, { roleKey: "asc" }] },
      assignments: true,
      acknowledgements: true,
    },
  });
}

export async function upsertStaffingRequirement(input: {
  staffingPlanId: string;
  roleKey: string;
  roleLabel: string;
  description?: string | null;
  requiredCount: number;
  minimumCount: number;
  criticality: "CRITICAL" | "STANDARD" | "OPTIONAL";
  requiredByAt?: Date | null;
  skillsNote?: string | null;
  sortOrder?: number;
  actorUserId: string;
}) {
  return prisma.missionStaffingRequirement.upsert({
    where: {
      staffingPlanId_roleKey: {
        staffingPlanId: input.staffingPlanId,
        roleKey: input.roleKey,
      },
    },
    create: {
      staffingPlanId: input.staffingPlanId,
      roleKey: input.roleKey,
      roleLabel: input.roleLabel,
      description: input.description ?? null,
      requiredCount: input.requiredCount,
      minimumCount: input.minimumCount,
      criticality: input.criticality,
      requiredByAt: input.requiredByAt ?? null,
      skillsNote: input.skillsNote ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    update: {
      roleLabel: input.roleLabel,
      description: input.description ?? null,
      requiredCount: input.requiredCount,
      minimumCount: input.minimumCount,
      criticality: input.criticality,
      requiredByAt: input.requiredByAt ?? null,
      skillsNote: input.skillsNote ?? null,
      sortOrder: input.sortOrder ?? 0,
      updatedByUserId: input.actorUserId,
      isActive: true,
    },
  });
}

export async function createStaffingAssignment(input: {
  staffingPlanId: string;
  requirementId: string;
  targetType: string;
  campaignUserId?: string | null;
  localPersonId?: string | null;
  manualDisplayLabel?: string | null;
  manualContactHint?: string | null;
  confirmedExternalPersonId?: string | null;
  mobilizeObservationId?: string | null;
  notes?: string | null;
  provenance?: string | null;
  actorUserId: string;
}) {
  return prisma.missionStaffingAssignment.create({
    data: {
      staffingPlanId: input.staffingPlanId,
      requirementId: input.requirementId,
      targetType: input.targetType as never,
      campaignUserId: input.campaignUserId ?? null,
      localPersonId: input.localPersonId ?? null,
      manualDisplayLabel: input.manualDisplayLabel ?? null,
      manualContactHint: input.manualContactHint ?? null,
      confirmedExternalPersonId: input.confirmedExternalPersonId ?? null,
      mobilizeObservationId: input.mobilizeObservationId ?? null,
      status: "ASSIGNED",
      assignedAt: new Date(),
      assignedByUserId: input.actorUserId,
      notes: input.notes ?? null,
      provenance: input.provenance ?? "OPERATOR_EXPLICIT",
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
  });
}

export async function updateStaffingAssignment(
  assignmentId: string,
  data: Record<string, unknown>,
) {
  return prisma.missionStaffingAssignment.update({
    where: { id: assignmentId },
    data: data as never,
  });
}

export async function upsertStaffingAcknowledgement(input: {
  staffingPlanId: string;
  issueKey: string;
  issueType: string;
  title: string;
  disposition: string;
  note?: string | null;
  acceptedRiskReason?: string | null;
  actorUserId: string;
}) {
  return prisma.missionStaffingAcknowledgement.upsert({
    where: {
      staffingPlanId_issueKey: {
        staffingPlanId: input.staffingPlanId,
        issueKey: input.issueKey,
      },
    },
    create: {
      staffingPlanId: input.staffingPlanId,
      issueKey: input.issueKey,
      issueType: input.issueType,
      title: input.title,
      disposition: input.disposition as never,
      note: input.note ?? null,
      acceptedRiskReason: input.acceptedRiskReason ?? null,
      acknowledgedByUserId: input.actorUserId,
    },
    update: {
      issueType: input.issueType,
      title: input.title,
      disposition: input.disposition as never,
      note: input.note ?? null,
      acceptedRiskReason: input.acceptedRiskReason ?? null,
      acknowledgedByUserId: input.actorUserId,
      acknowledgedAt: new Date(),
    },
  });
}

export async function countStaffingTables() {
  const [plans, requirements, assignments, acknowledgements] =
    await Promise.all([
      prisma.missionStaffingPlan.count(),
      prisma.missionStaffingRequirement.count(),
      prisma.missionStaffingAssignment.count(),
      prisma.missionStaffingAcknowledgement.count(),
    ]);
  return { plans, requirements, assignments, acknowledgements };
}
