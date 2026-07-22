/**
 * RRULE parse / normalize / support matrix using the `rrule` library.
 */

import { RRule, rrulestr, Frequency } from "rrule";
import {
  MAX_COUNT,
  SUPPORTED_FREQ,
  type SupportedFreq,
} from "@/lib/calendar/recurrence/limits";

const UNSUPPORTED_TOKENS = [
  "BYWEEKNO",
  "BYYEARDAY",
  "BYHOUR",
  "BYMINUTE",
  "BYSECOND",
  "BYEASTER",
] as const;

export type ParsedRecurrenceRule = {
  ok: true;
  original: string;
  normalized: string;
  freq: SupportedFreq;
  interval: number;
  count: number | null;
  untilIso: string | null;
  byweekday: string[];
  bymonthday: number[];
  bymonth: number[];
  bysetpos: number[];
  wkst: string | null;
  unsupportedComponents: string[];
  rrule: RRule;
} | {
  ok: false;
  message: string;
  unsupportedComponents: string[];
};

function stripPrefix(raw: string): string {
  return raw.trim().replace(/^RRULE:/i, "").trim();
}

export function parseRecurrenceRule(raw: string): ParsedRecurrenceRule {
  const original = stripPrefix(raw);
  if (!original) {
    return {
      ok: false,
      message: "Recurrence rule is required.",
      unsupportedComponents: [],
    };
  }

  const upper = original.toUpperCase();
  const unsupportedComponents: string[] = [];
  for (const token of UNSUPPORTED_TOKENS) {
    if (upper.includes(token)) unsupportedComponents.push(token);
  }
  // Preserve EXDATE/RDATE separately — not inside RRULE string usually
  if (/EXDATE/i.test(original) || /RDATE/i.test(original)) {
    unsupportedComponents.push("INLINE_EXDATE_OR_RDATE");
  }

  let rrule: RRule;
  try {
    const parsed = rrulestr(`RRULE:${original}`, { forceset: false });
    if (parsed instanceof RRule) {
      rrule = parsed;
    } else {
      const set = parsed as { rrules: () => RRule[] };
      rrule = set.rrules()[0];
    }
    if (!rrule) {
      return {
        ok: false,
        message: "Could not parse recurrence rule.",
        unsupportedComponents,
      };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Invalid recurrence rule.",
      unsupportedComponents,
    };
  }

  const opts = rrule.options;
  const freqMap: Partial<Record<Frequency, SupportedFreq>> = {
    [Frequency.DAILY]: "DAILY",
    [Frequency.WEEKLY]: "WEEKLY",
    [Frequency.MONTHLY]: "MONTHLY",
    [Frequency.YEARLY]: "YEARLY",
  };
  const freq = freqMap[opts.freq as Frequency];
  if (!freq || !SUPPORTED_FREQ.includes(freq)) {
    return {
      ok: false,
      message: "Only DAILY, WEEKLY, MONTHLY, and YEARLY frequencies are supported.",
      unsupportedComponents,
    };
  }

  if (unsupportedComponents.length > 0) {
    return {
      ok: false,
      message: `Unsupported recurrence components: ${unsupportedComponents.join(", ")}.`,
      unsupportedComponents,
    };
  }

  if (opts.count != null && opts.count > MAX_COUNT) {
    return {
      ok: false,
      message: `COUNT=${opts.count} exceeds the safe maximum of ${MAX_COUNT}.`,
      unsupportedComponents,
    };
  }

  const weekdayNames = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const byweekday = (opts.byweekday ?? []).map((d: number | { weekday: number }) => {
    const wd = typeof d === "number" ? d : d.weekday;
    return weekdayNames[wd] ?? String(wd);
  });

  const normalized = rrule.toString().replace(/^RRULE:/i, "");

  return {
    ok: true,
    original,
    normalized,
    freq,
    interval: opts.interval || 1,
    count: opts.count ?? null,
    untilIso: opts.until ? opts.until.toISOString() : null,
    byweekday,
    bymonthday: opts.bymonthday ?? [],
    bymonth: opts.bymonth ?? [],
    bysetpos: opts.bysetpos ?? [],
    wkst: opts.wkst != null ? weekdayNames[opts.wkst] ?? null : null,
    unsupportedComponents: [],
    rrule,
  };
}

export function summarizeRule(parsed: Extract<ParsedRecurrenceRule, { ok: true }>): string {
  const parts = [`Every ${parsed.interval > 1 ? `${parsed.interval} ` : ""}${parsed.freq.toLowerCase()}`];
  if (parsed.byweekday.length) parts.push(`on ${parsed.byweekday.join(", ")}`);
  if (parsed.bymonthday.length) parts.push(`day ${parsed.bymonthday.join(", ")}`);
  if (parsed.count != null) parts.push(`${parsed.count} times`);
  if (parsed.untilIso) parts.push(`until ${parsed.untilIso.slice(0, 10)}`);
  return parts.join(" ");
}

export { RRule, Frequency };
