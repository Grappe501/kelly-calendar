import "server-only";

import {
  parseCalendarEventParam,
  type MissionFocusBanner,
} from "@/lib/calendar/mission-deep-link";
import { chicagoDateKey } from "@/lib/calendar/chicago-date";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { getEventById } from "@/server/repositories/event-repository";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import { accessLevelRank } from "@/lib/auth/access-level";

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

export type MissionDeepLinkResolution = {
  banner: MissionFocusBanner;
  /** Chicago date of the focused event when known (for redirect / period continuity). */
  eventDateKey: string | null;
  focusEventId: string | null;
};

const UNAVAILABLE: MissionFocusBanner = {
  kind: "unavailable",
  message: "Mission details are unavailable.",
};

/**
 * Resolve `/calendar?event=` for Open Mission (HL-039).
 * Authorization is re-checked here — list-page access is never enough.
 */
export async function resolveMissionDeepLink(input: {
  actor: AuthenticatedActor;
  rawEventId: string | null | undefined;
}): Promise<MissionDeepLinkResolution> {
  const eventId = parseCalendarEventParam(input.rawEventId);
  if (!input.rawEventId?.trim()) {
    return { banner: { kind: "none" }, eventDateKey: null, focusEventId: null };
  }
  if (!eventId) {
    return {
      banner: {
        kind: "not_found",
        message: "Mission details are unavailable.",
      },
      eventDateKey: null,
      focusEventId: null,
    };
  }

  const access = await canAccessEvent({
    eventId,
    viewerUserId: input.actor.userId,
  });
  if (!access.allowed) {
    return {
      banner: {
        kind: "forbidden",
        message: "You do not have permission to open this mission.",
      },
      eventDateKey: null,
      focusEventId: null,
    };
  }

  const row = await getEventById(eventId);
  if (!row) {
    return {
      banner: {
        kind: "not_found",
        message: "Mission details are unavailable.",
      },
      eventDateKey: null,
      focusEventId: null,
    };
  }

  const viewerAccess = mapAccessToViewer(access.accessLevel);
  const projection = projectSafeEvent({
    event: row,
    calendar: row.primaryCalendar,
    viewerAccess,
  });
  if (!projection) {
    return { banner: UNAVAILABLE, eventDateKey: null, focusEventId: null };
  }

  const eventDateKey = chicagoDateKey(projection.startsAt);

  if (!projection.canOpen) {
    // BUSY_ONLY / limited — do not surface restricted title as mission context.
    return {
      banner: {
        kind: "unavailable",
        message:
          "Mission details are unavailable for this event with your current access.",
      },
      eventDateKey,
      focusEventId: null,
    };
  }

  if (projection.status === "CANCELLED" || projection.status === "SUPERSEDED") {
    return {
      banner: {
        kind: "unavailable",
        message:
          projection.status === "CANCELLED"
            ? "This event is cancelled — mission details are not available."
            : "This event was superseded — mission details are not available.",
      },
      eventDateKey,
      focusEventId: projection.eventId,
    };
  }

  return {
    banner: {
      kind: "focused",
      eventId: projection.eventId,
      title: projection.title,
    },
    eventDateKey,
    focusEventId: projection.eventId,
  };
}
