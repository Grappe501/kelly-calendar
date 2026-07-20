import { MISSION_PROJECTION_VERSION } from "@/lib/missions/v21/constants";
import type {
  CampaignMission,
  EventMissionSource,
  MissionCompleteness,
  MissionFieldSource,
  MissionIntelligence,
  MissionLifecyclePhase,
  MissionOperationalStatus,
  MissionSuccessCriterion,
} from "@/lib/missions/v21/types";

function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitCriteria(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|;|•|·|(?:^|\s)[-*]\s+/)
    .map((part) => part.replace(/^[\d.)\s]+/, "").trim())
    .filter((part) => part.length > 0);
}

function classifyOrgBucket(
  organizationType: string | null,
): keyof Pick<
  MissionIntelligence,
  "organizations" | "churches" | "businesses" | "media" | "schools"
> {
  const t = (organizationType || "").toLowerCase();
  if (t.includes("church") || t.includes("faith") || t.includes("mosque")) {
    return "churches";
  }
  if (t.includes("business") || t.includes("chamber") || t.includes("company")) {
    return "businesses";
  }
  if (t.includes("media") || t.includes("press") || t.includes("news")) {
    return "media";
  }
  if (t.includes("school") || t.includes("university") || t.includes("college")) {
    return "schools";
  }
  return "organizations";
}

function pickObjective(source: EventMissionSource) {
  if (!source.objectives.length) return null;
  return (
    source.objectives.find((o) => o.isPrimary) ??
    source.objectives[0] ??
    null
  );
}

function projectObjective(source: EventMissionSource): {
  objective: string | null;
  objectiveSource: MissionFieldSource;
  successCriteria: MissionSuccessCriterion[];
  targetVoters: string[];
} {
  const primary = pickObjective(source);
  if (!primary) {
    return {
      objective: null,
      objectiveSource: "UNKNOWN",
      successCriteria: [],
      targetVoters: [],
    };
  }

  const objective =
    cleanText(primary.description) ||
    cleanText(primary.desiredOutcome) ||
    cleanText(primary.objectiveType.replace(/_/g, " ").toLowerCase());

  const criteriaTexts = splitCriteria(primary.successDefinition);
  if (criteriaTexts.length === 0) {
    const desired = cleanText(primary.desiredOutcome);
    if (desired && desired !== objective) criteriaTexts.push(desired);
  }

  const target = cleanText(primary.targetAudience);

  return {
    objective,
    objectiveSource: objective ? "OBJECTIVE" : "UNKNOWN",
    successCriteria: criteriaTexts.map((text) => ({
      text,
      source: "OBJECTIVE" as const,
    })),
    targetVoters: target ? [target] : [],
  };
}

/**
 * Map EventStatus → mission operational status.
 * Incomplete planning states become DRAFT (valid). Never invents readiness.
 */
export function projectMissionStatus(
  eventStatus: string,
  hasObjective: boolean,
  hasSuccessCriteria: boolean,
): MissionOperationalStatus {
  const status = eventStatus.toUpperCase();
  if (status === "CANCELLED" || status === "DECLINED") return "CANCELLED";
  if (status === "ARCHIVED") return "ARCHIVED";
  if (status === "COMPLETED") return "COMPLETE";
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  if (
    status === "DRAFT" ||
    status === "REQUESTED" ||
    status === "TENTATIVE" ||
    status === "HOLD" ||
    status === "UNDER_REVIEW" ||
    status === "POSTPONED"
  ) {
    return "DRAFT";
  }
  if (status === "APPROVED" || status === "CONFIRMED") {
    if (hasObjective && hasSuccessCriteria) return "READY";
    return "PREPARING";
  }
  return "DRAFT";
}

/**
 * Lifecycle phase from time + outcome/follow-up signals.
 * Travel is only selected when travel is required and leave window is open
 * (before start); never depends on Google Routes.
 */
export function projectLifecyclePhase(input: {
  eventStatus: string;
  startsAt: string;
  endsAt: string;
  travelRequired: boolean;
  hasOutcome: boolean;
  followupCount: number;
  now?: Date;
}): MissionLifecyclePhase {
  const status = input.eventStatus.toUpperCase();
  if (status === "COMPLETED" || status === "ARCHIVED") return "COMPLETE";
  if (status === "CANCELLED" || status === "DECLINED") return "COMPLETE";

  const now = input.now ?? new Date();
  const start = new Date(input.startsAt).getTime();
  const end = new Date(input.endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return "PREPARE";

  const t = now.getTime();
  if (t < start) {
    if (input.travelRequired) {
      const leaveHintMs = 90 * 60_000;
      if (start - t <= leaveHintMs) return "TRAVEL";
    }
    return "PREPARE";
  }
  if (t >= start && t <= end) return "EXECUTE";
  if (!input.hasOutcome) return "DEBRIEF";
  if (input.followupCount > 0) return "FOLLOW_UP";
  return "FOLLOW_UP";
}

function buildIntelligence(
  source: EventMissionSource,
  targetVoters: string[],
): MissionIntelligence {
  const intelligence: MissionIntelligence = {
    county: cleanText(source.countyName),
    city: cleanText(source.city),
    region: cleanText(source.regionName),
    organizations: [],
    churches: [],
    businesses: [],
    officials: [],
    media: [],
    schools: [],
    targetVoters,
    issues: [],
    fundraisingNotes: null,
    volunteerNotes: null,
    petitions: [],
    press: [],
    opposition: [],
    priority: cleanText(source.priority),
    expectedRoi: null,
    expectedAttendance: source.expectedAttendance,
    eventType: cleanText(source.eventType),
    eventSubtype: cleanText(source.eventSubtype),
    candidateRole: cleanText(source.candidateRole),
    venueName: cleanText(source.venueName),
  };

  for (const org of source.organizations) {
    const name = cleanText(org.name);
    if (!name) continue;
    intelligence[classifyOrgBucket(org.organizationType)].push(name);
  }

  for (const person of source.people) {
    const name = cleanText(person.displayName);
    if (!name) continue;
    const role = person.role.toUpperCase();
    if (role === "ELECTED_OFFICIAL") intelligence.officials.push(name);
    else if (role === "MEDIA") {
      intelligence.media.push(name);
      intelligence.press.push(name);
    } else if (role === "VOLUNTEER") {
      intelligence.volunteerNotes = intelligence.volunteerNotes
        ? `${intelligence.volunteerNotes}; ${name}`
        : `Linked volunteer: ${name}`;
    } else if (role === "DONOR") {
      intelligence.fundraisingNotes = intelligence.fundraisingNotes
        ? `${intelligence.fundraisingNotes}; ${name}`
        : `Linked donor: ${name}`;
    }
  }

  for (const objective of source.objectives) {
    if (objective.objectiveType === "RAISE_MONEY") {
      const note =
        cleanText(objective.description) ||
        cleanText(objective.desiredOutcome);
      if (note) {
        intelligence.fundraisingNotes = intelligence.fundraisingNotes
          ? `${intelligence.fundraisingNotes}; ${note}`
          : note;
      }
    }
    if (objective.objectiveType === "RECRUIT_VOLUNTEERS") {
      const note =
        cleanText(objective.description) ||
        cleanText(objective.desiredOutcome);
      if (note) {
        intelligence.volunteerNotes = intelligence.volunteerNotes
          ? `${intelligence.volunteerNotes}; ${note}`
          : note;
      }
    }
  }

  return intelligence;
}

function completenessOf(
  mission: Pick<
    CampaignMission,
    "objective" | "successCriteria" | "intelligence"
  >,
): MissionCompleteness {
  const unknownFields: string[] = [];
  const hasObjective = Boolean(mission.objective);
  const hasSuccessCriteria = mission.successCriteria.length > 0;
  const hasGeography = Boolean(
    mission.intelligence.county ||
      mission.intelligence.city ||
      mission.intelligence.region,
  );
  const hasIntelligenceSignal = Boolean(
    hasGeography ||
      mission.intelligence.organizations.length ||
      mission.intelligence.churches.length ||
      mission.intelligence.businesses.length ||
      mission.intelligence.officials.length ||
      mission.intelligence.media.length ||
      mission.intelligence.schools.length ||
      mission.intelligence.targetVoters.length ||
      mission.intelligence.fundraisingNotes ||
      mission.intelligence.volunteerNotes,
  );

  if (!hasObjective) unknownFields.push("objective");
  if (!hasSuccessCriteria) unknownFields.push("successCriteria");
  if (!hasGeography) unknownFields.push("geography");
  if (mission.intelligence.expectedRoi == null) unknownFields.push("expectedRoi");
  if (!mission.intelligence.issues.length) unknownFields.push("issues");
  if (!mission.intelligence.opposition.length) unknownFields.push("opposition");

  return {
    hasObjective,
    hasSuccessCriteria,
    hasGeography,
    hasIntelligenceSignal,
    isDraftValid: true,
    unknownFields,
  };
}

/**
 * Deterministic Event → Mission projection.
 * Incomplete events become valid DRAFT missions — never failures.
 * Does not reclassify campaign event types into invented mission categories.
 */
export function projectEventToMission(
  source: EventMissionSource,
  options?: { now?: Date; projectedAt?: Date; missionId?: string | null },
): CampaignMission {
  const attendTitle =
    cleanText(source.campaignDisplayTitle) ||
    cleanText(source.internalTitle) ||
    `Untitled mission (${source.eventNumber})`;

  const {
    objective,
    objectiveSource,
    successCriteria,
    targetVoters,
  } = projectObjective(source);

  const missionStatus = projectMissionStatus(
    source.status,
    Boolean(objective),
    successCriteria.length > 0,
  );
  const lifecyclePhase = projectLifecyclePhase({
    eventStatus: source.status,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    travelRequired: source.travelRequired,
    hasOutcome: source.hasOutcome,
    followupCount: source.followupCount,
    now: options?.now,
  });

  const intelligence = buildIntelligence(source, targetVoters);
  const projectedAt = (options?.projectedAt ?? new Date()).toISOString();

  const draft: CampaignMission = {
    id: options?.missionId ?? null,
    sourceEventId: source.id,
    sourceEventNumber: source.eventNumber,
    sourceEventVersion: source.version,
    projectionVersion: MISSION_PROJECTION_VERSION,
    attendTitle,
    objective,
    objectiveSource,
    successCriteria,
    missionStatus,
    lifecyclePhase,
    intelligence,
    completeness: {
      hasObjective: false,
      hasSuccessCriteria: false,
      hasGeography: false,
      hasIntelligenceSignal: false,
      isDraftValid: true,
      unknownFields: [],
    },
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    timezone: source.timezone || "America/Chicago",
    operatorOwnedFields: [],
    projectedAt,
  };

  draft.completeness = completenessOf(draft);
  return draft;
}
