import { IMPORT_LIMITS } from "@/features/calendar-import/import-limits";
import type { StagedCalendarEvent } from "@/features/calendar-import/import-types";

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
}

/**
 * Mark duplicates against an existing set. Never auto-merges.
 */
export function deduplicateEvents(
  incoming: StagedCalendarEvent[],
  existing: StagedCalendarEvent[] = [],
): StagedCalendarEvent[] {
  const seen = [...existing];
  const out: StagedCalendarEvent[] = [];

  for (const event of incoming) {
    const exact = seen.find(
      (other) =>
        other.deduplication.fingerprint === event.deduplication.fingerprint ||
        (event.source.iCalUid &&
          other.source.iCalUid === event.source.iCalUid &&
          other.timing.startsAt === event.timing.startsAt),
    );

    if (exact) {
      out.push({
        ...event,
        deduplication: {
          fingerprint: event.deduplication.fingerprint,
          status: "EXACT_DUPLICATE",
          matchedStagedEventIds: [exact.stagedEventId],
          reasons: ["Matching fingerprint or iCal UID + start time"],
        },
        review: { ...event.review, status: "NEEDS_EDIT" },
      });
      continue;
    }

    const likely = seen.find((other) => {
      const sameTitle =
        normalizeTitle(other.basic.importedTitle) ===
        normalizeTitle(event.basic.importedTitle);
      const closeStart =
        minutesBetween(other.timing.startsAt, event.timing.startsAt) <=
        IMPORT_LIMITS.duplicateStartToleranceMinutes;
      const sameDay =
        other.timing.startsAt.slice(0, 10) === event.timing.startsAt.slice(0, 10);
      const sameCity =
        other.geographicProposal.city &&
        event.geographicProposal.city &&
        other.geographicProposal.city.toLowerCase() ===
          event.geographicProposal.city.toLowerCase();
      return sameTitle && sameDay && (closeStart || Boolean(sameCity));
    });

    if (likely) {
      out.push({
        ...event,
        deduplication: {
          fingerprint: event.deduplication.fingerprint,
          status: "LIKELY_DUPLICATE",
          matchedStagedEventIds: [likely.stagedEventId],
          reasons: ["Same title and date with close start or same city"],
        },
        review: { status: "UNREVIEWED" },
      });
      seen.push(event);
      continue;
    }

    out.push(event);
    seen.push(event);
  }

  return out;
}
