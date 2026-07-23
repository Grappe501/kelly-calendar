/**
 * CC-12 calendar print projections — read-only; NEVER mutate Events.
 * Authorized under ADR-100 via standing execution ADR-094.
 */

import "server-only";

import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKeysToUtcRange,
  resolveCalendarDateKey,
  shiftChicagoDateKey,
  weekDateKeys,
} from "@/lib/calendar/chicago-date";
import {
  applyPrintPrivacy,
  sortPrintEventRows,
  type PrintAgendaProjection,
  type PrintDayProjection,
  type PrintEventRow,
  type PrintProfile,
  type PrintWeekProjection,
} from "@/lib/calendar/print";
import {
  dayMembershipKind,
  eventIntersectsCampaignDay,
  occupiedCampaignDateKeysForInterval,
} from "@/lib/calendar/temporal";
import { accessLevelRank } from "@/lib/auth/access-level";
import type { SystemRoleName } from "@/lib/auth/system-roles";
import {
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { prisma } from "@/server/db/prisma";
import { writeAttributedAudit } from "@/server/services/audit-write";
import { projectSafeEvent } from "@/server/services/event-visibility-service";

const ELEVATED_PRINT_ROLES = new Set<SystemRoleName>([
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
]);

const PRINT_VIEW_ROLES = new Set<SystemRoleName>([
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
  "STAFF",
  "READ_ONLY_ADVISOR",
]);

/** Inclusive agenda span cap for print (presentation bound). */
export const MAX_PRINT_AGENDA_DAYS = 31;
const MAX_PRINT_EVENTS = 250;

function mapAccessToViewer(
  level: string,
): "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL" {
  const rank = accessLevelRank(level);
  if (rank <= 0) return "NO_ACCESS";
  if (rank === 1) return "AVAILABILITY_ONLY";
  if (rank <= 3) return "VIEW_LIMITED";
  if (rank <= 5) return "VIEW_FULL";
  return "FULL";
}

function assertDateKey(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${label} must be YYYY-MM-DD`);
  }
}

export function assertPrintProfileAllowed(
  actor: AuthenticatedActor,
  profile: PrintProfile,
): void {
  if (!PRINT_VIEW_ROLES.has(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Your role may not open calendar print sheets.",
    );
  }
  if (
    profile === "INTERNAL_DAY_DETAIL" &&
    !ELEVATED_PRINT_ROLES.has(actor.primarySystemRole)
  ) {
    throw new PermissionDeniedError(
      "INTERNAL_DAY_DETAIL print requires Kelly, Campaign Manager, or Scheduler.",
    );
  }
}

function overnightFlagsForDate(
  startsAt: Date,
  endsAt: Date,
  isAllDay: boolean,
  dateKey: string,
): {
  isOvernight?: boolean;
  continuesFromPrior?: boolean;
  continuesIntoNext?: boolean;
} {
  const kind = dayMembershipKind({
    startsAt,
    endsAt,
    isAllDay,
    dateKey,
  });
  if (!kind) return {};
  const occupied = occupiedCampaignDateKeysForInterval(
    startsAt,
    endsAt,
    isAllDay,
  );
  const continuesFromPrior = kind === "continues" || kind === "ends";
  const continuesIntoNext =
    kind === "continues" ||
    (kind === "starts" && occupied[occupied.length - 1] !== dateKey);
  return {
    isOvernight: occupied.length > 1 || kind === "continues",
    continuesFromPrior,
    continuesIntoNext,
  };
}

type LoadedPrintSource = {
  rows: PrintEventRow[];
  truncated: boolean;
};

async function loadAuthorizedPrintRows(input: {
  actor: AuthenticatedActor;
  profile: PrintProfile;
  rangeStart: Date;
  rangeEnd: Date;
  /** When set, compute overnight continuation relative to this day. */
  membershipDateKey?: string;
  take?: number;
}): Promise<LoadedPrintSource> {
  const take = Math.min(
    Math.max(input.take ?? MAX_PRINT_EVENTS, 1),
    MAX_PRINT_EVENTS,
  );
  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED", "DECLINED"] },
      startsAt: { lt: input.rangeEnd },
      endsAt: { gt: input.rangeStart },
    },
    orderBy: [{ startsAt: "asc" }, { eventNumber: "asc" }],
    take: take + 1,
    include: {
      primaryCalendar: true,
      campaignMission: { select: { id: true } },
    },
  });

  const truncated = events.length > take;
  const slice = truncated ? events.slice(0, take) : events;
  const rows: PrintEventRow[] = [];

  for (const event of slice) {
    const access = await canAccessEvent({
      eventId: event.id,
      viewerUserId: input.actor.userId,
    });
    if (!access.allowed) continue;
    const safe = projectSafeEvent({
      event,
      calendar: event.primaryCalendar,
      viewerAccess: mapAccessToViewer(access.accessLevel),
    });
    if (!safe) continue;

    const membership = input.membershipDateKey
      ? overnightFlagsForDate(
          event.startsAt,
          event.endsAt,
          event.isAllDay,
          input.membershipDateKey,
        )
      : {};

    rows.push(
      applyPrintPrivacy(input.profile, {
        eventId: event.id,
        eventNumber: event.eventNumber,
        title: safe.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        timezone: event.timezone || CAMPAIGN_CALENDAR_TIMEZONE,
        isAllDay: event.isAllDay,
        status: event.status,
        city: event.city,
        state: event.state,
        streetAddress: event.streetAddress,
        venueName: event.venueName,
        privateNotes: event.privateNotes,
        calendarName: event.primaryCalendar.name,
        missionLinked: Boolean(event.campaignMission?.id),
        ...membership,
      }),
    );
  }

  return { rows: sortPrintEventRows(rows), truncated };
}

async function auditPrintBestEffort(input: {
  actor: AuthenticatedActor;
  action: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    await writeAttributedAudit({
      actor: input.actor,
      action: input.action,
      entityType: "CalendarPrint",
      source: "calendar-print",
      metadata: input.metadata,
    });
  } catch {
    // Audit must not block print rendering.
  }
}

export async function getDayPrintProjection(input: {
  actor: AuthenticatedActor;
  dateKey?: string | null;
  profile: PrintProfile;
}): Promise<PrintDayProjection> {
  assertPrintProfileAllowed(input.actor, input.profile);
  const dateKey = resolveCalendarDateKey(input.dateKey);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(dateKey, dateKey);
  const loaded = await loadAuthorizedPrintRows({
    actor: input.actor,
    profile: input.profile,
    rangeStart,
    rangeEnd,
    membershipDateKey: dateKey,
  });

  const events = loaded.rows.filter((row) =>
    eventIntersectsCampaignDay({
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isAllDay: row.isAllDay,
      dateKey,
    }),
  );

  await auditPrintBestEffort({
    actor: input.actor,
    action: "CALENDAR_PRINT_DAY",
    metadata: {
      dateKey,
      profile: input.profile,
      eventCount: events.length,
      truncated: loaded.truncated,
    },
  });

  return {
    dateKey,
    profile: input.profile,
    timezone: CAMPAIGN_CALENDAR_TIMEZONE,
    events,
    truncated: loaded.truncated,
  };
}

export async function getWeekPrintProjection(input: {
  actor: AuthenticatedActor;
  dateKey?: string | null;
  profile?: "WEEK_OVERVIEW";
}): Promise<PrintWeekProjection> {
  const profile = input.profile ?? "WEEK_OVERVIEW";
  assertPrintProfileAllowed(input.actor, profile);
  const dateKey = resolveCalendarDateKey(input.dateKey);
  const keys = weekDateKeys(dateKey);
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(
    keys[0],
    keys[keys.length - 1],
  );
  const loaded = await loadAuthorizedPrintRows({
    actor: input.actor,
    profile,
    rangeStart,
    rangeEnd,
  });

  const days = keys.map((key) => ({
    dateKey: key,
    events: sortPrintEventRows(
      loaded.rows.filter((row) =>
        eventIntersectsCampaignDay({
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          isAllDay: row.isAllDay,
          dateKey: key,
        }),
      ),
    ),
  }));

  await auditPrintBestEffort({
    actor: input.actor,
    action: "CALENDAR_PRINT_WEEK",
    metadata: {
      dateKey,
      profile,
      eventCount: loaded.rows.length,
      truncated: loaded.truncated,
    },
  });

  return {
    dateKey,
    weekKeys: keys,
    profile: "WEEK_OVERVIEW",
    timezone: CAMPAIGN_CALENDAR_TIMEZONE,
    days,
    truncated: loaded.truncated,
  };
}

export async function getAgendaPrintProjection(input: {
  actor: AuthenticatedActor;
  dateFrom?: string | null;
  dateTo?: string | null;
  profile: PrintProfile;
}): Promise<PrintAgendaProjection> {
  assertPrintProfileAllowed(input.actor, input.profile);
  const dateFrom = resolveCalendarDateKey(input.dateFrom);
  let dateTo = input.dateTo
    ? resolveCalendarDateKey(input.dateTo)
    : shiftChicagoDateKey(dateFrom, 6);
  assertDateKey(dateFrom, "dateFrom");
  assertDateKey(dateTo, "dateTo");

  let truncatedRange = false;
  if (dateTo < dateFrom) {
    dateTo = dateFrom;
    truncatedRange = true;
  }
  const maxTo = shiftChicagoDateKey(dateFrom, MAX_PRINT_AGENDA_DAYS - 1);
  if (dateTo > maxTo) {
    dateTo = maxTo;
    truncatedRange = true;
  }

  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(dateFrom, dateTo);
  const loaded = await loadAuthorizedPrintRows({
    actor: input.actor,
    profile: input.profile,
    rangeStart,
    rangeEnd,
  });

  await auditPrintBestEffort({
    actor: input.actor,
    action: "CALENDAR_PRINT_AGENDA",
    metadata: {
      dateFrom,
      dateTo,
      profile: input.profile,
      eventCount: loaded.rows.length,
      truncated: loaded.truncated || truncatedRange,
    },
  });

  return {
    dateFrom,
    dateTo,
    profile: input.profile,
    timezone: CAMPAIGN_CALENDAR_TIMEZONE,
    events: loaded.rows,
    truncated: loaded.truncated || truncatedRange,
  };
}
