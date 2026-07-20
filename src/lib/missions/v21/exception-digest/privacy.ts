import type { SystemRoleName } from "@/lib/auth/system-roles";
import {
  canViewSensitiveIncident,
  redactForBoard,
} from "@/lib/missions/v21/incident-log/privacy";
import type { MissionIncidentPersisted } from "@/lib/missions/v21/incident-log/types";
import type { DigestCounts, DigestIncidentEntry } from "@/lib/missions/v21/exception-digest/types";

export function filterIncidentsForDigestViewer(
  incidents: MissionIncidentPersisted[],
  role: SystemRoleName,
): {
  visible: MissionIncidentPersisted[];
  confidentialOmitted: boolean;
} {
  if (canViewSensitiveIncident(role)) {
    return { visible: incidents, confidentialOmitted: false };
  }
  const visible: MissionIncidentPersisted[] = [];
  let confidentialOmitted = false;
  for (const incident of incidents) {
    if (incident.sensitivity === "CONFIDENTIAL") {
      confidentialOmitted = true;
      continue;
    }
    visible.push(redactForBoard(incident));
  }
  return { visible, confidentialOmitted };
}

export function redactDigestEntry(
  entry: DigestIncidentEntry,
  role: SystemRoleName,
): DigestIncidentEntry {
  if (canViewSensitiveIncident(role)) return entry;
  if (
    entry.sensitivity !== "RESTRICTED" &&
    entry.sensitivity !== "CONFIDENTIAL"
  ) {
    return entry;
  }
  return {
    ...entry,
    summary:
      entry.sensitivity === "CONFIDENTIAL"
        ? ""
        : `[${entry.sensitivity} — access required]`,
    isConfidentialHidden: true,
    dispositionNote: null,
  };
}

/** Recompute counts from already-filtered entries (never from hidden set). */
export function countsFromVisibleEntries(
  entries: DigestIncidentEntry[],
  confidentialOmitted: boolean,
): DigestCounts {
  const severityRank: Record<string, number> = {
    INFO: 1,
    LOW: 2,
    MODERATE: 3,
    HIGH: 4,
    CRITICAL: 5,
  };
  let highest: string | null = null;
  let highestRank = 0;
  const has = (bucket: string) => (e: DigestIncidentEntry) =>
    e.buckets.includes(bucket as DigestIncidentEntry["buckets"][number]);

  for (const e of entries) {
    if (
      e.buckets.includes("OPEN_HIGH_CRITICAL") ||
      e.buckets.includes("OPEN_LOWER_SEVERITY") ||
      e.buckets.includes("MONITORING_STABILIZED")
    ) {
      const rank = severityRank[e.severity] ?? 0;
      if (rank > highestRank) {
        highestRank = rank;
        highest = e.severity;
      }
    }
  }

  return {
    visibleIncidentCount: entries.length,
    openHighCriticalCount: entries.filter(has("OPEN_HIGH_CRITICAL")).length,
    openLowerSeverityCount: entries.filter(has("OPEN_LOWER_SEVERITY")).length,
    monitoringStabilizedCount: entries.filter(has("MONITORING_STABILIZED"))
      .length,
    explicitCarryForwardCount: entries.filter(has("EXPLICIT_CARRY_FORWARD"))
      .length,
    followUpGapCount: entries.filter(has("FOLLOW_UP_GAP")).length,
    acknowledgedBlockerCount: entries.filter(has("ACKNOWLEDGED_BLOCKER"))
      .length,
    acceptedRiskCount: entries.filter(has("ACCEPTED_RISK")).length,
    postCloseoutUpdateCount: entries.filter(has("UPDATED_AFTER_CLOSEOUT"))
      .length,
    postDigestUpdateCount: entries.filter(has("UPDATED_AFTER_DIGEST_REVIEW"))
      .length,
    overnightCount: entries.filter(has("OVERNIGHT")).length,
    cancelledMissionCount: entries.filter(has("CANCELLED_MISSION")).length,
    originatedEarlierCount: entries.filter(has("ORIGINATED_EARLIER")).length,
    resolvedDuringDayCount: entries.filter(has("RESOLVED_DURING_DAY")).length,
    highestActiveSeverity: highest,
    confidentialOmitted,
  };
}
