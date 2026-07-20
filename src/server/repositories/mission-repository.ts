import "server-only";

import type { Prisma } from "@prisma/client";
import type { CampaignMission } from "@/lib/missions/v21/types";
import { prisma } from "@/server/db/prisma";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type CampaignMissionRow = {
  id: string;
  sourceEventId: string;
  sourceEventNumber: string;
  sourceEventVersion: number;
  projectionVersion: string;
  attendTitle: string;
  objective: string | null;
  objectiveSource: string;
  successCriteria: unknown;
  missionStatus: CampaignMission["missionStatus"];
  lifecyclePhase: CampaignMission["lifecyclePhase"];
  intelligence: unknown;
  completeness: unknown;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  operatorOwnedFields: string[];
  projectedAt: Date;
};

export function campaignMissionFromRow(row: CampaignMissionRow): CampaignMission {
  return {
    id: row.id,
    sourceEventId: row.sourceEventId,
    sourceEventNumber: row.sourceEventNumber,
    sourceEventVersion: row.sourceEventVersion,
    projectionVersion:
      row.projectionVersion as CampaignMission["projectionVersion"],
    attendTitle: row.attendTitle,
    objective: row.objective,
    objectiveSource: row.objectiveSource as CampaignMission["objectiveSource"],
    successCriteria:
      (row.successCriteria ?? []) as CampaignMission["successCriteria"],
    missionStatus: row.missionStatus,
    lifecyclePhase: row.lifecyclePhase,
    intelligence: row.intelligence as CampaignMission["intelligence"],
    completeness: row.completeness as CampaignMission["completeness"],
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    timezone: row.timezone,
    operatorOwnedFields: row.operatorOwnedFields ?? [],
    projectedAt: row.projectedAt.toISOString(),
  };
}

export async function getCampaignMissionByEventId(eventId: string) {
  return prisma.campaignMission.findUnique({ where: { sourceEventId: eventId } });
}

export async function getCampaignMissionById(missionId: string) {
  return prisma.campaignMission.findUnique({ where: { id: missionId } });
}

export async function listCampaignMissions(limit = 50) {
  return prisma.campaignMission.findMany({
    orderBy: { startsAt: "asc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

/**
 * Load missions with Event signals needed to recompute lifecycle for Today’s Mission.
 * Does not mutate Event scheduling fields.
 */
export async function listCampaignMissionsForTodaySelection(limit = 200) {
  return prisma.campaignMission.findMany({
    orderBy: { startsAt: "asc" },
    take: Math.min(Math.max(limit, 1), 500),
    include: {
      sourceEvent: {
        select: {
          id: true,
          status: true,
          archivedAt: true,
          travelPlans: { select: { travelRequired: true } },
          outcomes: { select: { id: true }, take: 1 },
          followups: { select: { id: true } },
        },
      },
    },
  });
}

/**
 * Upsert projected mission. Operator-owned fields are preserved from existing row.
 */
export async function upsertCampaignMissionFromProjection(
  mission: CampaignMission,
): Promise<CampaignMission> {
  const existing = await prisma.campaignMission.findUnique({
    where: { sourceEventId: mission.sourceEventId },
  });

  const owned = new Set(
    existing?.operatorOwnedFields ?? mission.operatorOwnedFields,
  );
  const objective =
    owned.has("objective") && existing?.objective != null
      ? existing.objective
      : mission.objective;
  const objectiveSource =
    owned.has("objective") && existing
      ? existing.objectiveSource
      : mission.objectiveSource;
  const successCriteria =
    owned.has("successCriteria") && existing?.successCriteria != null
      ? existing.successCriteria
      : mission.successCriteria;
  const missionStatus =
    owned.has("missionStatus") && existing
      ? existing.missionStatus
      : mission.missionStatus;
  const lifecyclePhase =
    owned.has("lifecyclePhase") && existing
      ? existing.lifecyclePhase
      : mission.lifecyclePhase;

  const data = {
    sourceEventNumber: mission.sourceEventNumber,
    sourceEventVersion: mission.sourceEventVersion,
    projectionVersion: mission.projectionVersion,
    attendTitle:
      owned.has("attendTitle") && existing
        ? existing.attendTitle
        : mission.attendTitle,
    objective,
    objectiveSource,
    successCriteria: toJson(successCriteria),
    missionStatus,
    lifecyclePhase,
    intelligence: toJson(
      owned.has("intelligence") && existing?.intelligence != null
        ? existing.intelligence
        : mission.intelligence,
    ),
    completeness: toJson(mission.completeness),
    startsAt: new Date(mission.startsAt),
    endsAt: new Date(mission.endsAt),
    timezone: mission.timezone,
    operatorOwnedFields: [...owned],
    projectedAt: new Date(mission.projectedAt),
  };

  const row = existing
    ? await prisma.campaignMission.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.campaignMission.create({
        data: {
          sourceEventId: mission.sourceEventId,
          ...data,
        },
      });

  return campaignMissionFromRow(row);
}
