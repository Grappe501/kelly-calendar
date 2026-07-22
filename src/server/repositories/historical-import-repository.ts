import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function getImportRun(importRunId: string) {
  return prisma.calendarImportRun.findUnique({ where: { id: importRunId } });
}

export async function listImportRecords(importRunId: string) {
  return prisma.calendarImportRecord.findMany({
    where: { importRunId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      importRunId: true,
      rawFingerprint: true,
      reviewStatus: true,
      duplicateStatus: true,
      googleReconcileStatus: true,
      canonicalEventId: true,
      reviewedByUserId: true,
      reviewedAt: true,
      reviewNotes: true,
      createdAt: true,
      updatedAt: true,
      normalizedPayload: true,
    },
  });
}

export async function listRecentImportRuns(limit = 40) {
  return prisma.calendarImportRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      externalSourceId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      fetchedCount: true,
      stagedCount: true,
      approvedCount: true,
      rejectedCount: true,
      duplicateCount: true,
      errorCount: true,
      createdAt: true,
    },
  });
}

export async function listUnreviewedImportRecords(limit = 50) {
  return prisma.calendarImportRecord.findMany({
    where: { reviewStatus: "UNREVIEWED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      importRunId: true,
      rawFingerprint: true,
      reviewStatus: true,
      duplicateStatus: true,
      googleReconcileStatus: true,
      canonicalEventId: true,
      createdAt: true,
      normalizedPayload: true,
    },
  });
}

export async function stageImportMutation(action: string) {
  requireAuthorizedMutation(action);
}
