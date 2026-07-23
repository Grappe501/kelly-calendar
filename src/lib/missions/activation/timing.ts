/**
 * IC-02B relative-date engine (campaign-local). Pure — zero DB writes.
 */

import { createHash } from "node:crypto";
import { dateKeyInTimeZone } from "@/lib/calendar/temporal/wall-time";
import type {
  ScheduleContext,
  TimingAnchor,
  WindowLabel,
} from "@/lib/missions/activation/types";

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Saturday 09:00 campaign-local before the Event start day (or same week if already weekend). */
export function weekendBeforeEventStart(
  eventStartsAt: Date,
  timezone: string,
): Date {
  const startKey = dateKeyInTimeZone(eventStartsAt, timezone);
  // Walk back to Saturday of the weekend before the event's campaign day
  const probe = new Date(`${startKey}T12:00:00Z`);
  // Find day-of-week in campaign TZ
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(eventStartsAt);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[weekday] ?? 1;
  // Days back to previous Saturday (if Sat, go to prior Saturday = 7 days)
  const daysBack = dow === 6 ? 7 : dow + 1;
  const satKey = shiftDateKey(startKey, -daysBack);
  return wallToApproxUtc(satKey, "09:00", timezone);
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return utc.toISOString().slice(0, 10);
}

/** Approximate wall time → UTC using offset from Intl (good enough for due dates). */
function wallToApproxUtc(
  dateKey: string,
  hhmm: string,
  timezone: string,
): Date {
  const probe = new Date(`${dateKey}T${hhmm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(probe);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const m = tzName.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  let offsetMin = -300;
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    offsetMin = sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
  }
  // Want wall time dateKey hhmm in TZ → UTC = wall - offset
  const [hh, mm] = hhmm.split(":").map(Number);
  const utcMs =
    Date.UTC(
      Number(dateKey.slice(0, 4)),
      Number(dateKey.slice(5, 7)) - 1,
      Number(dateKey.slice(8, 10)),
      hh,
      mm,
      0,
    ) -
    offsetMin * 60_000;
  return new Date(utcMs);
}

export function resolveAnchorInstant(
  anchor: TimingAnchor,
  ctx: ScheduleContext,
): Date {
  switch (anchor) {
    case "EVENT_CREATED":
      return asDate(ctx.eventCreatedAt);
    case "MISSION_CREATED":
      return asDate(ctx.missionCreatedAt);
    case "ACTIVATION_APPLIED":
      return asDate(ctx.activationAppliedAt);
    case "EVENT_START":
      return asDate(ctx.eventStartsAt);
    case "EVENT_END":
      return asDate(ctx.eventEndsAt);
    case "WEEKEND_BEFORE_EVENT":
      return weekendBeforeEventStart(ctx.eventStartsAt, ctx.timezone);
    case "CUSTOM":
      return asDate(ctx.activationAppliedAt);
    default:
      return asDate(ctx.activationAppliedAt);
  }
}

export function computeDueAt(
  anchor: TimingAnchor,
  offsetHours: number,
  ctx: ScheduleContext,
): Date {
  const base = resolveAnchorInstant(anchor, ctx);
  return new Date(base.getTime() + offsetHours * 60 * 60 * 1000);
}

export function classifyWindow(
  dueAt: Date,
  now: Date,
  eventStartsAt: Date,
): WindowLabel {
  if (dueAt.getTime() >= now.getTime()) return "ON_SCHEDULE";
  // Due already passed at activation
  if (eventStartsAt.getTime() <= now.getTime()) {
    return "MISSED_WINDOW";
  }
  if (dueAt.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    return "OPERATOR_REVIEW";
  }
  return "DUE_IMMEDIATELY";
}

export function buildScheduleFingerprint(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  timezone: string;
  isAllDay: boolean;
}): string {
  const raw = [
    asDate(input.startsAt).toISOString(),
    asDate(input.endsAt).toISOString(),
    input.timezone,
    input.isAllDay ? "1" : "0",
  ].join("|");
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);
}
