// @ts-nocheck -- generic date-normalization is constrained at the repository boundary.
import "server-only";
import type {
  FieldConfirmationHistoryEntry,
  MissionFieldConfirmationState,
  MissionFieldItemCondition,
  MissionFieldItemConfirmationPersisted,
  MissionFieldOpsAcknowledgementDisposition,
  MissionFieldOpsAcknowledgementPersisted,
  MissionFieldOpsIssueType,
  MissionFieldOpsReadiness,
  MissionFieldOpsSessionPersisted,
  MissionFieldOpsSessionStatus,
} from "@/lib/missions/v21/field-ops/types";
import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/lib/security/safe-error";

const iso = (value: Date | null) => value?.toISOString() ?? null;

function asHistory(value: unknown): FieldConfirmationHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry) => entry && typeof entry === "object" && typeof entry.state === "string",
  ) as FieldConfirmationHistoryEntry[];
}

function mapConfirmation(row: any): MissionFieldItemConfirmationPersisted {
  return {
    id: row.id,
    logisticsItemId: row.logisticsItemId,
    itemDescriptionSnapshot: row.itemDescriptionSnapshot,
    itemCriticalitySnapshot: row.itemCriticalitySnapshot,
    itemReturnRequiredSnapshot: row.itemReturnRequiredSnapshot,
    state: row.state,
    observedQuantityLabel: row.observedQuantityLabel,
    condition: row.condition,
    substituteDescription: row.substituteDescription,
    exceptionNote: row.exceptionNote,
    locationLabel: row.locationLabel,
    confirmedAt: row.confirmedAt.toISOString(),
    confirmedByUserId: row.confirmedByUserId,
    history: asHistory(row.historyJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAck(row: any): MissionFieldOpsAcknowledgementPersisted {
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

function mapSession(row: any): MissionFieldOpsSessionPersisted {
  return {
    id: row.id,
    missionId: row.missionId,
    campaignDateKey: row.campaignDateKey,
    status: row.status,
    readinessState: row.readinessState,
    fieldLeadName: row.fieldLeadName,
    fieldLeadUserId: row.fieldLeadUserId,
    locationLabel: row.locationLabel,
    contextNote: row.contextNote,
    checkInAt: iso(row.checkInAt),
    checkInByUserId: row.checkInByUserId,
    readinessConfirmedAt: iso(row.readinessConfirmedAt),
    readinessConfirmedByUserId: row.readinessConfirmedByUserId,
    wrapStartedAt: iso(row.wrapStartedAt),
    wrapStartedByUserId: row.wrapStartedByUserId,
    closedAt: iso(row.closedAt),
    closedByUserId: row.closedByUserId,
    acceptedRiskSummary: row.acceptedRiskSummary,
    internalNotes: row.internalNotes,
    fieldNotes: row.fieldNotes,
    logisticsFingerprint: row.logisticsFingerprint,
    scheduleFingerprint: row.scheduleFingerprint,
    travelFingerprint: row.travelFingerprint,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    confirmations: (row.confirmations ?? []).map(mapConfirmation),
    acknowledgements: (row.acknowledgements ?? []).map(mapAck),
  };
}

const include = { confirmations: true, acknowledgements: true } as const;

async function assertCurrent(tx: any, id: string, expected?: string | null) {
  const session = await tx.missionFieldOpsSession.findUnique({ where: { id } });
  if (!session) throw new ConflictError("Field Ops session not found.");
  if (expected && session.updatedAt.toISOString() !== expected) {
    throw new ConflictError(
      "Field Ops session was updated elsewhere. Refresh and retry.",
    );
  }
  return session;
}

export async function findFieldOpsSessionByMissionId(missionId: string) {
  const row = await prisma.missionFieldOpsSession.findUnique({
    where: { missionId },
    include,
  });
  return row ? mapSession(row) : null;
}

export async function findFieldOpsSessionsByMissionIds(missionIds: string[]) {
  if (!missionIds.length) return new Map<string, MissionFieldOpsSessionPersisted>();
  const rows = await prisma.missionFieldOpsSession.findMany({
    where: { missionId: { in: missionIds } },
    include,
  });
  return new Map<string, MissionFieldOpsSessionPersisted>(
    rows.map((row) => [row.missionId, mapSession(row)]),
  );
}

export async function createFieldOpsSession(input: {
  missionId: string;
  campaignDateKey: string;
  actorUserId: string;
  now: Date;
  scheduleFingerprint: string;
  travelFingerprint: string;
  logisticsFingerprint: string;
}) {
  const existing = await findFieldOpsSessionByMissionId(input.missionId);
  if (existing) return existing;
  return mapSession(
    await prisma.missionFieldOpsSession.create({
      data: {
        missionId: input.missionId,
        campaignDateKey: input.campaignDateKey,
        status: "OPEN",
        readinessState: "NOT_ASSESSED",
        checkInAt: input.now,
        checkInByUserId: input.actorUserId,
        scheduleFingerprint: input.scheduleFingerprint,
        travelFingerprint: input.travelFingerprint,
        logisticsFingerprint: input.logisticsFingerprint,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        updatedAt: input.now,
      },
      include,
    }),
  );
}

export async function updateFieldOpsSession(input: {
  fieldOpsSessionId: string;
  expectedUpdatedAt?: string | null;
  data: Record<string, unknown>;
  actorUserId: string;
}) {
  await assertCurrent(prisma, input.fieldOpsSessionId, input.expectedUpdatedAt);
  const dateFields = [
    "checkInAt",
    "readinessConfirmedAt",
    "wrapStartedAt",
    "closedAt",
  ];
  const data = Object.fromEntries(
    Object.entries(input.data).map(([key, value]) => [
      key,
      dateFields.includes(key) && typeof value === "string"
        ? new Date(value)
        : value,
    ]),
  );
  return mapSession(
    await prisma.missionFieldOpsSession.update({
      where: { id: input.fieldOpsSessionId },
      data: { ...data, updatedByUserId: input.actorUserId } as any,
      include,
    }),
  );
}

export async function upsertFieldItemConfirmation(input: {
  fieldOpsSessionId: string;
  logisticsItemId: string;
  itemDescriptionSnapshot: string;
  itemCriticalitySnapshot: string;
  itemReturnRequiredSnapshot: boolean;
  state: MissionFieldConfirmationState;
  condition?: MissionFieldItemCondition;
  observedQuantityLabel?: string | null;
  substituteDescription?: string | null;
  exceptionNote?: string | null;
  locationLabel?: string | null;
  expectedUpdatedAt?: string | null;
  actorUserId: string;
  now: Date;
}) {
  return prisma.$transaction(async (tx) => {
    await assertCurrent(tx, input.fieldOpsSessionId, input.expectedUpdatedAt);
    const existing = await tx.missionFieldItemConfirmation.findFirst({
      where: {
        fieldOpsSessionId: input.fieldOpsSessionId,
        logisticsItemId: input.logisticsItemId,
      },
    });
    if (existing) {
      const history = asHistory(existing.historyJson);
      history.push({
        state: existing.state,
        condition: existing.condition,
        confirmedAt: existing.confirmedAt.toISOString(),
        confirmedByUserId: existing.confirmedByUserId,
        observedQuantityLabel: existing.observedQuantityLabel,
        substituteDescription: existing.substituteDescription,
        exceptionNote: existing.exceptionNote,
      });
      await tx.missionFieldItemConfirmation.update({
        where: { id: existing.id },
        data: {
          state: input.state,
          condition: input.condition ?? existing.condition,
          observedQuantityLabel:
            input.observedQuantityLabel !== undefined
              ? input.observedQuantityLabel
              : existing.observedQuantityLabel,
          substituteDescription:
            input.substituteDescription !== undefined
              ? input.substituteDescription
              : existing.substituteDescription,
          exceptionNote:
            input.exceptionNote !== undefined
              ? input.exceptionNote
              : existing.exceptionNote,
          locationLabel:
            input.locationLabel !== undefined
              ? input.locationLabel
              : existing.locationLabel,
          itemDescriptionSnapshot: input.itemDescriptionSnapshot,
          itemCriticalitySnapshot: input.itemCriticalitySnapshot,
          itemReturnRequiredSnapshot: input.itemReturnRequiredSnapshot,
          confirmedAt: input.now,
          confirmedByUserId: input.actorUserId,
          historyJson: history,
          updatedByUserId: input.actorUserId,
        },
      });
    } else {
      await tx.missionFieldItemConfirmation.create({
        data: {
          fieldOpsSessionId: input.fieldOpsSessionId,
          logisticsItemId: input.logisticsItemId,
          itemDescriptionSnapshot: input.itemDescriptionSnapshot,
          itemCriticalitySnapshot: input.itemCriticalitySnapshot,
          itemReturnRequiredSnapshot: input.itemReturnRequiredSnapshot,
          state: input.state,
          condition: input.condition ?? "UNKNOWN",
          observedQuantityLabel: input.observedQuantityLabel ?? null,
          substituteDescription: input.substituteDescription ?? null,
          exceptionNote: input.exceptionNote ?? null,
          locationLabel: input.locationLabel ?? null,
          confirmedAt: input.now,
          confirmedByUserId: input.actorUserId,
          historyJson: [],
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
      });
    }
    await tx.missionFieldOpsSession.update({
      where: { id: input.fieldOpsSessionId },
      data: {
        status: "CHECKING",
        updatedByUserId: input.actorUserId,
      },
    });
    return mapSession(
      await tx.missionFieldOpsSession.findUniqueOrThrow({
        where: { id: input.fieldOpsSessionId },
        include,
      }),
    );
  });
}

export async function upsertFieldOpsAcknowledgement(input: {
  fieldOpsSessionId: string;
  issueKey: string;
  issueType: MissionFieldOpsIssueType;
  title: string;
  disposition: MissionFieldOpsAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  actorUserId: string;
  now: Date;
}) {
  const existing = await prisma.missionFieldOpsAcknowledgement.findUnique({
    where: {
      fieldOpsSessionId_issueKey: {
        fieldOpsSessionId: input.fieldOpsSessionId,
        issueKey: input.issueKey,
      },
    },
  });
  const data = {
    issueType: input.issueType,
    title: input.title,
    disposition: input.disposition,
    note: input.note,
    acceptedRiskReason: input.acceptedRiskReason,
    acknowledgedAt: input.now,
    acknowledgedByUserId: input.actorUserId,
  };
  if (existing) {
    await prisma.missionFieldOpsAcknowledgement.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.missionFieldOpsAcknowledgement.create({
      data: {
        fieldOpsSessionId: input.fieldOpsSessionId,
        issueKey: input.issueKey,
        ...data,
      },
    });
  }
  await prisma.missionFieldOpsSession.update({
    where: { id: input.fieldOpsSessionId },
    data: { updatedByUserId: input.actorUserId },
  });
  return {
    session: mapSession(
      await prisma.missionFieldOpsSession.findUniqueOrThrow({
        where: { id: input.fieldOpsSessionId },
        include,
      }),
    ),
    created: !existing,
  };
}
