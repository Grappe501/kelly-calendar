import { projectEventToMission } from "@/lib/missions/v21/project-event-to-mission";
import type {
  CampaignMission,
  EventMissionSource,
  LegacyEventSnapshot,
  MissionProjectionComparison,
} from "@/lib/missions/v21/types";

function summarize(value: unknown): string {
  if (value == null) return "UNKNOWN";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.length} item(s)]`;
  }
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

export function toLegacyEventSnapshot(
  source: EventMissionSource,
): LegacyEventSnapshot {
  const primary =
    source.objectives.find((o) => o.isPrimary) ?? source.objectives[0] ?? null;
  return {
    eventId: source.id,
    eventNumber: source.eventNumber,
    version: source.version,
    campaignDisplayTitle: source.campaignDisplayTitle,
    internalTitle: source.internalTitle,
    status: source.status,
    priority: source.priority,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    timezone: source.timezone,
    city: source.city,
    countyName: source.countyName,
    regionName: source.regionName,
    eventType: source.eventType,
    objectivesCount: source.objectives.length,
    primaryObjective: primary?.description ?? primary?.desiredOutcome ?? null,
    successDefinition: primary?.successDefinition ?? null,
  };
}

/**
 * Explicit Event ↔ Mission comparison for operator review.
 * Projection remains the single source of truth for mapped fields.
 */
export function compareLegacyEventToMission(
  source: EventMissionSource,
  mission?: CampaignMission,
  options?: { now?: Date },
): MissionProjectionComparison {
  const projected =
    mission ?? projectEventToMission(source, { now: options?.now });
  const legacyEvent = toLegacyEventSnapshot(source);

  const fieldMap: MissionProjectionComparison["fieldMap"] = [
    {
      missionField: "attendTitle",
      legacySource: "campaignDisplayTitle|internalTitle",
      valueSummary: summarize(projected.attendTitle),
      status: "MAPPED",
    },
    {
      missionField: "objective",
      legacySource: "EventObjective.description|desiredOutcome|objectiveType",
      valueSummary: summarize(projected.objective),
      status: projected.objective ? "MAPPED" : "UNKNOWN",
    },
    {
      missionField: "successCriteria",
      legacySource: "EventObjective.successDefinition|desiredOutcome",
      valueSummary: summarize(projected.successCriteria.map((c) => c.text)),
      status: projected.successCriteria.length ? "MAPPED" : "UNKNOWN",
    },
    {
      missionField: "missionStatus",
      legacySource: "Event.status + objective completeness",
      valueSummary: summarize(projected.missionStatus),
      status: "MAPPED",
    },
    {
      missionField: "lifecyclePhase",
      legacySource: "startsAt/endsAt + travelRequired + outcome/followups",
      valueSummary: summarize(projected.lifecyclePhase),
      status: "MAPPED",
    },
    {
      missionField: "intelligence.county",
      legacySource: "ArkansasCounty.name via Event.countyId",
      valueSummary: summarize(projected.intelligence.county),
      status: projected.intelligence.county ? "MAPPED" : "UNKNOWN",
    },
    {
      missionField: "intelligence.city",
      legacySource: "Event.city",
      valueSummary: summarize(projected.intelligence.city),
      status: projected.intelligence.city ? "MAPPED" : "UNKNOWN",
    },
    {
      missionField: "intelligence.priority",
      legacySource: "Event.priority",
      valueSummary: summarize(projected.intelligence.priority),
      status: projected.intelligence.priority ? "MAPPED" : "DEFAULT",
    },
    {
      missionField: "intelligence.eventType",
      legacySource: "Event.eventType (copied, not reclassified)",
      valueSummary: summarize(projected.intelligence.eventType),
      status: projected.intelligence.eventType ? "MAPPED" : "UNKNOWN",
    },
    {
      missionField: "intelligence.expectedRoi",
      legacySource: "(none — never invented)",
      valueSummary: "UNKNOWN",
      status: "UNKNOWN",
    },
    {
      missionField: "startsAt/endsAt",
      legacySource: "Event.startsAt / Event.endsAt (unchanged)",
      valueSummary: `${projected.startsAt} → ${projected.endsAt}`,
      status: "MAPPED",
    },
  ];

  return { legacyEvent, mission: projected, fieldMap };
}
