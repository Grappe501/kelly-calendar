import "server-only";

import type {
  MissionTravelAcknowledgementDisposition,
  MissionTravelAcknowledgementPersisted,
  MissionTravelIssueType,
  MissionTravelLegPersisted,
  MissionTravelLegStatus,
  MissionTravelMode,
  MissionTravelPlanPersisted,
  MissionTravelPlanStatus,
  MissionTravelReadiness,
} from "@/lib/missions/v21/travel-movement/types";
import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/lib/security/safe-error";

function mapLeg(row: {
  id: string;
  sequence: number;
  originLabel: string | null;
  destinationLabel: string | null;
  plannedDepartureAt: Date | null;
  plannedArrivalAt: Date | null;
  mode: MissionTravelMode;
  driverName: string | null;
  vehicleDescription: string | null;
  bufferMinutes: number | null;
  instructions: string | null;
  status: MissionTravelLegStatus;
  createdAt: Date;
  updatedAt: Date;
}): MissionTravelLegPersisted {
  return {
    id: row.id,
    sequence: row.sequence,
    originLabel: row.originLabel,
    destinationLabel: row.destinationLabel,
    plannedDepartureAt: row.plannedDepartureAt?.toISOString() ?? null,
    plannedArrivalAt: row.plannedArrivalAt?.toISOString() ?? null,
    mode: row.mode,
    driverName: row.driverName,
    vehicleDescription: row.vehicleDescription,
    bufferMinutes: row.bufferMinutes,
    instructions: row.instructions,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAck(row: {
  id: string;
  issueKey: string;
  issueType: MissionTravelIssueType;
  title: string;
  disposition: MissionTravelAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: Date;
  acknowledgedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MissionTravelAcknowledgementPersisted {
  return {
    id: row.id,
    issueKey: row.issueKey,
    issueType: row.issueType,
    title: row.title,
    disposition: row.disposition,
    note: row.note,
    acceptedRiskReason: row.acceptedRiskReason,
    acknowledgedAt: row.acknowledgedAt.toISOString(),
    acknowledgedByUserId: row.acknowledgedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPlan(row: {
  id: string;
  missionId: string;
  campaignDateKey: string;
  status: MissionTravelPlanStatus;
  readinessState: MissionTravelReadiness;
  movementRequired: boolean | null;
  plannedReadyAt: Date | null;
  plannedDepartureAt: Date | null;
  requiredArrivalAt: Date | null;
  bufferMinutes: number | null;
  driverRequired: boolean;
  vehicleRequired: boolean;
  driverName: string | null;
  driverUserId: string | null;
  vehicleDescription: string | null;
  passengerNotes: string | null;
  accessibilityNotes: string | null;
  securityNotes: string | null;
  logisticsNotes: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  scheduleFingerprint: string | null;
  confirmedAt: Date | null;
  confirmedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  legs: Array<Parameters<typeof mapLeg>[0]>;
  acknowledgements: Array<Parameters<typeof mapAck>[0]>;
}): MissionTravelPlanPersisted {
  return {
    id: row.id,
    missionId: row.missionId,
    campaignDateKey: row.campaignDateKey,
    status: row.status,
    readinessState: row.readinessState,
    movementRequired: row.movementRequired,
    plannedReadyAt: row.plannedReadyAt?.toISOString() ?? null,
    plannedDepartureAt: row.plannedDepartureAt?.toISOString() ?? null,
    requiredArrivalAt: row.requiredArrivalAt?.toISOString() ?? null,
    bufferMinutes: row.bufferMinutes,
    driverRequired: row.driverRequired,
    vehicleRequired: row.vehicleRequired,
    driverName: row.driverName,
    driverUserId: row.driverUserId,
    vehicleDescription: row.vehicleDescription,
    passengerNotes: row.passengerNotes,
    accessibilityNotes: row.accessibilityNotes,
    securityNotes: row.securityNotes,
    logisticsNotes: row.logisticsNotes,
    acceptedRiskSummary: row.acceptedRiskSummary,
    internalNotes: row.internalNotes,
    scheduleFingerprint: row.scheduleFingerprint,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    confirmedByUserId: row.confirmedByUserId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    legs: row.legs
      .map(mapLeg)
      .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id)),
    acknowledgements: row.acknowledgements.map(mapAck),
  };
}

const planInclude = {
  legs: true,
  acknowledgements: true,
} as const;

export async function findTravelPlanByMissionId(
  missionId: string,
): Promise<MissionTravelPlanPersisted | null> {
  const row = await prisma.missionTravelPlan.findUnique({
    where: { missionId },
    include: planInclude,
  });
  return row ? mapPlan(row) : null;
}

export async function findTravelPlansByMissionIds(
  missionIds: string[],
): Promise<Map<string, MissionTravelPlanPersisted>> {
  if (missionIds.length === 0) return new Map();
  const rows = await prisma.missionTravelPlan.findMany({
    where: { missionId: { in: missionIds } },
    include: planInclude,
  });
  const map = new Map<string, MissionTravelPlanPersisted>();
  for (const row of rows) {
    map.set(row.missionId, mapPlan(row));
  }
  return map;
}

export async function createTravelPlan(input: {
  missionId: string;
  campaignDateKey: string;
  actorUserId: string;
  now: Date;
  scheduleFingerprint: string;
}): Promise<MissionTravelPlanPersisted> {
  const existing = await prisma.missionTravelPlan.findUnique({
    where: { missionId: input.missionId },
    include: planInclude,
  });
  if (existing) return mapPlan(existing);

  const row = await prisma.missionTravelPlan.create({
    data: {
      missionId: input.missionId,
      campaignDateKey: input.campaignDateKey,
      status: "DRAFT",
      readinessState: "NOT_ASSESSED",
      scheduleFingerprint: input.scheduleFingerprint,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      updatedAt: input.now,
    },
    include: planInclude,
  });
  return mapPlan(row);
}

export async function updateTravelPlanContent(input: {
  travelPlanId: string;
  expectedUpdatedAt?: string | null;
  data: Record<string, unknown>;
  actorUserId: string;
}): Promise<MissionTravelPlanPersisted> {
  const current = await prisma.missionTravelPlan.findUnique({
    where: { id: input.travelPlanId },
  });
  if (!current) throw new ConflictError("Travel plan not found.");
  if (
    input.expectedUpdatedAt &&
    current.updatedAt.toISOString() !== input.expectedUpdatedAt
  ) {
    throw new ConflictError(
      "Travel plan was updated elsewhere. Refresh and retry.",
    );
  }

  const data: Record<string, unknown> = {
    ...input.data,
    updatedByUserId: input.actorUserId,
  };
  for (const key of [
    "plannedReadyAt",
    "plannedDepartureAt",
    "requiredArrivalAt",
    "confirmedAt",
  ]) {
    if (key in data && typeof data[key] === "string") {
      data[key] = new Date(data[key] as string);
    }
  }

  const row = await prisma.missionTravelPlan.update({
    where: { id: input.travelPlanId },
    data,
    include: planInclude,
  });
  return mapPlan(row);
}

export async function upsertTravelLeg(input: {
  travelPlanId: string;
  legId?: string | null;
  data: {
    sequence?: number;
    originLabel?: string | null;
    destinationLabel?: string | null;
    plannedDepartureAt?: string | null;
    plannedArrivalAt?: string | null;
    mode?: MissionTravelMode;
    driverName?: string | null;
    vehicleDescription?: string | null;
    bufferMinutes?: number | null;
    instructions?: string | null;
    status?: MissionTravelLegStatus;
  };
  expectedUpdatedAt?: string | null;
  actorUserId: string;
}): Promise<MissionTravelPlanPersisted> {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.missionTravelPlan.findUnique({
      where: { id: input.travelPlanId },
    });
    if (!plan) throw new ConflictError("Travel plan not found.");
    if (
      input.expectedUpdatedAt &&
      plan.updatedAt.toISOString() !== input.expectedUpdatedAt
    ) {
      throw new ConflictError(
        "Travel plan was updated elsewhere. Refresh and retry.",
      );
    }

    const legData = {
      ...input.data,
      plannedDepartureAt: input.data.plannedDepartureAt
        ? new Date(input.data.plannedDepartureAt)
        : input.data.plannedDepartureAt === null
          ? null
          : undefined,
      plannedArrivalAt: input.data.plannedArrivalAt
        ? new Date(input.data.plannedArrivalAt)
        : input.data.plannedArrivalAt === null
          ? null
          : undefined,
    };

    if (input.legId) {
      await tx.missionTravelLeg.update({
        where: { id: input.legId },
        data: legData,
      });
    } else {
      const maxSeq = await tx.missionTravelLeg.aggregate({
        where: { travelPlanId: input.travelPlanId },
        _max: { sequence: true },
      });
      const sequence = input.data.sequence ?? (maxSeq._max.sequence ?? 0) + 1;
      await tx.missionTravelLeg.create({
        data: {
          travelPlanId: input.travelPlanId,
          sequence,
          originLabel: input.data.originLabel ?? null,
          destinationLabel: input.data.destinationLabel ?? null,
          plannedDepartureAt: legData.plannedDepartureAt ?? null,
          plannedArrivalAt: legData.plannedArrivalAt ?? null,
          mode: input.data.mode ?? "UNSPECIFIED",
          driverName: input.data.driverName ?? null,
          vehicleDescription: input.data.vehicleDescription ?? null,
          bufferMinutes: input.data.bufferMinutes ?? null,
          instructions: input.data.instructions ?? null,
          status: input.data.status ?? "PLANNED",
        },
      });
    }

    await tx.missionTravelPlan.update({
      where: { id: input.travelPlanId },
      data: { updatedByUserId: input.actorUserId },
    });

    const row = await tx.missionTravelPlan.findUniqueOrThrow({
      where: { id: input.travelPlanId },
      include: planInclude,
    });
    return mapPlan(row);
  });
}

export async function reorderTravelLegs(input: {
  travelPlanId: string;
  orderedLegIds: string[];
  expectedUpdatedAt?: string | null;
  actorUserId: string;
}): Promise<MissionTravelPlanPersisted> {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.missionTravelPlan.findUnique({
      where: { id: input.travelPlanId },
      include: { legs: true },
    });
    if (!plan) throw new ConflictError("Travel plan not found.");
    if (
      input.expectedUpdatedAt &&
      plan.updatedAt.toISOString() !== input.expectedUpdatedAt
    ) {
      throw new ConflictError(
        "Travel plan was updated elsewhere. Refresh and retry.",
      );
    }

    const existingIds = new Set(plan.legs.map((l) => l.id));
    if (
      input.orderedLegIds.length !== existingIds.size ||
      !input.orderedLegIds.every((id) => existingIds.has(id))
    ) {
      throw new ConflictError(
        "orderedLegIds must include every current leg exactly once.",
      );
    }

    // Two-phase update to avoid unique (travelPlanId, sequence) collisions.
    for (let i = 0; i < input.orderedLegIds.length; i++) {
      await tx.missionTravelLeg.update({
        where: { id: input.orderedLegIds[i] },
        data: { sequence: -(i + 1) },
      });
    }
    for (let i = 0; i < input.orderedLegIds.length; i++) {
      await tx.missionTravelLeg.update({
        where: { id: input.orderedLegIds[i] },
        data: { sequence: i + 1 },
      });
    }

    await tx.missionTravelPlan.update({
      where: { id: input.travelPlanId },
      data: { updatedByUserId: input.actorUserId },
    });

    const row = await tx.missionTravelPlan.findUniqueOrThrow({
      where: { id: input.travelPlanId },
      include: planInclude,
    });
    return mapPlan(row);
  });
}

export async function deleteTravelLeg(input: {
  travelPlanId: string;
  legId: string;
  expectedUpdatedAt?: string | null;
  actorUserId: string;
}): Promise<MissionTravelPlanPersisted> {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.missionTravelPlan.findUnique({
      where: { id: input.travelPlanId },
    });
    if (!plan) throw new ConflictError("Travel plan not found.");
    if (
      input.expectedUpdatedAt &&
      plan.updatedAt.toISOString() !== input.expectedUpdatedAt
    ) {
      throw new ConflictError(
        "Travel plan was updated elsewhere. Refresh and retry.",
      );
    }

    const leg = await tx.missionTravelLeg.findFirst({
      where: { id: input.legId, travelPlanId: input.travelPlanId },
    });
    if (!leg) throw new ConflictError("Travel leg not found.");

    await tx.missionTravelLeg.delete({ where: { id: input.legId } });

    const remaining = await tx.missionTravelLeg.findMany({
      where: { travelPlanId: input.travelPlanId },
      orderBy: [{ sequence: "asc" }, { id: "asc" }],
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sequence !== i + 1) {
        await tx.missionTravelLeg.update({
          where: { id: remaining[i].id },
          data: { sequence: -(i + 1) },
        });
      }
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.missionTravelLeg.update({
        where: { id: remaining[i].id },
        data: { sequence: i + 1 },
      });
    }

    await tx.missionTravelPlan.update({
      where: { id: input.travelPlanId },
      data: { updatedByUserId: input.actorUserId },
    });

    const row = await tx.missionTravelPlan.findUniqueOrThrow({
      where: { id: input.travelPlanId },
      include: planInclude,
    });
    return mapPlan(row);
  });
}

export async function upsertTravelAcknowledgement(input: {
  travelPlanId: string;
  issueKey: string;
  issueType: MissionTravelIssueType;
  title: string;
  disposition: MissionTravelAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  actorUserId: string;
  now: Date;
}): Promise<{ plan: MissionTravelPlanPersisted; created: boolean }> {
  const existing = await prisma.missionTravelAcknowledgement.findUnique({
    where: {
      travelPlanId_issueKey: {
        travelPlanId: input.travelPlanId,
        issueKey: input.issueKey,
      },
    },
  });

  if (existing) {
    await prisma.missionTravelAcknowledgement.update({
      where: { id: existing.id },
      data: {
        disposition: input.disposition,
        note: input.note,
        acceptedRiskReason: input.acceptedRiskReason,
        title: input.title,
        issueType: input.issueType,
        acknowledgedAt: input.now,
        acknowledgedByUserId: input.actorUserId,
      },
    });
  } else {
    await prisma.missionTravelAcknowledgement.create({
      data: {
        travelPlanId: input.travelPlanId,
        issueKey: input.issueKey,
        issueType: input.issueType,
        title: input.title,
        disposition: input.disposition,
        note: input.note,
        acceptedRiskReason: input.acceptedRiskReason,
        acknowledgedAt: input.now,
        acknowledgedByUserId: input.actorUserId,
      },
    });
  }

  await prisma.missionTravelPlan.update({
    where: { id: input.travelPlanId },
    data: { updatedByUserId: input.actorUserId },
  });

  const row = await prisma.missionTravelPlan.findUniqueOrThrow({
    where: { id: input.travelPlanId },
    include: planInclude,
  });
  return { plan: mapPlan(row), created: !existing };
}
