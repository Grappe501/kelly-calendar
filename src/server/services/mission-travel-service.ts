import "server-only";

import {
  assertMovementDateInRange,
  buildDayMovementBoardView,
  buildMissionTravelWorkspaceView,
  DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  scheduleFingerprint,
  validateLegReorder,
  validateTravelAcknowledgement,
  validateTravelLegUpsert,
  validateTravelPlanPatch,
  type DayMovementBoardView,
  type MissionTravelWorkspaceView,
  type TravelMissionContext,
} from "@/lib/missions/v21/travel-movement";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import {
  campaignDayBounds,
  missionIntersectsCampaignDay,
} from "@/lib/missions/v21/day-briefing";
import {
  createTravelPlan,
  deleteTravelLeg,
  findTravelPlanByMissionId,
  findTravelPlansByMissionIds,
  reorderTravelLegs,
  updateTravelPlanContent,
  upsertTravelAcknowledgement,
  upsertTravelLeg,
} from "@/server/repositories/mission-travel-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Travel and Movement Operations requires campaign leadership access.",
    );
  }
}

function locationFromIntel(intelligence: unknown): string | null {
  if (!intelligence || typeof intelligence !== "object") return null;
  const intel = intelligence as {
    venueName?: string | null;
    city?: string | null;
    county?: string | null;
  };
  const parts = [
    intel.venueName,
    intel.city,
    intel.county ? `${intel.county} County` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

async function loadMissionContext(
  missionId: string,
): Promise<TravelMissionContext> {
  const { prisma } = await import("@/server/db/prisma");
  const mission = await prisma.campaignMission.findUnique({
    where: { id: missionId },
    include: {
      preparation: { select: { readinessState: true } },
      sourceEvent: {
        select: {
          status: true,
          travelPlans: { select: { travelRequired: true }, take: 1 },
        },
      },
    },
  });
  if (!mission) throw new NotFoundError("Mission not found.");

  const tz = mission.timezone || getPublicAppConfig().campaignTimezone;
  return {
    missionId: mission.id,
    title: mission.attendTitle,
    startsAt: mission.startsAt.toISOString(),
    endsAt: mission.endsAt.toISOString(),
    timezone: tz,
    locationLabel: locationFromIntel(mission.intelligence),
    campaignDateKey: campaignDateKey(mission.startsAt, tz),
    lifecyclePhase: mission.lifecyclePhase,
    operationalStatus: mission.missionStatus,
    eventTravelRequired: Boolean(mission.sourceEvent.travelPlans[0]?.travelRequired),
    isCancelled:
      mission.sourceEvent.status === "CANCELLED" ||
      mission.missionStatus === "CANCELLED",
    preparationExists: Boolean(mission.preparation),
    preparationReadiness: mission.preparation?.readinessState ?? null,
  };
}

export async function getMissionTravelWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionTravelWorkspaceView> {
  assertLeadership(actor);
  const context = await loadMissionContext(missionId);
  const plan = await findTravelPlanByMissionId(missionId);
  return buildMissionTravelWorkspaceView({ context, plan });
}

export async function startMissionTravelPlan(options: {
  missionId: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<MissionTravelWorkspaceView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const context = await loadMissionContext(options.missionId);
  await createTravelPlan({
    missionId: options.missionId,
    campaignDateKey: context.campaignDateKey,
    actorUserId: options.actor.userId,
    now,
    scheduleFingerprint: scheduleFingerprint(context.startsAt, context.endsAt),
  });
  return getMissionTravelWorkspace(options.missionId, options.actor);
}

export async function patchMissionTravelPlan(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionTravelWorkspaceView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const validated = validateTravelPlanPatch(
    options.body,
    DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);

  let plan = await findTravelPlanByMissionId(options.missionId);
  if (!plan) {
    const context = await loadMissionContext(options.missionId);
    plan = await createTravelPlan({
      missionId: options.missionId,
      campaignDateKey: context.campaignDateKey,
      actorUserId: options.actor.userId,
      now,
      scheduleFingerprint: scheduleFingerprint(
        context.startsAt,
        context.endsAt,
      ),
    });
  }

  const { expectedUpdatedAt, confirmSchedule, ...fields } = validated.patch as {
    expectedUpdatedAt?: string | null;
    confirmSchedule?: boolean;
  } & Record<string, unknown>;

  const data: Record<string, unknown> = { ...fields };
  if (confirmSchedule) {
    const context = await loadMissionContext(options.missionId);
    data.scheduleFingerprint = scheduleFingerprint(
      context.startsAt,
      context.endsAt,
    );
    data.confirmedAt = now.toISOString();
    data.confirmedByUserId = options.actor.userId;
  }

  await updateTravelPlanContent({
    travelPlanId: plan.id,
    expectedUpdatedAt,
    data,
    actorUserId: options.actor.userId,
  });

  return getMissionTravelWorkspace(options.missionId, options.actor);
}

export async function upsertMissionTravelLeg(options: {
  missionId: string;
  actor: AuthenticatedActor;
  legId?: string | null;
  body: unknown;
}): Promise<MissionTravelWorkspaceView> {
  assertLeadership(options.actor);
  const validated = validateTravelLegUpsert(
    options.body,
    DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);

  let plan = await findTravelPlanByMissionId(options.missionId);
  if (!plan) {
    await startMissionTravelPlan({
      missionId: options.missionId,
      actor: options.actor,
    });
    plan = await findTravelPlanByMissionId(options.missionId);
  }
  if (!plan) throw new NotFoundError("Travel plan not found.");

  const { expectedUpdatedAt, ...data } = validated.patch as {
    expectedUpdatedAt?: string | null;
  } & Record<string, unknown>;

  if (options.legId) {
    const owns = plan.legs.some((l) => l.id === options.legId);
    if (!owns) throw new NotFoundError("Travel leg not found on this plan.");
  }

  await upsertTravelLeg({
    travelPlanId: plan.id,
    legId: options.legId,
    data: data as Parameters<typeof upsertTravelLeg>[0]["data"],
    expectedUpdatedAt,
    actorUserId: options.actor.userId,
  });

  return getMissionTravelWorkspace(options.missionId, options.actor);
}

export async function reorderMissionTravelLegs(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
}): Promise<MissionTravelWorkspaceView> {
  assertLeadership(options.actor);
  const validated = validateLegReorder(
    options.body,
    DEFAULT_TRAVEL_MOVEMENT_CONFIG.maxLegs,
  );
  if (!validated.ok) throw new ValidationError(validated.error);

  const plan = await findTravelPlanByMissionId(options.missionId);
  if (!plan) throw new NotFoundError("Travel plan not found.");

  const patch = validated.patch as {
    orderedLegIds: string[];
    expectedUpdatedAt?: string | null;
  };

  await reorderTravelLegs({
    travelPlanId: plan.id,
    orderedLegIds: patch.orderedLegIds,
    expectedUpdatedAt: patch.expectedUpdatedAt,
    actorUserId: options.actor.userId,
  });

  return getMissionTravelWorkspace(options.missionId, options.actor);
}

export async function removeMissionTravelLeg(options: {
  missionId: string;
  actor: AuthenticatedActor;
  legId: string;
  body: unknown;
}): Promise<MissionTravelWorkspaceView> {
  assertLeadership(options.actor);
  const plan = await findTravelPlanByMissionId(options.missionId);
  if (!plan) throw new NotFoundError("Travel plan not found.");
  const body =
    options.body && typeof options.body === "object"
      ? (options.body as { expectedUpdatedAt?: string })
      : {};

  await deleteTravelLeg({
    travelPlanId: plan.id,
    legId: options.legId,
    expectedUpdatedAt: body.expectedUpdatedAt,
    actorUserId: options.actor.userId,
  });

  return getMissionTravelWorkspace(options.missionId, options.actor);
}

export async function acknowledgeMissionTravelIssue(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionTravelWorkspaceView & { ackCreated: boolean }> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const validated = validateTravelAcknowledgement(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);

  let plan = await findTravelPlanByMissionId(options.missionId);
  if (!plan) {
    await startMissionTravelPlan({
      missionId: options.missionId,
      actor: options.actor,
      now,
    });
    plan = await findTravelPlanByMissionId(options.missionId);
  }
  if (!plan) throw new NotFoundError("Travel plan not found.");

  const p = validated.patch as {
    issueKey: string;
    issueType: Parameters<typeof upsertTravelAcknowledgement>[0]["issueType"];
    title: string;
    disposition: Parameters<typeof upsertTravelAcknowledgement>[0]["disposition"];
    note: string | null;
    acceptedRiskReason: string | null;
  };

  const result = await upsertTravelAcknowledgement({
    travelPlanId: plan.id,
    ...p,
    actorUserId: options.actor.userId,
    now,
  });

  const workspace = await getMissionTravelWorkspace(
    options.missionId,
    options.actor,
  );
  return { ...workspace, ackCreated: result.created };
}

export async function getDayMovementBoard(options: {
  dateKey?: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<DayMovementBoardView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const todayKey = campaignDateKey(now, campaignTimezone);
  const dateKey = options.dateKey ?? todayKey;
  const ranged = assertMovementDateInRange(dateKey, now, campaignTimezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);

  const { start, end } = campaignDayBounds(dateKey, campaignTimezone);
  const all = await loadMissionsForDayBriefing({
    rangeStart: start,
    rangeEnd: end,
    operationalLookbackStart: start,
    now,
  });
  const dayMissions = all.filter((m) =>
    missionIntersectsCampaignDay(m.startsAt, m.endsAt, dateKey, campaignTimezone),
  );

  const contexts: TravelMissionContext[] = dayMissions.map((m) => ({
    missionId: m.missionId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    timezone: m.timezone,
    locationLabel: m.locationLabel,
    campaignDateKey: dateKey,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    eventTravelRequired: m.travelRequired,
    isCancelled: m.operationalStatus === "CANCELLED",
    preparationExists: m.preparation.exists,
    preparationReadiness: m.preparation.readiness,
  }));

  const plans = await findTravelPlansByMissionIds(
    contexts.map((c) => c.missionId),
  );

  return buildDayMovementBoardView({
    campaignDate: dateKey,
    now,
    campaignTimezone,
    missions: contexts,
    plansByMissionId: plans,
  });
}
