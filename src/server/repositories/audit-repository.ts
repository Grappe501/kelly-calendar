import "server-only";

import { prisma } from "@/server/db/prisma";
import { requireAuthorizedMutation } from "@/server/authorization/mutation-gate";

export async function writeAuditEntry(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  source?: string | null;
  reason?: string | null;
  previousStateRedacted?: unknown;
  newStateRedacted?: unknown;
  metadataRedacted?: unknown;
}) {
  // Audit writes for mutations stay behind the mutation gate until Step 4.
  // Schema + repository exist so Step 4 can wire without redesign.
  requireAuthorizedMutation(`audit:${input.action}`);
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorUserId ? "USER" : "SYSTEM",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      requestId: input.requestId ?? null,
      source: input.source ?? null,
      reason: input.reason ?? null,
      previousStateRedacted: input.previousStateRedacted ?? undefined,
      newStateRedacted: input.newStateRedacted ?? undefined,
      metadataRedacted: input.metadataRedacted ?? undefined,
    },
  });
}
