import "server-only";
import type {
  CampaignDayIncidentDigestReviewPersisted,
  CampaignDayIncidentDigestReviewStatus,
} from "@/lib/missions/v21/exception-digest/types";
import { prisma } from "@/server/db/prisma";

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

function mapReview(row: {
  id: string;
  campaignDateKey: string;
  status: CampaignDayIncidentDigestReviewStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  note: string | null;
  sourceFingerprint: string;
  staleAt: Date | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CampaignDayIncidentDigestReviewPersisted {
  return {
    id: row.id,
    campaignDateKey: row.campaignDateKey,
    status: row.status,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: iso(row.reviewedAt),
    note: row.note,
    sourceFingerprint: row.sourceFingerprint,
    staleAt: iso(row.staleAt),
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findDigestReviewByDateKey(campaignDateKey: string) {
  const row = await prisma.campaignDayIncidentDigestReview.findUnique({
    where: { campaignDateKey },
  });
  return row ? mapReview(row) : null;
}

/**
 * Lazy-create or refresh review metadata on explicit Complete Exception Review.
 * Does not copy incident summaries. Does not mutate incidents.
 */
export async function completeDigestReview(input: {
  campaignDateKey: string;
  sourceFingerprint: string;
  note: string | null;
  actorUserId: string;
  now: Date;
}) {
  const existing = await prisma.campaignDayIncidentDigestReview.findUnique({
    where: { campaignDateKey: input.campaignDateKey },
  });
  if (existing) {
    return mapReview(
      await prisma.campaignDayIncidentDigestReview.update({
        where: { id: existing.id },
        data: {
          status: "REVIEWED",
          reviewedAt: input.now,
          reviewedByUserId: input.actorUserId,
          note: input.note,
          sourceFingerprint: input.sourceFingerprint,
          staleAt: null,
          updatedByUserId: input.actorUserId,
        },
      }),
    );
  }
  return mapReview(
    await prisma.campaignDayIncidentDigestReview.create({
      data: {
        campaignDateKey: input.campaignDateKey,
        status: "REVIEWED",
        reviewedAt: input.now,
        reviewedByUserId: input.actorUserId,
        note: input.note,
        sourceFingerprint: input.sourceFingerprint,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    }),
  );
}

/** Mark review STALE without rewriting reviewedAt. */
export async function markDigestReviewStale(input: {
  campaignDateKey: string;
  actorUserId?: string | null;
  now: Date;
}) {
  const existing = await prisma.campaignDayIncidentDigestReview.findUnique({
    where: { campaignDateKey: input.campaignDateKey },
  });
  if (!existing || existing.status !== "REVIEWED") {
    return existing ? mapReview(existing) : null;
  }
  return mapReview(
    await prisma.campaignDayIncidentDigestReview.update({
      where: { id: existing.id },
      data: {
        status: "STALE",
        staleAt: input.now,
        updatedByUserId: input.actorUserId ?? existing.updatedByUserId,
      },
    }),
  );
}
