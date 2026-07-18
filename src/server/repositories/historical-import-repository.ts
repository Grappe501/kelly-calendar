import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function getImportRun(importRunId: string) {
  return prisma.calendarImportRun.findUnique({ where: { id: importRunId } });
}

export async function listImportRecords(importRunId: string) {
  return prisma.calendarImportRecord.findMany({ where: { importRunId } });
}

export async function stageImportMutation(action: string) {
  requireAuthorizedMutation(action);
}
