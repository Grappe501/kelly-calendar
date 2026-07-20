import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type { CampaignDayCloseoutConfig } from "@/lib/missions/v21/day-closeout/closeout-config";
import type {
  CampaignDayScheduleConflict,
  CampaignDayTomorrowMission,
  TomorrowReadinessStatus,
} from "@/lib/missions/v21/day-closeout/types";
import {
  formatCampaignTime,
} from "@/lib/missions/v21/day-closeout/closeout-date";
import { labelPreparationReadiness } from "@/lib/missions/v21/preparation/labels";

function departureOf(m: DayBriefingMissionSnapshot): string | null {
  return (
    m.missionTravelPlan?.plannedDepartureAt ??
    m.eventDepartureAt ??
    m.travelPlan?.departureAt ??
    null
  );
}

export function buildTomorrowMissionItem(
  m: DayBriefingMissionSnapshot,
  timeZone: string,
): CampaignDayTomorrowMission {
  const departure = departureOf(m);
  const gaps: string[] = [];
  if (!m.preparation.exists) gaps.push("No preparation record exists.");
  else if (m.preparation.readiness === "NEEDS_ATTENTION") {
    gaps.push("Preparation is marked Needs Attention.");
  } else if (m.preparation.readiness === "DRAFT") {
    gaps.push("Preparation is still Draft.");
  }
  if (!m.preparation.keyMessage) gaps.push("No key message is available.");
  if (!m.preparation.strategicPurpose) {
    gaps.push("No strategic purpose is available.");
  }
  if (m.travelRequired && !departure) {
    gaps.push("Departure time not set");
  }
  if (m.preparation.materialsNeeded.length === 0 && m.preparation.exists) {
    // materials may genuinely be empty — do not invent incompleteness from empty list alone
  }
  const materialsIncomplete = m.preparation.preparationTasks.some(
    (t) => !t.completed,
  );
  if (materialsIncomplete) gaps.push("Preparation tasks remain incomplete.");
  if (m.preparation.peopleBriefings.length === 0) {
    gaps.push("No people briefing has been entered.");
  }
  if (m.preparation.organizationBriefings.length === 0) {
    gaps.push("No organization briefing has been entered.");
  }

  return {
    missionId: m.missionId,
    title: m.title,
    whenLabel: m.isAllDay
      ? "All day"
      : formatCampaignTime(m.startsAt, timeZone, { includeDate: false }),
    locationLabel: m.locationLabel,
    preparationReadiness: m.preparation.readiness
      ? labelPreparationReadiness(m.preparation.readiness)
      : null,
    strategicPurpose: m.preparation.strategicPurpose,
    keyMessage: m.preparation.keyMessage,
    successCriteria: m.successCriteria,
    arrivalTargetLabel: m.travelPlan?.targetArrivalAt
      ? formatCampaignTime(m.travelPlan.targetArrivalAt, timeZone)
      : m.eventArrivalAt
        ? formatCampaignTime(m.eventArrivalAt, timeZone)
        : null,
    departureLabel: departure
      ? formatCampaignTime(departure, timeZone)
      : null,
    durationMinutes: m.travelPlan?.estimatedDurationMinutes ?? null,
    missingDeparture: Boolean(m.travelRequired && !departure),
    missingKeyMessage: !m.preparation.keyMessage,
    materialsIncomplete,
    peopleBriefMissing: m.preparation.peopleBriefings.length === 0,
    organizationBriefMissing: m.preparation.organizationBriefings.length === 0,
    gaps,
    href: `/system/missions/${m.missionId}/prepare`,
  };
}

export function detectTomorrowConflicts(
  missions: DayBriefingMissionSnapshot[],
): CampaignDayScheduleConflict[] {
  const sorted = [...missions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  const out: CampaignDayScheduleConflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
        out.push({
          id: `overlap:${a.missionId}:${b.missionId}`,
          label: "Schedule review required",
          missionIds: [a.missionId, b.missionId],
          missionTitles: [a.title, b.title],
          explanation: `${a.title} and ${b.title} have overlapping scheduled times.`,
        });
      }
    }
  }
  return out;
}

export function deriveTomorrowReadiness(input: {
  tomorrowMissions: DayBriefingMissionSnapshot[];
  conflicts: CampaignDayScheduleConflict[];
  config: CampaignDayCloseoutConfig;
}): TomorrowReadinessStatus {
  if (input.tomorrowMissions.length === 0) return "NO_MISSIONS_SCHEDULED";

  const first = [...input.tomorrowMissions].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt) || a.missionId.localeCompare(b.missionId),
  )[0];

  const critical: string[] = [];
  const attention: string[] = [];

  if (input.conflicts.length > 0) critical.push("schedule conflict");

  for (const m of input.tomorrowMissions) {
    if (!m.preparation.exists || m.preparation.readiness === "NEEDS_ATTENTION") {
      if (m.missionId === first.missionId) critical.push("first prep");
      else attention.push("prep");
    } else if (m.preparation.readiness === "DRAFT") {
      attention.push("draft");
    }
    if (m.travelRequired && !departureOf(m)) {
      if (
        input.config.requireFirstMissionDepartureTime &&
        m.missionId === first.missionId
      ) {
        critical.push("departure");
      } else {
        attention.push("departure");
      }
    }
  }

  if (critical.length > 0) return "NOT_READY";
  if (attention.length > 0) return "NEEDS_ATTENTION";
  return "READY";
}
