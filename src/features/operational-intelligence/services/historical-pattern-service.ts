import type { HistoricalPattern } from "@/features/operational-intelligence/types/pattern-types";

export type PatternSourceEvent = {
  id: string;
  eventType?: string | null;
  historicalReviewStatus?: string | null;
  historicalOccurredConfirmed?: boolean;
  historicalAttendanceConfirmed?: boolean;
  isImported?: boolean;
  durationMinutes?: number | null;
  packingItemNames?: string[];
};

export const PATTERN_CALCULATION_VERSION = "kccc-patterns-1.0";

export function isEligibleHistoricalEvidence(event: PatternSourceEvent): boolean {
  const status = (event.historicalReviewStatus ?? "UNREVIEWED").toUpperCase();
  // UNREVIEWED, REJECTED, DUPLICATE, and INCOMPLETE never contribute trusted patterns.
  if (
    status === "UNREVIEWED" ||
    status === "REJECTED" ||
    status === "DUPLICATE" ||
    status === "INCOMPLETE"
  ) {
    return false;
  }
  if (status !== "APPROVED") return false;
  return true;
}

export function rebuildDurationPatterns(
  events: PatternSourceEvent[],
  asOf = new Date(),
): HistoricalPattern[] {
  const eligible = events.filter(isEligibleHistoricalEvidence);
  const byType = new Map<string, number[]>();
  for (const e of eligible) {
    if (!e.eventType || e.durationMinutes == null) continue;
    const list = byType.get(e.eventType) ?? [];
    list.push(e.durationMinutes);
    byType.set(e.eventType, list);
  }

  const patterns: HistoricalPattern[] = [];
  for (const [eventType, durations] of byType) {
    const sampleSize = durations.length;
    const avg = durations.reduce((a, b) => a + b, 0) / sampleSize;
    const confidence = sampleSize >= 10 ? 0.8 : sampleSize >= 5 ? 0.55 : sampleSize >= 3 ? 0.35 : 0.15;
    patterns.push({
      patternType: "TYPICAL_DURATION_MINUTES",
      scopeType: "EVENT_TYPE",
      scopeKey: eventType,
      sampleSize,
      confidence,
      signalValue: { averageMinutes: Math.round(avg) },
      evidenceSummary: `Average duration from ${sampleSize} reviewed ${eventType} event(s)`,
      calculationVersion: PATTERN_CALCULATION_VERSION,
      calculatedAt: asOf.toISOString(),
    });
  }
  return patterns;
}

export function rebuildPackingPatterns(
  events: PatternSourceEvent[],
  asOf = new Date(),
): HistoricalPattern[] {
  const eligible = events.filter(isEligibleHistoricalEvidence);
  const counts = new Map<string, number>();
  for (const e of eligible) {
    for (const item of e.packingItemNames ?? []) {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([item, sampleSize]) => ({
      patternType: "COMMON_PACKING_ITEM",
      scopeType: "GLOBAL" as const,
      scopeKey: item,
      sampleSize,
      confidence: sampleSize >= 5 ? 0.6 : 0.3,
      signalValue: { itemName: item },
      evidenceSummary: `${item} appeared in ${sampleSize} reviewed events`,
      calculationVersion: PATTERN_CALCULATION_VERSION,
      calculatedAt: asOf.toISOString(),
    }));
}
