import "server-only";

import type { Prisma } from "@prisma/client";
import type { MissionExecutionRecord } from "@/lib/missions/v21/execution/types";
import { prisma } from "@/server/db/prisma";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type ExecRow = {
  id: string;
  missionId: string;
  executionStatus: MissionExecutionRecord["executionStatus"];
  arrivedAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  arrivalNote: string | null;
  liveObservations: unknown;
  peopleContacts: unknown;
  organizationContacts: unknown;
  commitments: unknown;
  immediateFollowUps: unknown;
  fieldNotes: string | null;
  arrivedByUserId: string | null;
  startedByUserId: string | null;
  completedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function executionFromRow(row: ExecRow): MissionExecutionRecord {
  return {
    id: row.id,
    missionId: row.missionId,
    executionStatus: row.executionStatus,
    arrivedAt: row.arrivedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    arrivalNote: row.arrivalNote,
    liveObservations:
      (row.liveObservations ?? []) as MissionExecutionRecord["liveObservations"],
    peopleContacts:
      (row.peopleContacts ?? []) as MissionExecutionRecord["peopleContacts"],
    organizationContacts:
      (row.organizationContacts ??
        []) as MissionExecutionRecord["organizationContacts"],
    commitments: (row.commitments ?? []) as MissionExecutionRecord["commitments"],
    immediateFollowUps:
      (row.immediateFollowUps ??
        []) as MissionExecutionRecord["immediateFollowUps"],
    fieldNotes: row.fieldNotes,
    arrivedByUserId: row.arrivedByUserId,
    startedByUserId: row.startedByUserId,
    completedByUserId: row.completedByUserId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getExecutionByMissionId(missionId: string) {
  return prisma.missionExecution.findUnique({ where: { missionId } });
}

export async function countMissionExecutions() {
  return prisma.missionExecution.count();
}

export async function createEmptyExecution(input: {
  missionId: string;
  createdByUserId: string | null;
}): Promise<MissionExecutionRecord> {
  const row = await prisma.missionExecution.create({
    data: {
      missionId: input.missionId,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
      liveObservations: [],
      peopleContacts: [],
      organizationContacts: [],
      commitments: [],
      immediateFollowUps: [],
    },
  });
  return executionFromRow(row);
}

export async function saveExecutionRecord(
  record: MissionExecutionRecord,
): Promise<MissionExecutionRecord> {
  const row = await prisma.missionExecution.update({
    where: { id: record.id },
    data: {
      executionStatus: record.executionStatus,
      arrivedAt: record.arrivedAt ? new Date(record.arrivedAt) : null,
      startedAt: record.startedAt ? new Date(record.startedAt) : null,
      endedAt: record.endedAt ? new Date(record.endedAt) : null,
      arrivalNote: record.arrivalNote,
      liveObservations: toJson(record.liveObservations),
      peopleContacts: toJson(record.peopleContacts),
      organizationContacts: toJson(record.organizationContacts),
      commitments: toJson(record.commitments),
      immediateFollowUps: toJson(record.immediateFollowUps),
      fieldNotes: record.fieldNotes,
      arrivedByUserId: record.arrivedByUserId,
      startedByUserId: record.startedByUserId,
      completedByUserId: record.completedByUserId,
      updatedByUserId: record.updatedByUserId,
    },
  });
  return executionFromRow(row);
}
