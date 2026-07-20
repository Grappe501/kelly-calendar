import "server-only";

import type { Prisma } from "@prisma/client";
import type {
  MissionFollowUpActionRecord,
  MissionFollowUpRecord,
} from "@/lib/missions/v21/follow-up/types";
import { prisma } from "@/server/db/prisma";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type ActionRow = {
  id: string;
  followUpId: string;
  sourceType: MissionFollowUpActionRecord["sourceType"];
  sourceRecordId: string | null;
  importKey: string | null;
  sourceSnapshot: unknown;
  title: string;
  description: string | null;
  status: MissionFollowUpActionRecord["status"];
  priority: MissionFollowUpActionRecord["priority"];
  ownerType: MissionFollowUpActionRecord["ownerType"];
  ownerUserId: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  relatedPersonName: string | null;
  relatedOrganizationName: string | null;
  dueAt: Date | null;
  nextCheckAt: Date | null;
  waitingReason: string | null;
  blockedReason: string | null;
  completionSummary: string | null;
  completionEvidence: unknown;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  completedByUserId: string | null;
  cancelledByUserId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type FollowUpRow = {
  id: string;
  missionId: string;
  followUpStatus: MissionFollowUpRecord["followUpStatus"];
  startedAt: Date | null;
  completedAt: Date | null;
  closedAt: Date | null;
  closeoutSummary: string | null;
  unresolvedSummary: string | null;
  internalNotes: string | null;
  startedByUserId: string | null;
  closedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  actions?: ActionRow[];
};

export function actionFromRow(row: ActionRow): MissionFollowUpActionRecord {
  return {
    id: row.id,
    followUpId: row.followUpId,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    importKey: row.importKey,
    sourceSnapshot: (row.sourceSnapshot ?? null) as Record<string, unknown> | null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ownerType: row.ownerType,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    ownerRole: row.ownerRole,
    relatedPersonName: row.relatedPersonName,
    relatedOrganizationName: row.relatedOrganizationName,
    dueAt: row.dueAt?.toISOString() ?? null,
    nextCheckAt: row.nextCheckAt?.toISOString() ?? null,
    waitingReason: row.waitingReason,
    blockedReason: row.blockedReason,
    completionSummary: row.completionSummary,
    completionEvidence:
      (row.completionEvidence ??
        []) as MissionFollowUpActionRecord["completionEvidence"],
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    completedByUserId: row.completedByUserId,
    cancelledByUserId: row.cancelledByUserId,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function followUpFromRow(row: FollowUpRow): MissionFollowUpRecord {
  return {
    id: row.id,
    missionId: row.missionId,
    followUpStatus: row.followUpStatus,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    closeoutSummary: row.closeoutSummary,
    unresolvedSummary: row.unresolvedSummary,
    internalNotes: row.internalNotes,
    startedByUserId: row.startedByUserId,
    closedByUserId: row.closedByUserId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    actions: (row.actions ?? []).map(actionFromRow),
  };
}

export async function getFollowUpByMissionId(missionId: string) {
  return prisma.missionFollowUp.findUnique({
    where: { missionId },
    include: { actions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
}

export async function getFollowUpStatusByMissionId(missionId: string) {
  const row = await prisma.missionFollowUp.findUnique({
    where: { missionId },
    select: { followUpStatus: true },
  });
  return row?.followUpStatus ?? null;
}

export async function countMissionFollowUps() {
  return prisma.missionFollowUp.count();
}

export async function countMissionFollowUpActions() {
  return prisma.missionFollowUpAction.count();
}

export async function createEmptyFollowUp(input: {
  missionId: string;
  createdByUserId: string | null;
}): Promise<MissionFollowUpRecord> {
  const row = await prisma.missionFollowUp.create({
    data: {
      missionId: input.missionId,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
    },
    include: { actions: true },
  });
  return followUpFromRow(row);
}

export async function saveFollowUpWorkspace(
  record: MissionFollowUpRecord,
): Promise<MissionFollowUpRecord> {
  const row = await prisma.missionFollowUp.update({
    where: { id: record.id },
    data: {
      followUpStatus: record.followUpStatus,
      startedAt: record.startedAt ? new Date(record.startedAt) : null,
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      closedAt: record.closedAt ? new Date(record.closedAt) : null,
      closeoutSummary: record.closeoutSummary,
      unresolvedSummary: record.unresolvedSummary,
      internalNotes: record.internalNotes,
      startedByUserId: record.startedByUserId,
      closedByUserId: record.closedByUserId,
      updatedByUserId: record.updatedByUserId,
    },
    include: { actions: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  return followUpFromRow(row);
}

export async function createFollowUpAction(
  action: Omit<MissionFollowUpActionRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): Promise<MissionFollowUpActionRecord> {
  const row = await prisma.missionFollowUpAction.create({
    data: {
      followUpId: action.followUpId,
      sourceType: action.sourceType,
      sourceRecordId: action.sourceRecordId,
      importKey: action.importKey,
      sourceSnapshot: action.sourceSnapshot
        ? toJson(action.sourceSnapshot)
        : undefined,
      title: action.title,
      description: action.description,
      status: action.status,
      priority: action.priority,
      ownerType: action.ownerType,
      ownerUserId: action.ownerUserId,
      ownerName: action.ownerName,
      ownerRole: action.ownerRole,
      relatedPersonName: action.relatedPersonName,
      relatedOrganizationName: action.relatedOrganizationName,
      dueAt: action.dueAt ? new Date(action.dueAt) : null,
      nextCheckAt: action.nextCheckAt ? new Date(action.nextCheckAt) : null,
      waitingReason: action.waitingReason,
      blockedReason: action.blockedReason,
      completionSummary: action.completionSummary,
      completionEvidence: toJson(action.completionEvidence),
      completedAt: action.completedAt ? new Date(action.completedAt) : null,
      cancelledAt: action.cancelledAt ? new Date(action.cancelledAt) : null,
      cancellationReason: action.cancellationReason,
      createdByUserId: action.createdByUserId,
      updatedByUserId: action.updatedByUserId,
      completedByUserId: action.completedByUserId,
      cancelledByUserId: action.cancelledByUserId,
      sortOrder: action.sortOrder,
    },
  });
  return actionFromRow(row);
}

export async function saveFollowUpAction(
  action: MissionFollowUpActionRecord,
  expectedUpdatedAt?: string | null,
): Promise<MissionFollowUpActionRecord> {
  if (expectedUpdatedAt) {
    const current = await prisma.missionFollowUpAction.findUnique({
      where: { id: action.id },
      select: { updatedAt: true },
    });
    if (
      current &&
      current.updatedAt.toISOString() !== expectedUpdatedAt
    ) {
      const err = new Error("CONFLICT");
      (err as Error & { code: string }).code = "CONFLICT";
      throw err;
    }
  }

  const row = await prisma.missionFollowUpAction.update({
    where: { id: action.id },
    data: {
      title: action.title,
      description: action.description,
      status: action.status,
      priority: action.priority,
      ownerType: action.ownerType,
      ownerUserId: action.ownerUserId,
      ownerName: action.ownerName,
      ownerRole: action.ownerRole,
      relatedPersonName: action.relatedPersonName,
      relatedOrganizationName: action.relatedOrganizationName,
      dueAt: action.dueAt ? new Date(action.dueAt) : null,
      nextCheckAt: action.nextCheckAt ? new Date(action.nextCheckAt) : null,
      waitingReason: action.waitingReason,
      blockedReason: action.blockedReason,
      completionSummary: action.completionSummary,
      completionEvidence: toJson(action.completionEvidence),
      completedAt: action.completedAt ? new Date(action.completedAt) : null,
      cancelledAt: action.cancelledAt ? new Date(action.cancelledAt) : null,
      cancellationReason: action.cancellationReason,
      updatedByUserId: action.updatedByUserId,
      completedByUserId: action.completedByUserId,
      cancelledByUserId: action.cancelledByUserId,
      sortOrder: action.sortOrder,
    },
  });
  return actionFromRow(row);
}

export async function findActionByImportKey(
  followUpId: string,
  importKey: string,
) {
  return prisma.missionFollowUpAction.findFirst({
    where: { followUpId, importKey },
  });
}
