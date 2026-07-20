import "server-only";

import {
  compareLegacyEventToMission,
  projectEventToMission,
  validateCampaignMission,
  type CampaignMission,
  type EventMissionSource,
  type MissionProjectionComparison,
} from "@/lib/missions/v21";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError } from "@/lib/security/safe-error";
import {
  campaignMissionFromRow,
  getCampaignMissionByEventId,
  upsertCampaignMissionFromProjection,
} from "@/server/repositories/mission-repository";

export async function loadEventMissionSource(
  eventId: string,
): Promise<EventMissionSource> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, archivedAt: null },
    include: {
      county: true,
      region: true,
      objectives: true,
      outcomes: true,
      followups: true,
      travelPlans: true,
      eventOrganizations: { include: { organization: true } },
      eventPeople: { include: { person: true } },
    },
  });
  if (!event) throw new NotFoundError("Event not found.");

  return {
    id: event.id,
    eventNumber: event.eventNumber,
    version: event.version,
    internalTitle: event.internalTitle,
    campaignDisplayTitle: event.campaignDisplayTitle,
    eventType: event.eventType,
    eventSubtype: event.eventSubtype,
    status: event.status,
    priority: event.priority,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    city: event.city,
    countyName: event.county?.name ?? null,
    regionName: event.region?.name ?? null,
    venueName: event.venueName,
    expectedAttendance: event.expectedAttendance,
    candidateRole: event.candidateRole,
    objectives: event.objectives.map((o) => ({
      isPrimary: o.isPrimary,
      objectiveType: o.objectiveType,
      description: o.description,
      successDefinition: o.successDefinition,
      targetAudience: o.targetAudience,
      desiredOutcome: o.desiredOutcome,
      priority: o.priority,
    })),
    organizations: event.eventOrganizations.map((eo) => ({
      name: eo.organization.name,
      organizationType: eo.organization.organizationType,
      role: eo.role,
    })),
    people: event.eventPeople.map((ep) => ({
      displayName: ep.person.displayName,
      role: ep.role,
      title: ep.person.title,
    })),
    followupCount: event.followups.length,
    hasOutcome: event.outcomes.length > 0,
    travelRequired: event.travelPlans.some((t) => t.travelRequired),
  };
}

export type EventMissionProjectionResult = {
  comparison: MissionProjectionComparison;
  persisted: CampaignMission | null;
  validation: ReturnType<typeof validateCampaignMission>;
  schedulingUnchanged: true;
};

export async function getEventMissionProjection(
  eventId: string,
  options?: { now?: Date },
): Promise<EventMissionProjectionResult> {
  const source = await loadEventMissionSource(eventId);
  const existing = await getCampaignMissionByEventId(eventId);
  const mission = projectEventToMission(source, {
    now: options?.now,
    missionId: existing?.id ?? null,
  });
  const comparison = compareLegacyEventToMission(source, mission, {
    now: options?.now,
  });
  const validation = validateCampaignMission(mission);
  return {
    comparison,
    persisted: existing ? campaignMissionFromRow(existing) : null,
    validation,
    schedulingUnchanged: true,
  };
}

export async function persistEventMissionProjection(
  eventId: string,
  options?: { now?: Date },
): Promise<{
  mission: CampaignMission;
  comparison: MissionProjectionComparison;
  validation: ReturnType<typeof validateCampaignMission>;
  created: boolean;
}> {
  const source = await loadEventMissionSource(eventId);
  const before = await getCampaignMissionByEventId(eventId);
  const projected = projectEventToMission(source, { now: options?.now });
  const validation = validateCampaignMission(projected);
  if (!validation.ok) {
    throw new ValidationError(
      "Mission projection failed structural validation.",
    );
  }
  const mission = await upsertCampaignMissionFromProjection(projected);
  const comparison = compareLegacyEventToMission(source, mission, {
    now: options?.now,
  });
  return {
    mission,
    comparison,
    validation,
    created: !before,
  };
}
