import type { SafeEventProjection } from "@/server/services/event-visibility-service";
import type { NextBestAction } from "./readiness-types";
import type { OperationalConflict } from "./conflict-types";

export type OperationalDeadline = {
  id: string;
  eventId: string;
  label: string;
  dueAt: string;
  status: "MISSED" | "DUE_NOW" | "ACCELERATED" | "UPCOMING" | "COMPLETE" | "NOT_REQUIRED";
};

export type OperationalWarning = {
  id: string;
  eventId: string;
  message: string;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
};

export type TodayCommandSummary = {
  date: string;
  timezone: string;
  candidateSchedule: SafeEventProjection[];
  counts: {
    eventsToday: number;
    eventsTomorrow: number;
    criticalConflicts: number;
    highRiskEvents: number;
    pendingApprovals: number;
    overdueActions: number;
    unassignedCriticalRoles: number;
  };
  readiness: Array<{
    eventId: string;
    title: string;
    score: number;
    level: string;
    blockers: number;
  }>;
  nextBestActions: NextBestAction[];
  travelWarnings: OperationalConflict[];
  communicationDeadlines: OperationalDeadline[];
  packingWarnings: OperationalWarning[];
  authenticationComplete: boolean;
  liveDataEnabled: boolean;
};

export type CountyCoverageStatus =
  | "NO_REVIEWED_ACTIVITY"
  | "HISTORICAL_ONLY"
  | "RECENT_ACTIVITY"
  | "UPCOMING"
  | "ACTIVE_PIPELINE"
  | "NEEDS_ATTENTION";

export type CountyCoverageRow = {
  countyId: string;
  countyName: string;
  status: CountyCoverageStatus;
  historicalReviewed: number;
  upcoming: number;
  unreviewedImports: number;
  lastConfirmedVisitAt?: string;
};
