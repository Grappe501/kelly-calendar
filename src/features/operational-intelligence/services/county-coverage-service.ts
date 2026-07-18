import type {
  CountyCoverageRow,
  CountyCoverageStatus,
} from "@/features/operational-intelligence/types/summary-types";

export type CountyEventFact = {
  countyId: string;
  countyName: string;
  startsAt: Date;
  historicalReviewStatus?: string | null;
  historicalOccurredConfirmed?: boolean;
  historicalAttendanceConfirmed?: boolean;
  isUpcoming: boolean;
};

export function summarizeCountyCoverage(facts: CountyEventFact[]): CountyCoverageRow[] {
  const byCounty = new Map<string, CountyEventFact[]>();
  for (const f of facts) {
    const list = byCounty.get(f.countyId) ?? [];
    list.push(f);
    byCounty.set(f.countyId, list);
  }

  const rows: CountyCoverageRow[] = [];
  for (const [countyId, list] of byCounty) {
    const historicalReviewed = list.filter(
      (e) =>
        (e.historicalReviewStatus ?? "").toUpperCase() === "APPROVED" &&
        e.historicalAttendanceConfirmed,
    ).length;
    // Unreviewed imports must never count as confirmed visits
    const unreviewedImports = list.filter(
      (e) => (e.historicalReviewStatus ?? "UNREVIEWED").toUpperCase() === "UNREVIEWED",
    ).length;
    const upcoming = list.filter((e) => e.isUpcoming).length;
    const lastConfirmed = list
      .filter((e) => e.historicalAttendanceConfirmed)
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];

    let status: CountyCoverageStatus = "NO_REVIEWED_ACTIVITY";
    if (upcoming > 0 && historicalReviewed > 0) status = "ACTIVE_PIPELINE";
    else if (upcoming > 0) status = "UPCOMING";
    else if (historicalReviewed > 0) status = "HISTORICAL_ONLY";
    else if (unreviewedImports > 0) status = "NEEDS_ATTENTION";

    rows.push({
      countyId,
      countyName: list[0]?.countyName ?? countyId,
      status,
      historicalReviewed,
      upcoming,
      unreviewedImports,
      lastConfirmedVisitAt: lastConfirmed?.startsAt.toISOString(),
    });
  }
  return rows.sort((a, b) => a.countyName.localeCompare(b.countyName));
}
