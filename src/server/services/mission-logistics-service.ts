import "server-only";
import { assertLogisticsDateInRange, buildDayLogisticsBoardView, buildMissionLogisticsWorkspaceView, DEFAULT_LOGISTICS_PACK_CONFIG, logisticsScheduleFingerprint, logisticsTravelFingerprint, validateItemReorder, validateLogisticsAcknowledgement, validateLogisticsHandoffUpsert, validateLogisticsItemUpsert, validateLogisticsPackPatch, type DayLogisticsBoardView, type LogisticsMissionContext, type MissionLogisticsWorkspaceView } from "@/lib/missions/v21/logistics-pack";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError, ValidationError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { campaignDayBounds, missionIntersectsCampaignDay } from "@/lib/missions/v21/day-briefing";
import { loadMissionsForDayBriefing } from "@/server/repositories/campaign-day-briefing-repository";
import { createLogisticsPack, deleteLogisticsItem, findLogisticsPackByMissionId, findLogisticsPacksByMissionIds, reorderLogisticsItems, updateLogisticsPack, upsertLogisticsAcknowledgement, upsertLogisticsHandoff, upsertLogisticsItem } from "@/server/repositories/mission-logistics-repository";

function assertLeadership(actor: AuthenticatedActor) { if (!roleHasFullCalendarAccess(actor.primarySystemRole)) throw new PermissionDeniedError("Logistics Pack Operations requires campaign leadership access."); }
function locationFromIntel(intelligence: unknown) { if (!intelligence || typeof intelligence !== "object") return null; const intel = intelligence as { venueName?: string | null; city?: string | null; county?: string | null }; const values = [intel.venueName, intel.city, intel.county ? `${intel.county} County` : null].filter(Boolean); return values.length ? values.join(" · ") : null; }
function materialCount(value: unknown) { return Array.isArray(value) ? value.length : 0; }
async function loadMissionContext(missionId: string): Promise<LogisticsMissionContext> { const { prisma } = await import("@/server/db/prisma"); const mission = await prisma.campaignMission.findUnique({ where: { id: missionId }, include: { preparation: { select: { materialsNeeded: true } }, sourceEvent: { select: { status: true, packingItems: { select: { id: true } } } }, travelPlan: { select: { plannedDepartureAt: true } } } }); if (!mission) throw new NotFoundError("Mission not found."); const timezone = mission.timezone || getPublicAppConfig().campaignTimezone; return { missionId: mission.id, title: mission.attendTitle, startsAt: mission.startsAt.toISOString(), endsAt: mission.endsAt.toISOString(), timezone, locationLabel: locationFromIntel(mission.intelligence), campaignDateKey: campaignDateKey(mission.startsAt, timezone), lifecyclePhase: mission.lifecyclePhase, operationalStatus: mission.missionStatus, isCancelled: mission.sourceEvent.status === "CANCELLED" || mission.missionStatus === "CANCELLED", materialsIndicated: materialCount(mission.preparation?.materialsNeeded) > 0 || mission.sourceEvent.packingItems.length > 0, travelPlannedDepartureAt: mission.travelPlan?.plannedDepartureAt?.toISOString() ?? null }; }
async function requirePack(missionId: string, actor: AuthenticatedActor, now = new Date()) { let pack = await findLogisticsPackByMissionId(missionId); if (!pack) { await startPack({ missionId, actor, now }); pack = await findLogisticsPackByMissionId(missionId); } if (!pack) throw new NotFoundError("Logistics pack not found."); return pack; }

export async function getMissionLogisticsWorkspace(missionId: string, actor: AuthenticatedActor): Promise<MissionLogisticsWorkspaceView> { assertLeadership(actor); return buildMissionLogisticsWorkspaceView({ context: await loadMissionContext(missionId), pack: await findLogisticsPackByMissionId(missionId) }); }
export async function startPack(options: { missionId: string; actor: AuthenticatedActor; now?: Date }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const now = options.now ?? new Date(); const context = await loadMissionContext(options.missionId); await createLogisticsPack({ missionId: context.missionId, campaignDateKey: context.campaignDateKey, actorUserId: options.actor.userId, now, scheduleFingerprint: logisticsScheduleFingerprint(context.startsAt, context.endsAt), travelFingerprint: logisticsTravelFingerprint(context.travelPlannedDepartureAt) }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function patchPack(options: { missionId: string; actor: AuthenticatedActor; body: unknown; now?: Date }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const validated = validateLogisticsPackPatch(options.body, DEFAULT_LOGISTICS_PACK_CONFIG); if (!validated.ok) throw new ValidationError(validated.error); const now = options.now ?? new Date(); const pack = await requirePack(options.missionId, options.actor, now); const { expectedUpdatedAt, confirmSchedule, ...fields } = validated.patch; const data = { ...fields } as Record<string, unknown>; if (confirmSchedule) { const context = await loadMissionContext(options.missionId); data.scheduleFingerprint = logisticsScheduleFingerprint(context.startsAt, context.endsAt); data.travelFingerprint = logisticsTravelFingerprint(context.travelPlannedDepartureAt); data.confirmedAt = now.toISOString(); data.confirmedByUserId = options.actor.userId; } await updateLogisticsPack({ logisticsPackId: pack.id, expectedUpdatedAt: expectedUpdatedAt as string | null | undefined, data, actorUserId: options.actor.userId }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function upsertItem(options: { missionId: string; actor: AuthenticatedActor; itemId?: string | null; body: unknown }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const validated = validateLogisticsItemUpsert(options.body, DEFAULT_LOGISTICS_PACK_CONFIG); if (!validated.ok) throw new ValidationError(validated.error); const pack = await requirePack(options.missionId, options.actor); if (options.itemId && !pack.items.some((item) => item.id === options.itemId)) throw new NotFoundError("Logistics item not found on this pack."); const { expectedUpdatedAt, ...data } = validated.patch; await upsertLogisticsItem({ logisticsPackId: pack.id, itemId: options.itemId, data: data as Parameters<typeof upsertLogisticsItem>[0]["data"], expectedUpdatedAt: expectedUpdatedAt as string | null | undefined, actorUserId: options.actor.userId }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function reorderItems(options: { missionId: string; actor: AuthenticatedActor; body: unknown }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const validated = validateItemReorder(options.body, DEFAULT_LOGISTICS_PACK_CONFIG.maxItems); if (!validated.ok) throw new ValidationError(validated.error); const pack = await findLogisticsPackByMissionId(options.missionId); if (!pack) throw new NotFoundError("Logistics pack not found."); const patch = validated.patch as { orderedItemIds: string[]; expectedUpdatedAt?: string | null }; await reorderLogisticsItems({ logisticsPackId: pack.id, ...patch, actorUserId: options.actor.userId }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function removeItem(options: { missionId: string; actor: AuthenticatedActor; itemId: string; body: unknown }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const pack = await findLogisticsPackByMissionId(options.missionId); if (!pack) throw new NotFoundError("Logistics pack not found."); const body = options.body && typeof options.body === "object" ? options.body as { expectedUpdatedAt?: string } : {}; await deleteLogisticsItem({ logisticsPackId: pack.id, itemId: options.itemId, expectedUpdatedAt: body.expectedUpdatedAt, actorUserId: options.actor.userId }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function upsertHandoff(options: { missionId: string; actor: AuthenticatedActor; handoffId?: string | null; body: unknown }): Promise<MissionLogisticsWorkspaceView> { assertLeadership(options.actor); const validated = validateLogisticsHandoffUpsert(options.body, DEFAULT_LOGISTICS_PACK_CONFIG); if (!validated.ok) throw new ValidationError(validated.error); const pack = await requirePack(options.missionId, options.actor); if (options.handoffId && !pack.handoffs.some((handoff) => handoff.id === options.handoffId)) throw new NotFoundError("Logistics handoff not found on this pack."); const { expectedUpdatedAt, ...data } = validated.patch; if (typeof data.logisticsItemId === "string" && !pack.items.some((item) => item.id === data.logisticsItemId)) throw new NotFoundError("Logistics handoff item not found on this pack."); await upsertLogisticsHandoff({ logisticsPackId: pack.id, handoffId: options.handoffId, data, expectedUpdatedAt: expectedUpdatedAt as string | null | undefined, actorUserId: options.actor.userId }); return getMissionLogisticsWorkspace(options.missionId, options.actor); }
export async function acknowledgeIssue(options: { missionId: string; actor: AuthenticatedActor; body: unknown; now?: Date }): Promise<MissionLogisticsWorkspaceView & { ackCreated: boolean }> { assertLeadership(options.actor); const validated = validateLogisticsAcknowledgement(options.body); if (!validated.ok) throw new ValidationError(validated.error); const pack = await requirePack(options.missionId, options.actor, options.now); const acknowledgement = validated.patch as { issueKey: string; issueType: Parameters<typeof upsertLogisticsAcknowledgement>[0]["issueType"]; title: string; disposition: Parameters<typeof upsertLogisticsAcknowledgement>[0]["disposition"]; note: string | null; acceptedRiskReason: string | null }; const result = await upsertLogisticsAcknowledgement({ logisticsPackId: pack.id, ...acknowledgement, actorUserId: options.actor.userId, now: options.now ?? new Date() }); return { ...(await getMissionLogisticsWorkspace(options.missionId, options.actor)), ackCreated: result.created }; }
export async function getDayLogisticsBoard(options: { dateKey?: string; actor: AuthenticatedActor; now?: Date }): Promise<DayLogisticsBoardView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const timezone = getPublicAppConfig().campaignTimezone;
  const dateKey = options.dateKey ?? campaignDateKey(now, timezone);
  const ranged = assertLogisticsDateInRange(dateKey, now, timezone);
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
  const contexts: LogisticsMissionContext[] = day.map((m) => ({
    missionId: m.missionId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    timezone: m.timezone,
    locationLabel: m.locationLabel,
    campaignDateKey: dateKey,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    isCancelled: m.operationalStatus === "CANCELLED",
    materialsIndicated: m.preparation.materialsNeeded.length > 0,
    travelPlannedDepartureAt:
      m.missionTravelPlan?.plannedDepartureAt ?? null,
  }));
  return buildDayLogisticsBoardView({
    campaignDate: dateKey,
    now,
    campaignTimezone: timezone,
    missions: contexts,
    packsByMissionId: await findLogisticsPacksByMissionIds(
      contexts.map((context) => context.missionId),
    ),
  });
}
