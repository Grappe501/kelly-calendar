import type { LogisticsFindingSeverity, MissionLogisticsAcknowledgementDisposition, MissionLogisticsItemCategory, MissionLogisticsItemCriticality, MissionLogisticsItemStatus, MissionLogisticsPackStatus, MissionLogisticsReadiness } from "@/lib/missions/v21/logistics-pack/types";

const words = (value: string) => value.toLowerCase().split("_").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
export const labelLogisticsPackStatus = (value: MissionLogisticsPackStatus) => words(value);
export const labelLogisticsReadiness = (value: MissionLogisticsReadiness) => words(value);
export const labelLogisticsItemCategory = (value: MissionLogisticsItemCategory) => words(value);
export const labelLogisticsItemStatus = (value: MissionLogisticsItemStatus) => words(value);
export const labelLogisticsItemCriticality = (value: MissionLogisticsItemCriticality) => words(value);
export const labelLogisticsIssueType = (value: string) => words(value);
export const labelDisposition = (value: MissionLogisticsAcknowledgementDisposition) => words(value);
export function labelFindingSeverity(value: LogisticsFindingSeverity) { return value === "BLOCKER" ? "Blocking" : value === "WARNING" ? "Needs attention" : "Review"; }
/** ACKNOWLEDGED deliberately remains visible and does not clear readiness. */
export function dispositionClearsForReadiness(value: MissionLogisticsAcknowledgementDisposition | null | undefined) { return value === "ACCEPTED_RISK" || value === "RESOLVED" || value === "NOT_APPLICABLE"; }
