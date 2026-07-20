import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type {
  CampaignDayCarryForwardPersisted,
  CampaignDayCarryForwardSuggestion,
  MissionDayReviewClassification,
} from "@/lib/missions/v21/day-closeout/types";

const OPEN = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

export function classifyMissionDayReview(
  m: DayBriefingMissionSnapshot,
): MissionDayReviewClassification {
  if (m.operationalStatus === "CANCELLED") return "NO_EXECUTION_EXPECTED";

  if (
    m.startsAt > m.endsAt ||
    (m.execution.exists &&
      m.execution.status === "COMPLETED" &&
      !m.debrief.exists)
  ) {
    if (m.startsAt > m.endsAt) return "RECORD_REVIEW_NEEDED";
  }

  if (
    m.debrief.status === "COMPLETED" ||
    m.followUp.status === "READY_TO_CLOSE"
  ) {
    return "LEADERSHIP_REVIEW";
  }

  const execActive =
    m.execution.status === "ARRIVED" || m.execution.status === "IN_PROGRESS";
  const debriefGap =
    m.execution.status === "COMPLETED" &&
    (!m.debrief.exists ||
      m.debrief.status === "NOT_STARTED" ||
      m.debrief.status === "IN_PROGRESS");
  const openActions = m.followUp.actions.filter((a) => OPEN.has(a.status));

  if (execActive || debriefGap || openActions.length > 0) {
    return "ACTION_REQUIRED";
  }

  if (
    !m.execution.exists ||
    m.execution.status === "NOT_STARTED" ||
    m.execution.status === "COMPLETED"
  ) {
    if (
      m.lifecyclePhase === "PREPARE" ||
      m.lifecyclePhase === "TRAVEL" ||
      m.lifecyclePhase === "COMPLETE"
    ) {
      if (m.lifecyclePhase === "COMPLETE" || m.followUp.status === "CLOSED") {
        return "CAPTURE_COMPLETE";
      }
      if (!m.execution.exists && m.lifecyclePhase === "PREPARE") {
        return "NO_EXECUTION_EXPECTED";
      }
    }
  }

  if (m.execution.status === "COMPLETED" && m.debrief.status === "APPROVED") {
    return "CAPTURE_COMPLETE";
  }

  return "ACTION_REQUIRED";
}

export function carryForwardImportKey(
  sourceType: string,
  sourceRecordId: string,
): string {
  return `${sourceType}:${sourceRecordId}`;
}

export function buildCarryForwardSuggestions(input: {
  dayMissions: DayBriefingMissionSnapshot[];
  tomorrowMissions: DayBriefingMissionSnapshot[];
  existing: CampaignDayCarryForwardPersisted[];
}): CampaignDayCarryForwardSuggestion[] {
  const present = new Set(
    input.existing
      .map((i) => i.importKey)
      .filter((k): k is string => Boolean(k)),
  );
  const out: CampaignDayCarryForwardSuggestion[] = [];

  for (const m of input.dayMissions) {
    if (
      m.execution.status === "ARRIVED" ||
      m.execution.status === "IN_PROGRESS"
    ) {
      const key = carryForwardImportKey("ACTIVE_EXECUTION", m.missionId);
      out.push({
        suggestionKey: key,
        sourceType: "ACTIVE_EXECUTION",
        sourceRecordId: m.missionId,
        missionId: m.missionId,
        title: `Active execution: ${m.title}`,
        reason: "Execution is still marked in progress or arrived.",
        ownerName: null,
        destination: `/system/missions/${m.missionId}/execute`,
        alreadyPresent: present.has(key),
      });
    }

    if (
      m.execution.status === "COMPLETED" &&
      (!m.debrief.exists || m.debrief.status === "NOT_STARTED")
    ) {
      const key = carryForwardImportKey("DEBRIEF_REQUIRED", m.missionId);
      out.push({
        suggestionKey: key,
        sourceType: "DEBRIEF_REQUIRED",
        sourceRecordId: m.missionId,
        missionId: m.missionId,
        title: `Debrief not started: ${m.title}`,
        reason: "Execution completed but Debrief has not been started.",
        ownerName: null,
        destination: `/system/missions/${m.missionId}/debrief`,
        alreadyPresent: present.has(key),
      });
    }

    if (m.debrief.status === "COMPLETED") {
      const key = carryForwardImportKey("DEBRIEF_APPROVAL", m.missionId);
      out.push({
        suggestionKey: key,
        sourceType: "DEBRIEF_APPROVAL",
        sourceRecordId: m.missionId,
        missionId: m.missionId,
        title: `Debrief awaiting approval: ${m.title}`,
        reason: "Debrief is completed and awaiting leadership approval.",
        ownerName: null,
        destination: `/system/missions/${m.missionId}/debrief`,
        alreadyPresent: present.has(key),
      });
    }

    for (const a of m.followUp.actions) {
      if (!OPEN.has(a.status)) continue;
      const sourceType =
        a.status === "BLOCKED"
          ? "BLOCKED_ACTION"
          : a.ownerType === "UNASSIGNED"
            ? "UNASSIGNED_ACTION"
            : a.sourceType === "EXECUTE_COMMITMENT"
              ? "COMMITMENT"
              : "FOLLOW_UP_ACTION";
      const key = carryForwardImportKey(sourceType, a.id);
      out.push({
        suggestionKey: key,
        sourceType,
        sourceRecordId: a.id,
        missionId: m.missionId,
        title: a.title,
        reason: `Follow-up action remains ${a.status}.`,
        ownerName: a.ownerName,
        destination: `/system/missions/${m.missionId}/follow-up`,
        alreadyPresent: present.has(key),
      });
    }
  }

  for (const m of input.tomorrowMissions) {
    const prepGap =
      !m.preparation.exists ||
      m.preparation.readiness === "DRAFT" ||
      m.preparation.readiness === "NEEDS_ATTENTION";
    if (prepGap) {
      const key = carryForwardImportKey("TOMORROW_PREPARATION", m.missionId);
      out.push({
        suggestionKey: key,
        sourceType: "TOMORROW_PREPARATION",
        sourceRecordId: m.missionId,
        missionId: m.missionId,
        title: `Tomorrow preparation gap: ${m.title}`,
        reason: "Preparation is absent, draft, or needs attention.",
        ownerName: null,
        destination: `/system/missions/${m.missionId}/prepare`,
        alreadyPresent: present.has(key),
      });
    }
    const departure =
      m.eventDepartureAt ?? m.travelPlan?.departureAt ?? null;
    if (m.travelRequired && !departure) {
      const key = carryForwardImportKey("TOMORROW_TRAVEL", m.missionId);
      out.push({
        suggestionKey: key,
        sourceType: "TOMORROW_TRAVEL",
        sourceRecordId: m.missionId,
        missionId: m.missionId,
        title: `Tomorrow travel gap: ${m.title}`,
        reason: "Travel is required but departure time has not been prepared.",
        ownerName: null,
        destination: `/system/missions/${m.missionId}/prepare`,
        alreadyPresent: present.has(key),
      });
    }
  }

  return out.sort((a, b) => a.suggestionKey.localeCompare(b.suggestionKey));
}
