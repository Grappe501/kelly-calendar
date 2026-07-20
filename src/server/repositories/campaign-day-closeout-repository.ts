import "server-only";

import type {
  CampaignDayAssessment,
  CampaignDayCarryForwardPersisted,
  CampaignDayCarryForwardSourceType,
  CampaignDayCarryForwardStatus,
  CampaignDayCloseoutPersisted,
  CampaignDayCloseoutStatus,
  TomorrowReadinessStatus,
} from "@/lib/missions/v21/day-closeout/types";
import { prisma } from "@/server/db/prisma";

function mapCarryForward(row: {
  id: string;
  sourceType: CampaignDayCarryForwardSourceType;
  sourceRecordId: string | null;
  importKey: string | null;
  missionId: string | null;
  title: string;
  reason: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  targetDateKey: string | null;
  destination: string | null;
  status: CampaignDayCarryForwardStatus;
  createdByUserId: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignDayCarryForwardPersisted {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    importKey: row.importKey,
    missionId: row.missionId,
    title: row.title,
    reason: row.reason,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    targetDateKey: row.targetDateKey,
    destination: row.destination,
    status: row.status,
    createdByUserId: row.createdByUserId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedByUserId: row.resolvedByUserId,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCloseout(row: {
  id: string;
  campaignDateKey: string;
  status: CampaignDayCloseoutStatus;
  todayAssessment: CampaignDayAssessment;
  tomorrowReadiness: TomorrowReadinessStatus;
  closeoutSummary: string | null;
  carryForwardSummary: string | null;
  tomorrowSummary: string | null;
  internalNotes: string | null;
  startedAt: Date | null;
  reviewedAt: Date | null;
  signedOffAt: Date | null;
  startedByUserId: string | null;
  reviewedByUserId: string | null;
  signedOffByUserId: string | null;
  updatedAt: Date;
  carryForwardItems: Array<Parameters<typeof mapCarryForward>[0]>;
}): CampaignDayCloseoutPersisted {
  return {
    id: row.id,
    campaignDateKey: row.campaignDateKey,
    status: row.status,
    todayAssessment: row.todayAssessment,
    tomorrowReadiness: row.tomorrowReadiness,
    closeoutSummary: row.closeoutSummary,
    carryForwardSummary: row.carryForwardSummary,
    tomorrowSummary: row.tomorrowSummary,
    internalNotes: row.internalNotes,
    startedAt: row.startedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    signedOffAt: row.signedOffAt?.toISOString() ?? null,
    startedByUserId: row.startedByUserId,
    reviewedByUserId: row.reviewedByUserId,
    signedOffByUserId: row.signedOffByUserId,
    updatedAt: row.updatedAt.toISOString(),
    carryForwardItems: row.carryForwardItems.map(mapCarryForward),
  };
}

const closeoutInclude = {
  carryForwardItems: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
};

export async function findCloseoutByDateKey(
  campaignDateKey: string,
): Promise<CampaignDayCloseoutPersisted | null> {
  const row = await prisma.campaignDayCloseout.findUnique({
    where: { campaignDateKey },
    include: closeoutInclude,
  });
  return row ? mapCloseout(row) : null;
}

/** Lazy create — only when operator begins review. Never fabricates reviewed/signed-off state. */
export async function ensureCloseoutStarted(input: {
  campaignDateKey: string;
  actorUserId: string | null;
  now?: Date;
}): Promise<CampaignDayCloseoutPersisted> {
  const now = input.now ?? new Date();
  const existing = await prisma.campaignDayCloseout.findUnique({
    where: { campaignDateKey: input.campaignDateKey },
    include: closeoutInclude,
  });
  if (existing) {
    if (existing.status === "NOT_STARTED") {
      const updated = await prisma.campaignDayCloseout.update({
        where: { id: existing.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: existing.startedAt ?? now,
          startedByUserId: existing.startedByUserId ?? input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
        include: closeoutInclude,
      });
      return mapCloseout(updated);
    }
    return mapCloseout(existing);
  }

  const created = await prisma.campaignDayCloseout.create({
    data: {
      campaignDateKey: input.campaignDateKey,
      status: "IN_PROGRESS",
      startedAt: now,
      startedByUserId: input.actorUserId,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    include: closeoutInclude,
  });
  return mapCloseout(created);
}

export async function updateCloseoutContent(input: {
  closeoutId: string;
  expectedUpdatedAt: string | null | undefined;
  data: {
    todayAssessment?: CampaignDayAssessment;
    tomorrowReadiness?: TomorrowReadinessStatus;
    closeoutSummary?: string | null;
    carryForwardSummary?: string | null;
    tomorrowSummary?: string | null;
    internalNotes?: string | null;
    status?: CampaignDayCloseoutStatus;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
    signedOffAt?: Date | null;
    signedOffByUserId?: string | null;
    startedAt?: Date | null;
    startedByUserId?: string | null;
  };
  actorUserId: string | null;
}): Promise<CampaignDayCloseoutPersisted> {
  const current = await prisma.campaignDayCloseout.findUniqueOrThrow({
    where: { id: input.closeoutId },
  });
  if (
    input.expectedUpdatedAt &&
    current.updatedAt.toISOString() !== input.expectedUpdatedAt
  ) {
    const { ConflictError } = await import("@/lib/security/safe-error");
    throw new ConflictError(
      "Another operator updated this closeout. Refresh and retry.",
    );
  }

  const updated = await prisma.campaignDayCloseout.update({
    where: { id: input.closeoutId },
    data: {
      ...input.data,
      updatedByUserId: input.actorUserId,
    },
    include: closeoutInclude,
  });
  return mapCloseout(updated);
}

export async function createCarryForwardItem(input: {
  closeoutId: string;
  sourceType: CampaignDayCarryForwardSourceType;
  sourceRecordId: string | null;
  importKey: string;
  missionId: string | null;
  title: string;
  reason: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  targetDateKey: string | null;
  destination: string | null;
  actorUserId: string | null;
}): Promise<{ item: CampaignDayCarryForwardPersisted; created: boolean }> {
  const existing = await prisma.campaignDayCarryForwardItem.findUnique({
    where: {
      closeoutId_importKey: {
        closeoutId: input.closeoutId,
        importKey: input.importKey,
      },
    },
  });
  if (existing) {
    return { item: mapCarryForward(existing), created: false };
  }

  try {
    const created = await prisma.campaignDayCarryForwardItem.create({
      data: {
        closeoutId: input.closeoutId,
        sourceType: input.sourceType,
        sourceRecordId: input.sourceRecordId,
        importKey: input.importKey,
        missionId: input.missionId,
        title: input.title,
        reason: input.reason,
        ownerName: input.ownerName,
        ownerUserId: input.ownerUserId,
        targetDateKey: input.targetDateKey,
        destination: input.destination,
        createdByUserId: input.actorUserId,
      },
    });
    return { item: mapCarryForward(created), created: true };
  } catch (error) {
    // Unique race — re-read
    const again = await prisma.campaignDayCarryForwardItem.findUnique({
      where: {
        closeoutId_importKey: {
          closeoutId: input.closeoutId,
          importKey: input.importKey,
        },
      },
    });
    if (again) return { item: mapCarryForward(again), created: false };
    throw error;
  }
}

export async function updateCarryForwardItem(input: {
  itemId: string;
  data: {
    status?: CampaignDayCarryForwardStatus;
    ownerName?: string | null;
    ownerUserId?: string | null;
    targetDateKey?: string | null;
    reason?: string | null;
    destination?: string | null;
    cancellationReason?: string | null;
    resolvedAt?: Date | null;
    resolvedByUserId?: string | null;
  };
}): Promise<CampaignDayCarryForwardPersisted> {
  const updated = await prisma.campaignDayCarryForwardItem.update({
    where: { id: input.itemId },
    data: input.data,
  });
  return mapCarryForward(updated);
}

export async function countCloseoutRows(): Promise<{
  closeouts: number;
  carryForwards: number;
}> {
  const [closeouts, carryForwards] = await Promise.all([
    prisma.campaignDayCloseout.count(),
    prisma.campaignDayCarryForwardItem.count(),
  ]);
  return { closeouts, carryForwards };
}
