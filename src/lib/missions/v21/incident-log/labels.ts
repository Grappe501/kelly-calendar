import type {
  IncidentFindingSeverity,
  MissionIncidentAcknowledgementDisposition,
  MissionIncidentCategory,
  MissionIncidentIssueType,
  MissionIncidentSensitivity,
  MissionIncidentSeverity,
  MissionIncidentStatus,
  MissionIncidentUpdateType,
} from "@/lib/missions/v21/incident-log/types";

const words = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const labelIncidentCategory = (value: MissionIncidentCategory) =>
  words(value);
export const labelIncidentSeverity = (value: MissionIncidentSeverity) =>
  words(value);
export const labelIncidentStatus = (value: MissionIncidentStatus) =>
  words(value);
export const labelIncidentSensitivity = (
  value: MissionIncidentSensitivity,
) => words(value);
export const labelIncidentUpdateType = (value: MissionIncidentUpdateType) =>
  words(value);
export const labelIncidentIssueType = (value: MissionIncidentIssueType) =>
  words(value);
export const labelIncidentDisposition = (
  value: MissionIncidentAcknowledgementDisposition,
) => words(value);

export function labelFindingSeverity(value: IncidentFindingSeverity) {
  return value === "BLOCKER"
    ? "Blocking"
    : value === "WARNING"
      ? "Needs attention"
      : "Review";
}

/** ACKNOWLEDGED deliberately remains visible and does not clear presentation counts. */
export function incidentDispositionClearsForReadiness(
  value: MissionIncidentAcknowledgementDisposition | null | undefined,
) {
  return (
    value === "ACCEPTED_RISK" ||
    value === "RESOLVED" ||
    value === "NOT_APPLICABLE"
  );
}
