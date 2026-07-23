import type { PrintEventRow } from "@/lib/calendar/print/types";

/**
 * Stable sort: startsAt ascending, then eventNumber ascending.
 * Equal keys preserve input order (stable).
 */
export function sortPrintEventRows(rows: PrintEventRow[]): PrintEventRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aStart = Date.parse(a.row.startsAt);
      const bStart = Date.parse(b.row.startsAt);
      const aTime = Number.isFinite(aStart) ? aStart : 0;
      const bTime = Number.isFinite(bStart) ? bStart : 0;
      if (aTime !== bTime) return aTime - bTime;
      const numCmp = a.row.eventNumber.localeCompare(
        b.row.eventNumber,
        "en",
        { numeric: true },
      );
      if (numCmp !== 0) return numCmp;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}
