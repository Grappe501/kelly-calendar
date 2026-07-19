import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";

/**
 * Canonical Mission Card status (stabilizes contract ahead of 6.5 one-tap completion).
 */
export type MissionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "NEEDS_ATTENTION";

type RiskLevel = "NONE" | "WATCH" | "HIGH" | "CRITICAL";

export type MissionStatusPresentation = {
  status: MissionStatus;
  label: string;
  symbol: "○" | "◐" | "✓" | "⚠";
};

export function presentMissionStatus(status: MissionStatus): MissionStatusPresentation {
  switch (status) {
    case "IN_PROGRESS":
      return { status, label: "In Progress", symbol: "◐" };
    case "COMPLETE":
      return { status, label: "Complete", symbol: "✓" };
    case "NEEDS_ATTENTION":
      return { status, label: "Needs Attention", symbol: "⚠" };
    default:
      return { status: "PENDING", label: "Pending", symbol: "○" };
  }
}

export function deriveMissionStatus(input: {
  startsAt: string;
  endsAt: string;
  eventStatus: string;
  readiness?: EventReadinessResult | null;
  riskLevel?: RiskLevel;
  now?: Date;
}): MissionStatus {
  const now = input.now ?? new Date();
  const start = new Date(input.startsAt).getTime();
  const end = new Date(input.endsAt).getTime();
  const eventStatus = input.eventStatus.toUpperCase();

  if (
    eventStatus.includes("COMPLETE") ||
    eventStatus.includes("CANCEL") ||
    eventStatus.includes("ARCHIVE") ||
    end < now.getTime()
  ) {
    return "COMPLETE";
  }

  const needsAttention =
    input.riskLevel === "CRITICAL" ||
    input.riskLevel === "HIGH" ||
    input.readiness?.readinessLevel === "AT_RISK" ||
    Boolean(input.readiness?.criticalBlockers?.length);

  if (needsAttention) return "NEEDS_ATTENTION";

  if (start <= now.getTime() && now.getTime() <= end) return "IN_PROGRESS";

  return "PENDING";
}
