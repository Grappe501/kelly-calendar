import { createHash } from "node:crypto";
import type { MissionIncidentPersisted } from "@/lib/missions/v21/incident-log/types";

/**
 * Deterministic fingerprint of material incident facts for digest staleness.
 * Includes sensitivity class (not narrative) so redacted confidential changes
 * still drift safely without leaking values.
 */
export function computeDigestSourceFingerprint(
  incidents: MissionIncidentPersisted[],
): string {
  const lines = [...incidents]
    .map((incident) => {
      const acks = [...incident.acknowledgements]
        .map(
          (a) =>
            `${a.issueKey}:${a.disposition}:${a.acknowledgedAt}:${a.acceptedRiskReason ? "1" : "0"}`,
        )
        .sort()
        .join(",");
      return [
        incident.id,
        incident.incidentRef,
        incident.missionId,
        incident.campaignDateKey,
        incident.status,
        incident.severity,
        incident.category,
        incident.sensitivity,
        incident.carryForwardRequired ? "1" : "0",
        incident.carriedForwardAt ?? "",
        incident.followUpRequired ? "1" : "0",
        incident.linkedFollowUpActionId ?? "",
        incident.isArchived ? "1" : "0",
        incident.updatedAt,
        incident.resolvedAt ?? "",
        incident.stabilizedAt ?? "",
        // Narrative presence only — never include content.
        incident.summary?.trim() ? "S" : "",
        incident.description?.trim() ? "D" : "",
        `acks:[${acks}]`,
      ].join("|");
    })
    .sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

export function isDigestFingerprintStale(
  reviewedFingerprint: string | null | undefined,
  currentFingerprint: string,
): boolean {
  if (!reviewedFingerprint) return false;
  return reviewedFingerprint !== currentFingerprint;
}
