// @ts-nocheck -- generic date-normalization is constrained at the repository boundary.
import "server-only";
import { randomBytes } from "node:crypto";
import type {
  MissionIncidentAcknowledgementDisposition,
  MissionIncidentAcknowledgementPersisted,
  MissionIncidentIssueType,
  MissionIncidentPersisted,
  MissionIncidentSeverity,
  MissionIncidentStatus,
  MissionIncidentUpdatePersisted,
  MissionIncidentUpdateType,
} from "@/lib/missions/v21/incident-log/types";
import { sortUpdates } from "@/lib/missions/v21/incident-log/readiness";
import { prisma } from "@/server/db/prisma";
import { ConflictError } from "@/lib/security/safe-error";

const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

const include = { updates: true, acknowledgements: true } as const;

function mapUpdate(row: any): MissionIncidentUpdatePersisted {
  return {
    id: row.id,
    updateType: row.updateType,
    note: row.note,
    actionTaken: row.actionTaken,
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    recordedByUserId: row.recordedByUserId,
    previousStatus: row.previousStatus,
    newStatus: row.newStatus,
    previousSeverity: row.previousSeverity,
    newSeverity: row.newSeverity,
    sensitivity: row.sensitivity,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAck(row: any): MissionIncidentAcknowledgementPersisted {
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

function mapIncident(row: any): MissionIncidentPersisted {
  return {
    id: row.id,
    missionId: row.missionId,
    campaignDateKey: row.campaignDateKey,
    incidentRef: row.incidentRef,
    category: row.category,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    description: row.description,
    observedAt: row.observedAt.toISOString(),
    reportedAt: row.reportedAt.toISOString(),
    reportedByUserId: row.reportedByUserId,
    locationLabel: row.locationLabel,
    sensitivity: row.sensitivity,
    immediateActionSummary: row.immediateActionSummary,
    ownerName: row.ownerName,
    ownerUserId: row.ownerUserId,
    carryForwardRequired: row.carryForwardRequired,
    carriedForwardAt: iso(row.carriedForwardAt),
    carriedForwardByUserId: row.carriedForwardByUserId,
    followUpRequired: row.followUpRequired,
    linkedFollowUpActionId: row.linkedFollowUpActionId,
    linkedFollowUpImportKey: row.linkedFollowUpImportKey,
    stabilizedAt: iso(row.stabilizedAt),
    stabilizedByUserId: row.stabilizedByUserId,
    resolvedAt: iso(row.resolvedAt),
    resolvedByUserId: row.resolvedByUserId,
    closedAt: iso(row.closedAt),
    closedByUserId: row.closedByUserId,
    archivedAt: iso(row.archivedAt),
    archivedByUserId: row.archivedByUserId,
    isArchived: row.isArchived,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    updates: sortUpdates((row.updates ?? []).map(mapUpdate)),
    acknowledgements: (row.acknowledgements ?? []).map(mapAck),
  };
}

async function assertCurrent(
  tx: any,
  incidentId: string,
  expected?: string | null,
) {
  const incident = await tx.missionIncident.findUnique({
    where: { id: incidentId },
  });
  if (!incident) throw new ConflictError("Mission incident not found.");
  if (expected && incident.updatedAt.toISOString() !== expected) {
    throw new ConflictError(
      "Mission incident was updated elsewhere. Refresh and retry.",
    );
  }
  return incident;
}

function generateIncidentRef(campaignDateKey: string) {
  const ymd = campaignDateKey.replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `INC-${ymd}-${suffix}`;
}

function applyStatusSideEffects(
  data: Record<string, unknown>,
  previousStatus: MissionIncidentStatus,
  nextStatus: MissionIncidentStatus,
  actorUserId: string,
  now: Date,
) {
  if (previousStatus === nextStatus) return;
  if (nextStatus === "STABILIZED" && !data.stabilizedAt) {
    data.stabilizedAt = now;
    data.stabilizedByUserId = actorUserId;
  }
  if (nextStatus === "RESOLVED" && !data.resolvedAt) {
    data.resolvedAt = now;
    data.resolvedByUserId = actorUserId;
  }
  if (nextStatus === "CLOSED" && !data.closedAt) {
    data.closedAt = now;
    data.closedByUserId = actorUserId;
  }
}

const dateFields = [
  "observedAt",
  "reportedAt",
  "carriedForwardAt",
  "stabilizedAt",
  "resolvedAt",
  "closedAt",
  "archivedAt",
];

function normalizeDates(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      dateFields.includes(key) && typeof value === "string"
        ? new Date(value)
        : value,
    ]),
  );
}

export async function findIncidentsByMissionId(missionId: string) {
  const rows = await prisma.missionIncident.findMany({
    where: { missionId },
    include,
    orderBy: [{ observedAt: "desc" }, { incidentRef: "asc" }],
  });
  return rows.map(mapIncident);
}

export async function findIncidentById(incidentId: string) {
  const row = await prisma.missionIncident.findUnique({
    where: { id: incidentId },
    include,
  });
  return row ? mapIncident(row) : null;
}

export async function findIncidentsByMissionIds(missionIds: string[]) {
  if (!missionIds.length) {
    return new Map<string, MissionIncidentPersisted[]>();
  }
  const rows = await prisma.missionIncident.findMany({
    where: { missionId: { in: missionIds } },
    include,
    orderBy: [{ observedAt: "desc" }, { incidentRef: "asc" }],
  });
  const grouped = new Map<string, MissionIncidentPersisted[]>();
  for (const row of rows) {
    const incident = mapIncident(row);
    const list = grouped.get(incident.missionId) ?? [];
    list.push(incident);
    grouped.set(incident.missionId, list);
  }
  return grouped;
}

export async function findIncidentsByCampaignDateKey(campaignDateKey: string) {
  const rows = await prisma.missionIncident.findMany({
    where: { campaignDateKey },
    include,
    orderBy: [{ observedAt: "desc" }, { incidentRef: "asc" }],
  });
  return rows.map(mapIncident);
}

/**
 * Digest load: selected-day incidents plus earlier-day active / carry-forward /
 * follow-up-gap incidents. Never fabricates rows.
 */
export async function findIncidentsForExceptionDigest(
  campaignDateKey: string,
): Promise<MissionIncidentPersisted[]> {
  const dayRows = await prisma.missionIncident.findMany({
    where: { campaignDateKey },
    include,
  });
  const earlierRows = await prisma.missionIncident.findMany({
    where: {
      campaignDateKey: { lt: campaignDateKey },
      isArchived: false,
      OR: [
        { status: { in: ["OPEN", "MONITORING", "STABILIZED"] } },
        { carryForwardRequired: true },
        { carriedForwardAt: { not: null } },
        {
          AND: [
            { followUpRequired: true },
            { linkedFollowUpActionId: null },
          ],
        },
      ],
    },
    include,
  });
  const byId = new Map<string, MissionIncidentPersisted>();
  for (const row of [...dayRows, ...earlierRows]) {
    byId.set(row.id, mapIncident(row));
  }
  return [...byId.values()].sort(
    (a, b) =>
      b.observedAt.localeCompare(a.observedAt) ||
      a.incidentRef.localeCompare(b.incidentRef),
  );
}

export async function createIncident(input: {
  missionId: string;
  campaignDateKey: string;
  data: Record<string, unknown>;
  actorUserId: string;
  now: Date;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const incidentRef = generateIncidentRef(input.campaignDateKey);
    try {
      return mapIncident(
        await prisma.missionIncident.create({
          data: {
            missionId: input.missionId,
            campaignDateKey: input.campaignDateKey,
            incidentRef,
            category: input.data.category ?? "OTHER",
            severity: input.data.severity ?? "MODERATE",
            status: input.data.status ?? "OPEN",
            summary: input.data.summary,
            description: input.data.description ?? null,
            observedAt: new Date(input.data.observedAt as string),
            reportedAt: input.now,
            reportedByUserId: input.actorUserId,
            locationLabel: input.data.locationLabel ?? null,
            sensitivity: input.data.sensitivity ?? "STANDARD",
            immediateActionSummary: input.data.immediateActionSummary ?? null,
            ownerName: input.data.ownerName ?? null,
            ownerUserId: input.data.ownerUserId ?? null,
            followUpRequired: input.data.followUpRequired ?? false,
            carryForwardRequired: input.data.carryForwardRequired ?? false,
            createdByUserId: input.actorUserId,
            updatedByUserId: input.actorUserId,
            updatedAt: input.now,
          },
          include,
        }),
      );
    } catch (error: any) {
      if (error?.code !== "P2002" || attempt === 4) throw error;
    }
  }
  throw new ConflictError("Unable to allocate a unique incident reference.");
}

export async function updateIncident(input: {
  incidentId: string;
  expectedUpdatedAt?: string | null;
  data: Record<string, unknown>;
  actorUserId: string;
  now: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await assertCurrent(
      tx,
      input.incidentId,
      input.expectedUpdatedAt,
    );
    const data = normalizeDates({ ...input.data });
    delete data.expectedUpdatedAt;

    const nextStatus = data.status as MissionIncidentStatus | undefined;
    const nextSeverity = data.severity as MissionIncidentSeverity | undefined;

    if (nextStatus) {
      applyStatusSideEffects(
        data,
        current.status,
        nextStatus,
        input.actorUserId,
        input.now,
      );
    }

    if (nextStatus && nextStatus !== current.status) {
      await tx.missionIncidentUpdate.create({
        data: {
          incidentId: current.id,
          updateType: "STATUS_CHANGE",
          note: typeof data.statusNote === "string" ? data.statusNote : null,
          occurredAt: input.now,
          recordedAt: input.now,
          recordedByUserId: input.actorUserId,
          previousStatus: current.status,
          newStatus: nextStatus,
          sensitivity: current.sensitivity,
        },
      });
      delete data.statusNote;
    }

    if (nextSeverity && nextSeverity !== current.severity) {
      await tx.missionIncidentUpdate.create({
        data: {
          incidentId: current.id,
          updateType: "SEVERITY_CHANGE",
          note:
            typeof data.severityNote === "string" ? data.severityNote : null,
          occurredAt: input.now,
          recordedAt: input.now,
          recordedByUserId: input.actorUserId,
          previousSeverity: current.severity,
          newSeverity: nextSeverity,
          sensitivity: current.sensitivity,
        },
      });
      delete data.severityNote;
    }

    return mapIncident(
      await tx.missionIncident.update({
        where: { id: current.id },
        data: {
          ...data,
          updatedByUserId: input.actorUserId,
          updatedAt: input.now,
        },
        include,
      }),
    );
  });
}

export async function archiveIncident(input: {
  incidentId: string;
  expectedUpdatedAt?: string | null;
  actorUserId: string;
  now: Date;
}) {
  return updateIncident({
    incidentId: input.incidentId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    data: {
      isArchived: true,
      archivedAt: input.now.toISOString(),
      archivedByUserId: input.actorUserId,
    },
    actorUserId: input.actorUserId,
    now: input.now,
  });
}

export async function appendUpdate(input: {
  incidentId: string;
  expectedUpdatedAt?: string | null;
  updateType: MissionIncidentUpdateType;
  note?: string | null;
  actionTaken?: string | null;
  occurredAt: string;
  sensitivity?: string;
  actorUserId: string;
  now: Date;
}) {
  return prisma.$transaction(async (tx) => {
    await assertCurrent(tx, input.incidentId, input.expectedUpdatedAt);
    await tx.missionIncidentUpdate.create({
      data: {
        incidentId: input.incidentId,
        updateType: input.updateType,
        note: input.note ?? null,
        actionTaken: input.actionTaken ?? null,
        occurredAt: new Date(input.occurredAt),
        recordedAt: input.now,
        recordedByUserId: input.actorUserId,
        sensitivity: input.sensitivity ?? "STANDARD",
      },
    });
    return mapIncident(
      await tx.missionIncident.update({
        where: { id: input.incidentId },
        data: {
          updatedByUserId: input.actorUserId,
          updatedAt: input.now,
        },
        include,
      }),
    );
  });
}

export async function upsertAcknowledgement(input: {
  incidentId: string;
  issueKey: string;
  issueType: MissionIncidentIssueType;
  title: string;
  disposition: MissionIncidentAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  actorUserId: string;
  now: Date;
}) {
  const existing = await prisma.missionIncidentAcknowledgement.findUnique({
    where: {
      incidentId_issueKey: {
        incidentId: input.incidentId,
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
    await prisma.missionIncidentAcknowledgement.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.missionIncidentAcknowledgement.create({
      data: {
        incidentId: input.incidentId,
        issueKey: input.issueKey,
        ...data,
      },
    });
  }
  await prisma.missionIncident.update({
    where: { id: input.incidentId },
    data: {
      updatedByUserId: input.actorUserId,
      updatedAt: input.now,
    },
  });
  return {
    incident: await findIncidentById(input.incidentId),
    created: !existing,
  };
}
