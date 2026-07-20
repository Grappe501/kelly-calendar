import "server-only";

import type {
  CampaignDayLaunchAcknowledgementPersisted,
  CampaignDayLaunchAcknowledgementStatus,
  CampaignDayLaunchAcknowledgementType,
  CampaignDayLaunchReadiness,
  CampaignDayLaunchReviewPersisted,
  CampaignDayLaunchSourceType,
  CampaignDayLaunchStatus,
} from "@/lib/missions/v21/day-launch/types";
import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/lib/security/safe-error";

function mapAck(row: {
  id: string;
  acknowledgementType: CampaignDayLaunchAcknowledgementType;
  sourceType: CampaignDayLaunchSourceType;
  sourceRecordId: string | null;
  importKey: string | null;
  missionId: string | null;
  title: string;
  status: CampaignDayLaunchAcknowledgementStatus;
  acknowledgementNote: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignDayLaunchAcknowledgementPersisted {
  return {
    id: row.id,
    acknowledgementType: row.acknowledgementType,
    sourceType: row.sourceType,
    sourceRecordId: row.sourceRecordId,
    importKey: row.importKey,
    missionId: row.missionId,
    title: row.title,
    status: row.status,
    acknowledgementNote: row.acknowledgementNote,
    acceptedRiskReason: row.acceptedRiskReason,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgedByUserId: row.acknowledgedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapLaunch(row: {
  id: string;
  campaignDateKey: string;
  status: CampaignDayLaunchStatus;
  readinessAssessment: CampaignDayLaunchReadiness;
  launchSummary: string | null;
  overnightChangeNotes: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  startedAt: Date | null;
  reviewedAt: Date | null;
  launchedAt: Date | null;
  startedByUserId: string | null;
  reviewedByUserId: string | null;
  launchedByUserId: string | null;
  updatedAt: Date;
  acknowledgements: Array<Parameters<typeof mapAck>[0]>;
}): CampaignDayLaunchReviewPersisted {
  return {
    id: row.id,
    campaignDateKey: row.campaignDateKey,
    status: row.status,
    readinessAssessment: row.readinessAssessment,
    launchSummary: row.launchSummary,
    overnightChangeNotes: row.overnightChangeNotes,
    acceptedRiskSummary: row.acceptedRiskSummary,
    internalNotes: row.internalNotes,
    startedAt: row.startedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    launchedAt: row.launchedAt?.toISOString() ?? null,
    startedByUserId: row.startedByUserId,
    reviewedByUserId: row.reviewedByUserId,
    launchedByUserId: row.launchedByUserId,
    updatedAt: row.updatedAt.toISOString(),
    acknowledgements: row.acknowledgements.map(mapAck),
  };
}

const include = {
  acknowledgements: {
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
};

export async function findLaunchReviewByDateKey(
  campaignDateKey: string,
): Promise<CampaignDayLaunchReviewPersisted | null> {
  const row = await prisma.campaignDayLaunchReview.findUnique({
    where: { campaignDateKey },
    include,
  });
  return row ? mapLaunch(row) : null;
}

export async function ensureLaunchReviewStarted(input: {
  campaignDateKey: string;
  actorUserId: string | null;
  now?: Date;
}): Promise<CampaignDayLaunchReviewPersisted> {
  const now = input.now ?? new Date();
  const existing = await prisma.campaignDayLaunchReview.findUnique({
    where: { campaignDateKey: input.campaignDateKey },
    include,
  });
  if (existing) {
    if (existing.status === "NOT_STARTED") {
      const updated = await prisma.campaignDayLaunchReview.update({
        where: { id: existing.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: existing.startedAt ?? now,
          startedByUserId: existing.startedByUserId ?? input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
        include,
      });
      return mapLaunch(updated);
    }
    return mapLaunch(existing);
  }
  const created = await prisma.campaignDayLaunchReview.create({
    data: {
      campaignDateKey: input.campaignDateKey,
      status: "IN_PROGRESS",
      startedAt: now,
      startedByUserId: input.actorUserId,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    include,
  });
  return mapLaunch(created);
}

export async function updateLaunchReviewContent(input: {
  launchReviewId: string;
  expectedUpdatedAt: string | null | undefined;
  data: {
    readinessAssessment?: CampaignDayLaunchReadiness;
    launchSummary?: string | null;
    overnightChangeNotes?: string | null;
    acceptedRiskSummary?: string | null;
    internalNotes?: string | null;
    status?: CampaignDayLaunchStatus;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
    launchedAt?: Date | null;
    launchedByUserId?: string | null;
  };
  actorUserId: string | null;
}): Promise<CampaignDayLaunchReviewPersisted> {
  const current = await prisma.campaignDayLaunchReview.findUniqueOrThrow({
    where: { id: input.launchReviewId },
  });
  if (
    input.expectedUpdatedAt &&
    current.updatedAt.toISOString() !== input.expectedUpdatedAt
  ) {
    throw new ConflictError(
      "Another operator updated this Launch Review. Refresh and retry.",
    );
  }
  const updated = await prisma.campaignDayLaunchReview.update({
    where: { id: input.launchReviewId },
    data: {
      ...input.data,
      updatedByUserId: input.actorUserId,
    },
    include,
  });
  return mapLaunch(updated);
}

export async function upsertLaunchAcknowledgement(input: {
  launchReviewId: string;
  acknowledgementType: CampaignDayLaunchAcknowledgementType;
  sourceType: CampaignDayLaunchSourceType;
  sourceRecordId: string | null;
  importKey: string;
  missionId: string | null;
  title: string;
  status: CampaignDayLaunchAcknowledgementStatus;
  acknowledgementNote: string | null;
  acceptedRiskReason: string | null;
  actorUserId: string | null;
  now?: Date;
}): Promise<{ item: CampaignDayLaunchAcknowledgementPersisted; created: boolean }> {
  const now = input.now ?? new Date();
  const existing = await prisma.campaignDayLaunchAcknowledgement.findUnique({
    where: {
      launchReviewId_importKey: {
        launchReviewId: input.launchReviewId,
        importKey: input.importKey,
      },
    },
  });
  if (existing) {
    return { item: mapAck(existing), created: false };
  }
  try {
    const created = await prisma.campaignDayLaunchAcknowledgement.create({
      data: {
        launchReviewId: input.launchReviewId,
        acknowledgementType: input.acknowledgementType,
        sourceType: input.sourceType,
        sourceRecordId: input.sourceRecordId,
        importKey: input.importKey,
        missionId: input.missionId,
        title: input.title,
        status: input.status,
        acknowledgementNote: input.acknowledgementNote,
        acceptedRiskReason: input.acceptedRiskReason,
        acknowledgedAt: now,
        acknowledgedByUserId: input.actorUserId,
      },
    });
    return { item: mapAck(created), created: true };
  } catch {
    const again = await prisma.campaignDayLaunchAcknowledgement.findUnique({
      where: {
        launchReviewId_importKey: {
          launchReviewId: input.launchReviewId,
          importKey: input.importKey,
        },
      },
    });
    if (again) return { item: mapAck(again), created: false };
    throw new Error("Failed to create acknowledgement.");
  }
}

export async function updateLaunchAcknowledgement(input: {
  acknowledgementId: string;
  data: {
    status?: CampaignDayLaunchAcknowledgementStatus;
    acknowledgementNote?: string | null;
    acceptedRiskReason?: string | null;
    acknowledgedAt?: Date | null;
    acknowledgedByUserId?: string | null;
  };
}): Promise<CampaignDayLaunchAcknowledgementPersisted> {
  const updated = await prisma.campaignDayLaunchAcknowledgement.update({
    where: { id: input.acknowledgementId },
    data: input.data,
  });
  return mapAck(updated);
}
