import "server-only";
import {
  assertFieldOpsDateInRange,
  buildDayFieldOpsBoardView,
  buildMissionFieldOpsWorkspaceView,
  DEFAULT_FIELD_OPS_CONFIG,
  fieldOpsLogisticsFingerprint,
  fieldOpsScheduleFingerprint,
  fieldOpsTravelFingerprint,
  validateFieldConfirmationUpsert,
  validateFieldOpsAcknowledgement,
  validateFieldOpsSessionPatch,
  type DayFieldOpsBoardView,
  type FieldOpsMissionContext,
  type MissionFieldOpsWorkspaceView,
} from "@/lib/missions/v21/field-ops";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  campaignDayBounds,
  missionIntersectsCampaignDay,
} from "@/lib/missions/v21/day-briefing";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import { findLogisticsPackByMissionId } from "@/server/repositories/mission-logistics-repository";
import {
  createFieldOpsSession,
  findFieldOpsSessionByMissionId,
  findFieldOpsSessionsByMissionIds,
  updateFieldOpsSession,
  upsertFieldItemConfirmation,
  upsertFieldOpsAcknowledgement,
} from "@/server/repositories/mission-field-ops-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Field Day Operations requires campaign leadership access.",
    );
  }
}

function locationFromIntel(intelligence: unknown) {
  if (!intelligence || typeof intelligence !== "object") return null;
  const intel = intelligence as {
    venueName?: string | null;
    city?: string | null;
    county?: string | null;
  };
  const values = [
    intel.venueName,
    intel.city,
    intel.county ? `${intel.county} County` : null,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : null;
}

function materialCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function packRef(pack: Awaited<ReturnType<typeof findLogisticsPackByMissionId>>) {
  if (!pack) return null;
  return {
    id: pack.id,
    status: pack.status,
    logisticsRequired: pack.logisticsRequired,
    items: pack.items.map((item) => ({
      id: item.id,
      sequence: item.sequence,
      description: item.description,
      quantityLabel: item.quantityLabel,
      status: item.status,
      criticality: item.criticality,
      returnRequired: item.returnRequired,
      responsibleName: item.responsibleName,
    })),
    handoffs: pack.handoffs.map((h) => ({
      id: h.id,
      logisticsItemId: h.logisticsItemId,
      status: h.status,
      giverConfirmedAt: h.giverConfirmedAt,
      receiverConfirmedAt: h.receiverConfirmedAt,
    })),
  };
}

async function loadMissionContext(
  missionId: string,
): Promise<FieldOpsMissionContext> {
  const { prisma } = await import("@/server/db/prisma");
  const mission = await prisma.campaignMission.findUnique({
    where: { id: missionId },
    include: {
      preparation: { select: { materialsNeeded: true } },
      execution: { select: { executionStatus: true } },
      sourceEvent: {
        select: { status: true, packingItems: { select: { id: true } } },
      },
      travelPlan: { select: { plannedDepartureAt: true } },
    },
  });
  if (!mission) throw new NotFoundError("Mission not found.");
  const timezone = mission.timezone || getPublicAppConfig().campaignTimezone;
  const pack = await findLogisticsPackByMissionId(missionId);
  return {
    missionId: mission.id,
    title: mission.attendTitle,
    startsAt: mission.startsAt.toISOString(),
    endsAt: mission.endsAt.toISOString(),
    timezone,
    locationLabel: locationFromIntel(mission.intelligence),
    campaignDateKey: campaignDateKey(mission.startsAt, timezone),
    lifecyclePhase: mission.lifecyclePhase,
    operationalStatus: mission.missionStatus,
    executionStatus: mission.execution?.executionStatus ?? null,
    isCancelled:
      mission.sourceEvent.status === "CANCELLED" ||
      mission.missionStatus === "CANCELLED",
    materialsIndicated:
      materialCount(mission.preparation?.materialsNeeded) > 0 ||
      mission.sourceEvent.packingItems.length > 0,
    travelPlannedDepartureAt:
      mission.travelPlan?.plannedDepartureAt?.toISOString() ?? null,
    pack: packRef(pack),
  };
}

export async function getMissionFieldOpsWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionFieldOpsWorkspaceView> {
  assertLeadership(actor);
  return buildMissionFieldOpsWorkspaceView({
    context: await loadMissionContext(missionId),
    session: await findFieldOpsSessionByMissionId(missionId),
  });
}

export async function openFieldOpsSession(options: {
  missionId: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<MissionFieldOpsWorkspaceView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const context = await loadMissionContext(options.missionId);
  const items = context.pack?.items ?? [];
  await createFieldOpsSession({
    missionId: context.missionId,
    campaignDateKey: context.campaignDateKey,
    actorUserId: options.actor.userId,
    now,
    scheduleFingerprint: fieldOpsScheduleFingerprint(
      context.startsAt,
      context.endsAt,
    ),
    travelFingerprint: fieldOpsTravelFingerprint(
      context.travelPlannedDepartureAt,
    ),
    logisticsFingerprint: fieldOpsLogisticsFingerprint(items),
  });
  return getMissionFieldOpsWorkspace(options.missionId, options.actor);
}

export async function patchFieldOpsSession(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionFieldOpsWorkspaceView> {
  assertLeadership(options.actor);
  const validated = validateFieldOpsSessionPatch(
    options.body,
    DEFAULT_FIELD_OPS_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);
  const now = options.now ?? new Date();
  let session = await findFieldOpsSessionByMissionId(options.missionId);
  if (!session) {
    await openFieldOpsSession({
      missionId: options.missionId,
      actor: options.actor,
      now,
    });
    session = await findFieldOpsSessionByMissionId(options.missionId);
  }
  if (!session) throw new NotFoundError("Field Ops session not found.");

  const {
    expectedUpdatedAt,
    confirmReadiness,
    beginWrap,
    closeSession,
    checkIn,
    ...fields
  } = validated.patch;
  const data = { ...fields } as Record<string, unknown>;
  const context = await loadMissionContext(options.missionId);

  if (checkIn) {
    data.checkInAt = now.toISOString();
    data.checkInByUserId = options.actor.userId;
    if (!data.status) data.status = "CHECKING";
  }
  if (confirmReadiness) {
    data.scheduleFingerprint = fieldOpsScheduleFingerprint(
      context.startsAt,
      context.endsAt,
    );
    data.travelFingerprint = fieldOpsTravelFingerprint(
      context.travelPlannedDepartureAt,
    );
    data.logisticsFingerprint = fieldOpsLogisticsFingerprint(
      context.pack?.items ?? [],
    );
    data.readinessConfirmedAt = now.toISOString();
    data.readinessConfirmedByUserId = options.actor.userId;
    data.status = "READY";
  }
  if (beginWrap) {
    data.wrapStartedAt = now.toISOString();
    data.wrapStartedByUserId = options.actor.userId;
    data.status = "WRAP_PENDING";
  }
  if (closeSession) {
    data.closedAt = now.toISOString();
    data.closedByUserId = options.actor.userId;
    data.status = "CLOSED";
  }

  await updateFieldOpsSession({
    fieldOpsSessionId: session.id,
    expectedUpdatedAt: expectedUpdatedAt as string | null | undefined,
    data,
    actorUserId: options.actor.userId,
  });
  return getMissionFieldOpsWorkspace(options.missionId, options.actor);
}

export async function confirmFieldItem(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionFieldOpsWorkspaceView> {
  assertLeadership(options.actor);
  const validated = validateFieldConfirmationUpsert(
    options.body,
    DEFAULT_FIELD_OPS_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);
  const now = options.now ?? new Date();
  let session = await findFieldOpsSessionByMissionId(options.missionId);
  if (!session) {
    await openFieldOpsSession({
      missionId: options.missionId,
      actor: options.actor,
      now,
    });
    session = await findFieldOpsSessionByMissionId(options.missionId);
  }
  if (!session) throw new NotFoundError("Field Ops session not found.");

  const context = await loadMissionContext(options.missionId);
  const itemId = validated.patch.logisticsItemId as string;
  const item = context.pack?.items.find((i) => i.id === itemId);
  if (!item) {
    throw new NotFoundError(
      "Logistics item not found on this Mission’s active pack.",
    );
  }

  const { expectedUpdatedAt, ...rest } = validated.patch;
  await upsertFieldItemConfirmation({
    fieldOpsSessionId: session.id,
    logisticsItemId: item.id,
    itemDescriptionSnapshot: item.description,
    itemCriticalitySnapshot: item.criticality,
    itemReturnRequiredSnapshot: item.returnRequired,
    state: rest.state as Parameters<typeof upsertFieldItemConfirmation>[0]["state"],
    condition: rest.condition as
      | Parameters<typeof upsertFieldItemConfirmation>[0]["condition"]
      | undefined,
    observedQuantityLabel: (rest.observedQuantityLabel as string | null) ?? null,
    substituteDescription: (rest.substituteDescription as string | null) ?? null,
    exceptionNote: (rest.exceptionNote as string | null) ?? null,
    locationLabel: (rest.locationLabel as string | null) ?? null,
    expectedUpdatedAt: expectedUpdatedAt as string | null | undefined,
    actorUserId: options.actor.userId,
    now,
  });
  return getMissionFieldOpsWorkspace(options.missionId, options.actor);
}

export async function acknowledgeFieldOpsIssue(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionFieldOpsWorkspaceView & { ackCreated: boolean }> {
  assertLeadership(options.actor);
  const validated = validateFieldOpsAcknowledgement(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const now = options.now ?? new Date();
  let session = await findFieldOpsSessionByMissionId(options.missionId);
  if (!session) {
    await openFieldOpsSession({
      missionId: options.missionId,
      actor: options.actor,
      now,
    });
    session = await findFieldOpsSessionByMissionId(options.missionId);
  }
  if (!session) throw new NotFoundError("Field Ops session not found.");

  const acknowledgement = validated.patch as {
    issueKey: string;
    issueType: Parameters<typeof upsertFieldOpsAcknowledgement>[0]["issueType"];
    title: string;
    disposition: Parameters<
      typeof upsertFieldOpsAcknowledgement
    >[0]["disposition"];
    note: string | null;
    acceptedRiskReason: string | null;
  };
  const result = await upsertFieldOpsAcknowledgement({
    fieldOpsSessionId: session.id,
    ...acknowledgement,
    actorUserId: options.actor.userId,
    now,
  });
  return {
    ...(await getMissionFieldOpsWorkspace(options.missionId, options.actor)),
    ackCreated: result.created,
  };
}

export async function getDayFieldOpsBoard(options: {
  dateKey?: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<DayFieldOpsBoardView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const timezone = getPublicAppConfig().campaignTimezone;
  const dateKey = options.dateKey ?? campaignDateKey(now, timezone);
  const ranged = assertFieldOpsDateInRange(dateKey, now, timezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);
  const { start, end } = campaignDayBounds(dateKey, timezone);
  const day = (
    await loadMissionsForDayBriefing({
      rangeStart: start,
      rangeEnd: end,
      operationalLookbackStart: start,
      now,
    })
  ).filter((m) =>
    missionIntersectsCampaignDay(m.startsAt, m.endsAt, dateKey, timezone),
  );

  const packs = await Promise.all(
    day.map(async (m) => ({
      missionId: m.missionId,
      pack: await findLogisticsPackByMissionId(m.missionId),
    })),
  );
  const packMap = new Map(packs.map((p) => [p.missionId, p.pack]));

  const contexts: FieldOpsMissionContext[] = day.map((m) => ({
    missionId: m.missionId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    timezone: m.timezone,
    locationLabel: m.locationLabel,
    campaignDateKey: dateKey,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    executionStatus: m.execution.status,
    isCancelled: m.operationalStatus === "CANCELLED",
    materialsIndicated: m.preparation.materialsNeeded.length > 0,
    travelPlannedDepartureAt:
      m.missionTravelPlan?.plannedDepartureAt ?? null,
    pack: packRef(packMap.get(m.missionId) ?? null),
  }));

  return buildDayFieldOpsBoardView({
    campaignDate: dateKey,
    now,
    campaignTimezone: timezone,
    missions: contexts,
    sessionsByMissionId: await findFieldOpsSessionsByMissionIds(
      contexts.map((c) => c.missionId),
    ),
  });
}
