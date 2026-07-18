import "server-only";

import { prisma } from "@/server/db/prisma";
import { redactAuditPayload } from "@/server/services/audit-service";
import type { AuthenticatedActor } from "@/server/auth/actor";

/** Internal audit write — caller must already be authorized. */
export async function writeAttributedAudit(input: {
  actor: AuthenticatedActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  requestId?: string | null;
  source?: string | null;
  reason?: string | null;
  previousState?: unknown;
  newState?: unknown;
  metadata?: unknown;
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
}) {
  const client = input.tx ?? prisma;
  return client.auditLog.create({
    data: {
      actorUserId: input.actor.userId,
      actorType: "USER",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      requestId: input.requestId ?? null,
      source: input.source ?? "api",
      reason: input.reason ?? null,
      previousStateRedacted: redactAuditPayload(input.previousState) as object | undefined,
      newStateRedacted: redactAuditPayload(input.newState) as object | undefined,
      metadataRedacted: redactAuditPayload({
        ...(typeof input.metadata === "object" && input.metadata
          ? (input.metadata as object)
          : {}),
        sessionId: input.actor.sessionId,
      }) as object | undefined,
    },
  });
}
