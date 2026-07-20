import type {
  FieldOpsFindingSeverity,
  MissionFieldConfirmationState,
  MissionFieldItemCondition,
  MissionFieldOpsAcknowledgementDisposition,
  MissionFieldOpsReadiness,
  MissionFieldOpsSessionStatus,
} from "@/lib/missions/v21/field-ops/types";

const words = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const labelFieldOpsSessionStatus = (value: MissionFieldOpsSessionStatus) =>
  words(value);
export const labelFieldOpsReadiness = (value: MissionFieldOpsReadiness) =>
  words(value);
export const labelFieldConfirmationState = (
  value: MissionFieldConfirmationState,
) => words(value);
export const labelFieldItemCondition = (value: MissionFieldItemCondition) =>
  words(value);
export const labelFieldOpsIssueType = (value: string) => words(value);
export const labelFieldOpsDisposition = (
  value: MissionFieldOpsAcknowledgementDisposition,
) => words(value);

export function labelFindingSeverity(value: FieldOpsFindingSeverity) {
  return value === "BLOCKER"
    ? "Blocking"
    : value === "WARNING"
      ? "Needs attention"
      : "Review";
}

/** ACKNOWLEDGED deliberately remains visible and does not clear readiness. */
export function fieldOpsDispositionClearsForReadiness(
  value: MissionFieldOpsAcknowledgementDisposition | null | undefined,
) {
  return (
    value === "ACCEPTED_RISK" ||
    value === "RESOLVED" ||
    value === "NOT_APPLICABLE"
  );
}
