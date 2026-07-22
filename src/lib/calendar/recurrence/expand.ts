/**
 * Bounded occurrence expansion with DST-stable local wall times (CC-03).
 *
 * Strategy: treat RRULE dtstart as floating local components encoded in a
 * UTC Date shell, expand with rrule, then resolve each local wall time via
 * the authoritative temporal service.
 */

import { RRule } from "rrule";
import {
  DEFAULT_HORIZON_DAYS,
  MAX_EXPANSION_RANGE_DAYS,
  MAX_MATERIALIZE_OCCURRENCES,
  MAX_PREVIEW_OCCURRENCES,
  MAX_RULE_COMPUTE_MS,
  type OccurrenceLifecycle,
} from "@/lib/calendar/recurrence/limits";
import { buildOccurrenceKey } from "@/lib/calendar/recurrence/occurrence-key";
import {
  parseRecurrenceRule,
  type ParsedRecurrenceRule,
} from "@/lib/calendar/recurrence/parse-rrule";
import { shiftChicagoDateKey } from "@/lib/calendar/chicago-date";
import {
  resolveWallTime,
  type DstDisambiguation,
} from "@/lib/calendar/temporal";

export type ExpandedOccurrence = {
  occurrenceKey: string;
  originalLocalStart: string;
  startsAt: Date;
  endsAt: Date;
  lifecycle: OccurrenceLifecycle;
  reviewReason?: string;
};

export type ExpansionResult = {
  ok: true;
  occurrences: ExpandedOccurrence[];
  truncated: boolean;
  truncationNote: string | null;
  ruleSummary: string;
  parsed: Extract<ParsedRecurrenceRule, { ok: true }>;
} | {
  ok: false;
  message: string;
};

function parseLocalParts(local: string): {
  dateKey: string;
  time: string;
  isDateOnly: boolean;
} {
  if (/^\d{4}-\d{2}-\d{2}$/.test(local)) {
    return { dateKey: local, time: "00:00", isDateOnly: true };
  }
  const m = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!m) throw new Error(`Invalid local start “${local}”.`);
  return { dateKey: m[1], time: m[2], isDateOnly: false };
}

/** Encode local Y-M-D H:m as a UTC Date shell for floating rrule expansion. */
function floatingUtcShell(dateKey: string, time: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh, mm, 0));
}

function shellToLocal(shell: Date): { dateKey: string; time: string } {
  const y = shell.getUTCFullYear();
  const mo = String(shell.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shell.getUTCDate()).padStart(2, "0");
  const hh = String(shell.getUTCHours()).padStart(2, "0");
  const mm = String(shell.getUTCMinutes()).padStart(2, "0");
  return { dateKey: `${y}-${mo}-${d}`, time: `${hh}:${mm}` };
}

function addDaysToDateKey(dateKey: string, days: number): string {
  return shiftChicagoDateKey(dateKey, days);
}

export function expandRecurrenceOccurrences(input: {
  seriesId: string;
  rrule: string;
  /** Local start YYYY-MM-DDTHH:mm or YYYY-MM-DD */
  dtstartLocal: string;
  timezone: string;
  isAllDay: boolean;
  durationMinutes: number;
  windowStartLocal?: string;
  windowEndLocal?: string;
  maxOccurrences?: number;
  disambiguation?: DstDisambiguation;
  exdatesLocal?: string[];
  rdatesLocal?: string[];
}): ExpansionResult {
  const parsed = parseRecurrenceRule(input.rrule);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  const parts = parseLocalParts(input.dtstartLocal);
  const dtstartShell = floatingUtcShell(parts.dateKey, parts.time);
  const maxOcc = Math.min(
    input.maxOccurrences ?? MAX_PREVIEW_OCCURRENCES,
    MAX_MATERIALIZE_OCCURRENCES,
  );

  const windowStart = input.windowStartLocal
    ? parseLocalParts(
        input.windowStartLocal.includes("T")
          ? input.windowStartLocal
          : `${input.windowStartLocal}T00:00`,
      )
    : parts;
  const defaultEndKey = addDaysToDateKey(parts.dateKey, DEFAULT_HORIZON_DAYS);
  const windowEnd = input.windowEndLocal
    ? parseLocalParts(
        input.windowEndLocal.includes("T")
          ? input.windowEndLocal
          : `${input.windowEndLocal}T23:59`,
      )
    : parseLocalParts(`${defaultEndKey}T23:59`);

  const rangeDays =
    (floatingUtcShell(windowEnd.dateKey, "12:00").getTime() -
      floatingUtcShell(windowStart.dateKey, "12:00").getTime()) /
    86_400_000;
  if (rangeDays > MAX_EXPANSION_RANGE_DAYS) {
    return {
      ok: false,
      message: `Expansion window exceeds ${MAX_EXPANSION_RANGE_DAYS} days.`,
    };
  }

  const betweenStart = floatingUtcShell(windowStart.dateKey, windowStart.time);
  const betweenEnd = floatingUtcShell(windowEnd.dateKey, windowEnd.time);

  const opts = parsed.rrule.options;
  const rule = new RRule({
    freq: opts.freq,
    interval: opts.interval || 1,
    count: opts.count ?? null,
    until: opts.until
      ? floatingUtcShell(
          shellToLocal(opts.until).dateKey,
          shellToLocal(opts.until).time,
        )
      : betweenEnd,
    byweekday: opts.byweekday ?? null,
    bymonthday: opts.bymonthday?.length ? opts.bymonthday : null,
    bymonth: opts.bymonth?.length ? opts.bymonth : null,
    bysetpos: opts.bysetpos?.length ? opts.bysetpos : null,
    wkst: opts.wkst ?? null,
    dtstart: dtstartShell,
    // Intentionally omit byhour/byminute/bysecond — floating local shells carry wall time.
  });

  const started = Date.now();
  let shells: Date[];
  try {
    shells = rule.between(betweenStart, betweenEnd, true);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Expansion failed.",
    };
  }
  if (Date.now() - started > MAX_RULE_COMPUTE_MS) {
    return {
      ok: false,
      message: "Recurrence expansion exceeded compute budget.",
    };
  }

  // RDATE additions (local)
  for (const rd of input.rdatesLocal ?? []) {
    const p = parseLocalParts(rd.includes("T") || input.isAllDay ? rd : `${rd}T${parts.time}`);
    shells.push(floatingUtcShell(p.dateKey, input.isAllDay ? "00:00" : p.time));
  }
  shells.sort((a, b) => a.getTime() - b.getTime());

  const exset = new Set(
    (input.exdatesLocal ?? []).map((x) => {
      const p = parseLocalParts(x.includes("T") ? x : `${x}T${parts.time}`);
      return input.isAllDay ? p.dateKey : `${p.dateKey}T${p.time}`;
    }),
  );

  const occurrences: ExpandedOccurrence[] = [];
  let truncated = false;
  for (const shell of shells) {
    if (occurrences.length >= maxOcc) {
      truncated = true;
      break;
    }
    const local = shellToLocal(shell);
    const originalLocalStart = input.isAllDay
      ? local.dateKey
      : `${local.dateKey}T${local.time}`;
    if (exset.has(originalLocalStart) || exset.has(local.dateKey)) {
      continue;
    }

    if (input.isAllDay) {
      const startResolved = resolveWallTime({
        dateKey: local.dateKey,
        time: "00:00",
        timeZone: input.timezone,
        disambiguation: input.disambiguation ?? "EARLIER",
      });
      const endKey = addDaysToDateKey(local.dateKey, Math.max(1, Math.round(input.durationMinutes / (24 * 60))));
      const endResolved = resolveWallTime({
        dateKey: endKey,
        time: "00:00",
        timeZone: input.timezone,
        disambiguation: input.disambiguation ?? "EARLIER",
      });
      if (!startResolved.ok || !endResolved.ok) {
        occurrences.push({
          occurrenceKey: buildOccurrenceKey({
            seriesId: input.seriesId,
            originalLocalStart,
            timezone: input.timezone,
            isAllDay: true,
          }),
          originalLocalStart,
          startsAt: new Date(NaN),
          endsAt: new Date(NaN),
          lifecycle: "REQUIRES_REVIEW",
          reviewReason: !startResolved.ok
            ? startResolved.message
            : endResolved.ok
              ? undefined
              : endResolved.message,
        });
        continue;
      }
      occurrences.push({
        occurrenceKey: buildOccurrenceKey({
          seriesId: input.seriesId,
          originalLocalStart,
          timezone: input.timezone,
          isAllDay: true,
        }),
        originalLocalStart,
        startsAt: startResolved.instant,
        endsAt: endResolved.instant,
        lifecycle: "GENERATED",
      });
      continue;
    }

    const startResolved = resolveWallTime({
      dateKey: local.dateKey,
      time: local.time,
      timeZone: input.timezone,
      disambiguation: input.disambiguation ?? "EARLIER",
    });
    if (!startResolved.ok) {
      occurrences.push({
        occurrenceKey: buildOccurrenceKey({
          seriesId: input.seriesId,
          originalLocalStart,
          timezone: input.timezone,
          isAllDay: false,
        }),
        originalLocalStart,
        startsAt: new Date(NaN),
        endsAt: new Date(NaN),
        lifecycle: "REQUIRES_REVIEW",
        reviewReason: startResolved.message,
      });
      continue;
    }
    const endsAt = new Date(
      startResolved.instant.getTime() + input.durationMinutes * 60_000,
    );
    occurrences.push({
      occurrenceKey: buildOccurrenceKey({
        seriesId: input.seriesId,
        originalLocalStart,
        timezone: input.timezone,
        isAllDay: false,
      }),
      originalLocalStart,
      startsAt: startResolved.instant,
      endsAt,
      lifecycle: "GENERATED",
    });
  }

  return {
    ok: true,
    occurrences,
    truncated,
    truncationNote: truncated
      ? `Preview truncated at ${maxOcc} occurrences.`
      : null,
    ruleSummary: `FREQ=${parsed.freq};INTERVAL=${parsed.interval}`,
    parsed,
  };
}
