import {
  labelMissionLifecyclePhase,
  labelMissionOperationalStatus,
} from "@/lib/missions/v21/labels";
import type {
  CampaignMission,
  MissionLifecyclePhase,
  MissionOperationalStatus,
} from "@/lib/missions/v21/types";

/**
 * Homepage / detail view model for V2.1 CampaignMission.
 * Built from persisted + recomputed phase — never invents intelligence.
 *
 * NOTE: This is not the legacy MissionCard type (src/lib/missions/mission-card.ts).
 * Operational status here is MissionOperationalStatus, not MissionStatus.
 */
export type MissionHomeReadinessState = "READY" | "NEEDS_ATTENTION" | "DRAFT";

export type MissionHomeReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export type MissionHomeIntelligenceSection = {
  title: string;
  items: string[];
};

export type MissionHomePrimaryAction = {
  label: string;
  href: string;
  available: boolean;
  forthcomingNote: string | null;
};

export type MissionHomeViewModel = {
  missionId: string;
  eventId: string;
  eventNumber: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  whenLabel: string;
  locationLabel: string | null;
  lifecyclePhase: MissionLifecyclePhase;
  lifecyclePhaseLabel: string;
  /** V2.1 operational status — not legacy Mission Card status. */
  operationalStatus: MissionOperationalStatus;
  operationalStatusLabel: string;
  objective: string | null;
  successCriteria: string[];
  readiness: {
    state: MissionHomeReadinessState;
    label: string;
    checks: MissionHomeReadinessCheck[];
  };
  intelligence: {
    hasAny: boolean;
    sections: MissionHomeIntelligenceSection[];
  };
  primaryAction: MissionHomePrimaryAction;
  detailHref: string;
  projectionVersion: string;
  projectedAt: string;
  operatorOwnedFields: string[];
  isDraft: boolean;
  travelRequired: boolean;
};

export type TodaysMissionSelectionReason =
  | "EXECUTING_NOW"
  | "TRAVEL_WINDOW"
  | "DEBRIEF_DUE"
  | "FOLLOW_UP_DUE"
  | "PREPARING_TODAY"
  | "NEXT_UPCOMING"
  | "NO_MISSION";

export type TodaysMissionResult =
  | {
      state: "ACTIVE";
      primaryMission: MissionHomeViewModel;
      nextMission: MissionHomeViewModel | null;
      selectionReason: Exclude<TodaysMissionSelectionReason, "NO_MISSION">;
      campaignDayLabel: string;
      timezone: string;
    }
  | {
      state: "EMPTY";
      primaryMission: null;
      nextMission: MissionHomeViewModel | null;
      selectionReason: "NO_MISSION";
      campaignDayLabel: string;
      timezone: string;
    };

function formatWhenLabel(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
}

function locationLabel(mission: CampaignMission): string | null {
  const parts = [
    mission.intelligence.venueName,
    mission.intelligence.city,
    mission.intelligence.county
      ? `${mission.intelligence.county} County`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function readinessFromMission(mission: CampaignMission, travelRequired: boolean) {
  const checks: MissionHomeReadinessCheck[] = [
    {
      id: "objective",
      label: "Objective available",
      ok: Boolean(mission.objective),
    },
    {
      id: "successCriteria",
      label: "Success criteria available",
      ok: mission.successCriteria.length > 0,
    },
    {
      id: "time",
      label: "Time available",
      ok: Boolean(mission.startsAt && mission.endsAt),
    },
    {
      id: "location",
      label: "Location available",
      ok: Boolean(
        mission.intelligence.city ||
          mission.intelligence.county ||
          mission.intelligence.venueName,
      ),
    },
    {
      id: "travel",
      label: "Travel requirement known",
      ok: true,
    },
    {
      id: "peopleOrgs",
      label: "People or organizations known",
      ok: Boolean(
        mission.intelligence.organizations.length ||
          mission.intelligence.churches.length ||
          mission.intelligence.businesses.length ||
          mission.intelligence.officials.length ||
          mission.intelligence.media.length ||
          mission.intelligence.schools.length,
      ),
    },
  ];

  // travel check is always "known" once we loaded the Event travel flag
  void travelRequired;

  const missing = checks.filter((c) => !c.ok).length;
  const isDraft = mission.missionStatus === "DRAFT";
  let state: MissionHomeReadinessState;
  let label: string;
  if (isDraft || !mission.objective) {
    state = "DRAFT";
    label = "Draft — incomplete mission information";
  } else if (missing > 0) {
    state = "NEEDS_ATTENTION";
    label = `Needs attention — ${missing} gap${missing === 1 ? "" : "s"}`;
  } else {
    state = "READY";
    label = "Ready to operate";
  }

  return { state, label, checks };
}

function intelligenceSections(
  mission: CampaignMission,
  travelRequired: boolean,
): MissionHomeIntelligenceSection[] {
  const sections: MissionHomeIntelligenceSection[] = [];
  const geo = [
    mission.intelligence.city,
    mission.intelligence.county
      ? `${mission.intelligence.county} County`
      : null,
    mission.intelligence.region,
  ].filter((v): v is string => Boolean(v));
  if (geo.length) sections.push({ title: "Geography", items: geo });

  const orgs = [
    ...mission.intelligence.organizations,
    ...mission.intelligence.churches,
    ...mission.intelligence.businesses,
    ...mission.intelligence.schools,
  ];
  if (orgs.length) sections.push({ title: "Organizations", items: orgs });

  const people = [
    ...mission.intelligence.officials,
    ...mission.intelligence.media,
    ...mission.intelligence.press,
  ];
  if (people.length) sections.push({ title: "People", items: people });

  const signals: string[] = [];
  if (mission.intelligence.targetVoters.length) {
    signals.push(...mission.intelligence.targetVoters.map((t) => `Audience: ${t}`));
  }
  if (mission.intelligence.fundraisingNotes) {
    signals.push(mission.intelligence.fundraisingNotes);
  }
  if (mission.intelligence.volunteerNotes) {
    signals.push(mission.intelligence.volunteerNotes);
  }
  if (signals.length) sections.push({ title: "Objective signals", items: signals });

  if (mission.intelligence.eventType) {
    sections.push({
      title: "Event type",
      items: [
        mission.intelligence.eventSubtype
          ? `${mission.intelligence.eventType} · ${mission.intelligence.eventSubtype}`
          : mission.intelligence.eventType,
      ],
    });
  }

  sections.push({
    title: "Travel requirement",
    items: [travelRequired ? "Travel required" : "No travel required"],
  });

  return sections;
}

/**
 * Phase CTAs. Prepare Mode is real at /prepare; other phases remain forthcoming
 * placeholders via ?mode= (honest notes, not fake controls).
 */
export function primaryActionForPhase(
  missionId: string,
  phase: MissionLifecyclePhase,
): MissionHomePrimaryAction {
  const detail = `/system/missions/${missionId}`;
  switch (phase) {
    case "PREPARE":
      return {
        label: "Open Mission Brief",
        href: `${detail}/prepare`,
        available: true,
        forthcomingNote: null,
      };
    case "TRAVEL":
      return {
        label: "Begin Travel Mode",
        href: `${detail}?mode=travel`,
        available: true,
        forthcomingNote:
          "Travel Mode is forthcoming — this opens the mission record.",
      };
    case "EXECUTE":
      return {
        label: "Open Execute Mode",
        href: `${detail}?mode=execute`,
        available: true,
        forthcomingNote:
          "Execute Mode is forthcoming — this opens the mission record.",
      };
    case "DEBRIEF":
      return {
        label: "Start Debrief",
        href: `${detail}?mode=debrief`,
        available: true,
        forthcomingNote:
          "Debrief capture is forthcoming — this opens the mission record.",
      };
    case "FOLLOW_UP":
      return {
        label: "Review Follow-ups",
        href: `${detail}?mode=follow-up`,
        available: true,
        forthcomingNote:
          "Follow-up task generation ships later — this opens the mission record.",
      };
    case "COMPLETE":
    default:
      return {
        label: "Review Mission Record",
        href: detail,
        available: true,
        forthcomingNote: null,
      };
  }
}

export function toMissionHomeViewModel(input: {
  mission: CampaignMission;
  /** Recomputed lifecycle for "now" — may differ from persisted row. */
  lifecyclePhase: MissionLifecyclePhase;
  travelRequired: boolean;
  campaignTimezone?: string;
}): MissionHomeViewModel {
  const { mission, lifecyclePhase, travelRequired } = input;
  if (!mission.id) {
    throw new Error("MissionHomeViewModel requires a persisted mission id.");
  }
  const timezone = input.campaignTimezone || mission.timezone || "America/Chicago";
  const readiness = readinessFromMission(mission, travelRequired);
  const sections = intelligenceSections(mission, travelRequired);
  // Stored/known fields only. Travel flag is Event-derived, not invented politics.
  const hasAny = sections.some((s) => s.items.length > 0);

  return {
    missionId: mission.id,
    eventId: mission.sourceEventId,
    eventNumber: mission.sourceEventNumber,
    title: mission.attendTitle,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
    timezone,
    whenLabel: formatWhenLabel(mission.startsAt, mission.endsAt, timezone),
    locationLabel: locationLabel(mission),
    lifecyclePhase,
    lifecyclePhaseLabel: labelMissionLifecyclePhase(lifecyclePhase),
    operationalStatus: mission.missionStatus,
    operationalStatusLabel: labelMissionOperationalStatus(mission.missionStatus),
    objective: mission.objective,
    successCriteria: mission.successCriteria.map((c) => c.text),
    readiness,
    intelligence: { hasAny, sections },
    primaryAction: primaryActionForPhase(mission.id, lifecyclePhase),
    detailHref: `/system/missions/${mission.id}`,
    projectionVersion: mission.projectionVersion,
    projectedAt: mission.projectedAt,
    operatorOwnedFields: mission.operatorOwnedFields,
    isDraft: mission.missionStatus === "DRAFT",
    travelRequired,
  };
}
