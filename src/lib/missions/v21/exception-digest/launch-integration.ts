import type { LaunchBlocker } from "@/lib/missions/v21/day-launch/types";
import type {
  CampaignDayLaunchAcknowledgementPersisted,
  CampaignDayLaunchAcknowledgementStatus,
} from "@/lib/missions/v21/day-launch/types";
import type { DigestIncidentEntry } from "@/lib/missions/v21/exception-digest/types";
import { selectLaunchQualifiedEntries } from "@/lib/missions/v21/exception-digest/derive-digest";

function ackStatus(
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[],
  key: string,
): CampaignDayLaunchAcknowledgementStatus | null {
  return acknowledgements.find((a) => a.importKey === key)?.status ?? null;
}

/**
 * Map digest-qualified overnight / carry-forward / high-critical incidents
 * into Morning Launch Review blockers. Does not mutate incidents or digest review.
 * ACKNOWLEDGED launch dispositions that do not clear readiness keep blockers.
 */
export function buildExceptionDigestLaunchBlockers(input: {
  entries: DigestIncidentEntry[];
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[];
}): LaunchBlocker[] {
  const qualified = selectLaunchQualifiedEntries(input.entries);
  const blockers: LaunchBlocker[] = [];
  for (const entry of qualified) {
    if (
      !entry.buckets.includes("OPEN_HIGH_CRITICAL") &&
      !entry.acknowledgedUnclearedBlocker &&
      !entry.buckets.includes("OVERNIGHT") &&
      !entry.buckets.includes("EXPLICIT_CARRY_FORWARD")
    ) {
      continue;
    }
    // Accepted risk / resolved / N/A on high-critical finding clears presentation.
    if (entry.acceptedRisk && !entry.acknowledgedUnclearedBlocker) {
      if (!entry.buckets.includes("OPEN_HIGH_CRITICAL")) continue;
    }
    if (
      entry.buckets.includes("OPEN_HIGH_CRITICAL") ||
      entry.acknowledgedUnclearedBlocker
    ) {
      const key = `INCIDENT_DIGEST:OPEN_HIGH_CRITICAL:${entry.incidentId}`;
      blockers.push({
        id: key,
        title: `Overnight / carry-forward high-critical: ${entry.incidentRef}`,
        explanation:
          entry.summary ||
          "A high or critical incident remains active for Launch Review.",
        missionId: entry.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(input.acknowledgements, key),
        href: entry.href,
      });
    } else if (
      entry.buckets.includes("OVERNIGHT") ||
      entry.buckets.includes("EXPLICIT_CARRY_FORWARD")
    ) {
      const key = `INCIDENT_DIGEST:CARRY:${entry.incidentId}`;
      blockers.push({
        id: key,
        title: `Carried / overnight incident: ${entry.incidentRef}`,
        explanation:
          entry.summary ||
          "An overnight or carried-forward incident requires Launch awareness.",
        missionId: entry.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(input.acknowledgements, key),
        href: entry.href,
      });
    }
  }
  return blockers;
}
