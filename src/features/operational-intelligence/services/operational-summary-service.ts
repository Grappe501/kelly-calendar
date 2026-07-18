import type { TodayCommandSummary } from "@/features/operational-intelligence/types/summary-types";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

export function buildTodayCommandSummary(input: {
  date: string;
  timezone?: string;
  eventsToday: SafeEventProjection[];
  eventsTomorrowCount: number;
  readiness: EventReadinessResult[];
  conflicts: OperationalConflict[];
  pendingApprovals?: number;
  overdueActions?: number;
  unassignedCriticalRoles?: number;
  authenticationComplete: boolean;
  liveDataEnabled: boolean;
}): TodayCommandSummary {
  const criticalConflicts = input.conflicts.filter((c) => c.severity === "CRITICAL");
  const highRiskEvents = input.readiness.filter(
    (r) => r.readinessLevel === "AT_RISK" || r.criticalBlockers.length > 0,
  );

  return {
    date: input.date,
    timezone: input.timezone ?? "America/Chicago",
    candidateSchedule: input.eventsToday,
    counts: {
      eventsToday: input.eventsToday.length,
      eventsTomorrow: input.eventsTomorrowCount,
      criticalConflicts: criticalConflicts.length,
      highRiskEvents: highRiskEvents.length,
      pendingApprovals: input.pendingApprovals ?? 0,
      overdueActions: input.overdueActions ?? 0,
      unassignedCriticalRoles: input.unassignedCriticalRoles ?? 0,
    },
    readiness: input.readiness
      .map((r) => ({
        eventId: r.eventId,
        title: input.eventsToday.find((e) => e.eventId === r.eventId)?.title ?? r.eventId,
        score: r.overallScore,
        level: r.readinessLevel,
        blockers: r.criticalBlockers.length,
      }))
      .sort((a, b) => a.score - b.score),
    nextBestActions: input.readiness.flatMap((r) => r.nextBestActions).slice(0, 10),
    travelWarnings: input.conflicts.filter((c) =>
      /TRAVEL|BUFFER/i.test(c.conflictType),
    ),
    communicationDeadlines: [],
    packingWarnings: [],
    authenticationComplete: input.authenticationComplete,
    liveDataEnabled: input.liveDataEnabled,
  };
}
