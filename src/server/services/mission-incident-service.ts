import "server-only";
import {
  assertIncidentDateInRange,
  buildDayIncidentBoardView,
  buildIncidentDetailView,
  buildMissionIncidentsWorkspaceView,
  DEFAULT_INCIDENT_LOG_CONFIG,
  redactIncidentForViewer,
  validateIncidentAcknowledgement,
  validateIncidentArchive,
  validateIncidentCarryForward,
  validateIncidentCreate,
  validateIncidentLinkFollowUp,
  validateIncidentPatch,
  validateIncidentUpdateAppend,
  type DayIncidentBoardView,
  type IncidentMissionContext,
  type MissionIncidentDetailView,
  type MissionIncidentWorkspaceView,
} from "@/lib/missions/v21/incident-log";
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
import { findCloseoutByDateKey } from "@/server/repositories/campaign-day-closeout-repository";
import {
  appendUpdate,
  archiveIncident as archiveIncidentRow,
  createIncident,
  findIncidentById,
  findIncidentsByCampaignDateKey,
  findIncidentsByMissionId,
  updateIncident,
  upsertAcknowledgement,
} from "@/server/repositories/mission-incident-repository";

function assertLeadership(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Mission Incident Log requires campaign leadership access.",
    );
  }
}

async function loadMissionContext(
  missionId: string,
): Promise<IncidentMissionContext> {
  const { prisma } = await import("@/server/db/prisma");
  const mission = await prisma.campaignMission.findUnique({
    where: { id: missionId },
    include: {
      execution: { select: { executionStatus: true } },
      sourceEvent: { select: { status: true } },
    },
  });
  if (!mission) throw new NotFoundError("Mission not found.");
  const timezone = mission.timezone || getPublicAppConfig().campaignTimezone;
  const dateKey = campaignDateKey(mission.startsAt, timezone);
  const closeout = await findCloseoutByDateKey(dateKey);
  return {
    missionId: mission.id,
    title: mission.attendTitle,
    startsAt: mission.startsAt.toISOString(),
    endsAt: mission.endsAt.toISOString(),
    timezone,
    campaignDateKey: dateKey,
    lifecyclePhase: mission.lifecyclePhase,
    operationalStatus: mission.missionStatus,
    executionStatus: mission.execution?.executionStatus ?? null,
    isCancelled:
      mission.sourceEvent.status === "CANCELLED" ||
      mission.missionStatus === "CANCELLED",
    closeoutReviewedAt: closeout?.reviewedAt ?? null,
  };
}

function redactDetailForActor(
  view: MissionIncidentDetailView,
  actor: AuthenticatedActor,
): MissionIncidentDetailView {
  const redacted = redactIncidentForViewer(
    {
      ...view.incident,
      updates: view.updates,
    },
    actor.primarySystemRole,
  );
  return {
    ...view,
    incident: {
      ...view.incident,
      ...redacted,
      updates: redacted.updates ?? view.updates,
    },
    updates: redacted.updates ?? view.updates,
  };
}

export async function getMissionIncidentsWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionIncidentWorkspaceView> {
  assertLeadership(actor);
  const context = await loadMissionContext(missionId);
  const incidents = await findIncidentsByMissionId(missionId);
  return buildMissionIncidentsWorkspaceView({ context, incidents });
}

export async function getIncidentDetail(
  incidentId: string,
  actor: AuthenticatedActor,
): Promise<MissionIncidentDetailView> {
  assertLeadership(actor);
  const incident = await findIncidentById(incidentId);
  if (!incident) throw new NotFoundError("Mission incident not found.");
  const context = await loadMissionContext(incident.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    actor,
  );
}

export async function createMissionIncident(options: {
  missionId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentCreate(
    options.body,
    DEFAULT_INCIDENT_LOG_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);
  const now = options.now ?? new Date();
  const context = await loadMissionContext(options.missionId);
  const incident = await createIncident({
    missionId: context.missionId,
    campaignDateKey: context.campaignDateKey,
    data: validated.patch,
    actorUserId: options.actor.userId,
    now,
  });
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function patchMissionIncident(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentPatch(
    options.body,
    DEFAULT_INCIDENT_LOG_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const { expectedUpdatedAt, ...data } = validated.patch;
  const now = options.now ?? new Date();
  const incident = await updateIncident({
    incidentId: existing.id,
    expectedUpdatedAt: expectedUpdatedAt as string | null | undefined,
    data,
    actorUserId: options.actor.userId,
    now,
  });
  const context = await loadMissionContext(existing.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function appendIncidentUpdate(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentUpdateAppend(
    options.body,
    DEFAULT_INCIDENT_LOG_CONFIG,
  );
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const now = options.now ?? new Date();
  const { expectedUpdatedAt, ...patch } = validated.patch;
  const incident = await appendUpdate({
    incidentId: existing.id,
    expectedUpdatedAt: expectedUpdatedAt as string | null | undefined,
    updateType: patch.updateType as Parameters<typeof appendUpdate>[0]["updateType"],
    note: (patch.note as string | null) ?? null,
    actionTaken: (patch.actionTaken as string | null) ?? null,
    occurredAt: patch.occurredAt as string,
    sensitivity: patch.sensitivity as string | undefined,
    actorUserId: options.actor.userId,
    now,
  });
  const context = await loadMissionContext(existing.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function acknowledgeIncidentIssue(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView & { ackCreated: boolean }> {
  assertLeadership(options.actor);
  const validated = validateIncidentAcknowledgement(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const now = options.now ?? new Date();
  const acknowledgement = validated.patch as {
    issueKey: string;
    issueType: Parameters<typeof upsertAcknowledgement>[0]["issueType"];
    title: string;
    disposition: Parameters<typeof upsertAcknowledgement>[0]["disposition"];
    note: string | null;
    acceptedRiskReason: string | null;
  };
  const result = await upsertAcknowledgement({
    incidentId: existing.id,
    ...acknowledgement,
    actorUserId: options.actor.userId,
    now,
  });
  if (!result.incident) throw new NotFoundError("Mission incident not found.");
  const context = await loadMissionContext(existing.missionId);
  return {
    ...redactDetailForActor(
      buildIncidentDetailView({ context, incident: result.incident }),
      options.actor,
    ),
    ackCreated: result.created,
  };
}

export async function archiveMissionIncident(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentArchive(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const now = options.now ?? new Date();
  const incident = await archiveIncidentRow({
    incidentId: existing.id,
    expectedUpdatedAt: validated.patch.expectedUpdatedAt as
      | string
      | null
      | undefined,
    actorUserId: options.actor.userId,
    now,
  });
  const context = await loadMissionContext(existing.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function markCarryForward(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentCarryForward(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const now = options.now ?? new Date();
  const data: Record<string, unknown> = {};
  if (validated.patch.markRequired) data.carryForwardRequired = true;
  if (validated.patch.markCarried) {
    data.carriedForwardAt = now.toISOString();
    data.carriedForwardByUserId = options.actor.userId;
    data.carryForwardRequired = true;
  }
  const incident = await updateIncident({
    incidentId: existing.id,
    expectedUpdatedAt: validated.patch.expectedUpdatedAt as
      | string
      | null
      | undefined,
    data,
    actorUserId: options.actor.userId,
    now,
  });
  const context = await loadMissionContext(existing.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function linkFollowUpAction(options: {
  incidentId: string;
  actor: AuthenticatedActor;
  body: unknown;
  now?: Date;
}): Promise<MissionIncidentDetailView> {
  assertLeadership(options.actor);
  const validated = validateIncidentLinkFollowUp(options.body);
  if (!validated.ok) throw new ValidationError(validated.error);
  const existing = await findIncidentById(options.incidentId);
  if (!existing) throw new NotFoundError("Mission incident not found.");
  const now = options.now ?? new Date();
  const incident = await updateIncident({
    incidentId: existing.id,
    expectedUpdatedAt: validated.patch.expectedUpdatedAt as
      | string
      | null
      | undefined,
    data: {
      linkedFollowUpActionId: validated.patch.linkedFollowUpActionId,
      linkedFollowUpImportKey: `MISSION_INCIDENT:${existing.id}`,
      followUpRequired: true,
    },
    actorUserId: options.actor.userId,
    now,
  });
  const context = await loadMissionContext(existing.missionId);
  return redactDetailForActor(
    buildIncidentDetailView({ context, incident }),
    options.actor,
  );
}

export async function getDayIncidentBoard(options: {
  dateKey?: string;
  actor: AuthenticatedActor;
  now?: Date;
}): Promise<DayIncidentBoardView> {
  assertLeadership(options.actor);
  const now = options.now ?? new Date();
  const timezone = getPublicAppConfig().campaignTimezone;
  const dateKey = options.dateKey ?? campaignDateKey(now, timezone);
  const ranged = assertIncidentDateInRange(dateKey, now, timezone);
  if (!ranged.ok) throw new ValidationError(ranged.error);
  const { start, end } = campaignDayBounds(dateKey, timezone);
  const closeout = await findCloseoutByDateKey(dateKey);
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

  const contexts: IncidentMissionContext[] = day.map((m) => ({
    missionId: m.missionId,
    title: m.title,
    startsAt: m.startsAt,
    endsAt: m.endsAt,
    timezone: m.timezone,
    campaignDateKey: dateKey,
    lifecyclePhase: m.lifecyclePhase,
    operationalStatus: m.operationalStatus,
    executionStatus: m.execution.status,
    isCancelled: m.operationalStatus === "CANCELLED",
    closeoutReviewedAt: closeout?.reviewedAt ?? null,
  }));

  return buildDayIncidentBoardView({
    campaignDate: dateKey,
    now,
    campaignTimezone: timezone,
    missions: contexts,
    incidents: await findIncidentsByCampaignDateKey(dateKey),
  });
}
