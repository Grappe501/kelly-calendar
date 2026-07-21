/**
 * Pure projections over the canonical Event graph.
 * Build: KCCC-EA-10 — secondary operating lenses (no new models).
 */

import type { OperatingViewLens } from "@/lib/calendar/operating-view-lenses";
import type { OperatingEventRecord } from "@/server/services/event-service";

export type ProjectedLensItem = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  href: string;
};

function eventHref(eventId: string, startsAt: string): string {
  const date = startsAt.slice(0, 10);
  return `/calendar?view=day&date=${date}&event=${eventId}`;
}

export function projectTravelLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  return events
    .filter((e) => e.travel?.travelRequired || e.primaryCalendar.type === "TRAVEL")
    .map((e) => ({
      eventId: e.eventId,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      summary: e.travel?.departureAt
        ? `Leave by ${e.travel.departureAt}`
        : e.travel?.estimatedDurationMinutes != null
          ? `~${e.travel.estimatedDurationMinutes} min drive`
          : "Travel attached",
      href: eventHref(e.eventId, e.startsAt),
    }));
}

export function projectPreparationLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  return events
    .filter((e) =>
      e.openActions.some((a) => a.phase === "PRE_EVENT" || a.phase === "EVENT_DAY"),
    )
    .map((e) => {
      const prep = e.openActions.filter(
        (a) => a.phase === "PRE_EVENT" || a.phase === "EVENT_DAY",
      );
      return {
        eventId: e.eventId,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        summary: prep.map((a) => a.title).slice(0, 3).join(" · ") || "Preparation open",
        href: eventHref(e.eventId, e.startsAt),
      };
    });
}

export function projectFollowUpLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  return events
    .filter(
      (e) =>
        e.openFollowUps.length > 0 ||
        e.openActions.some((a) => a.phase === "POST_EVENT" || a.phase === "FOLLOWUP"),
    )
    .map((e) => {
      const after = [
        ...e.openFollowUps.map((f) => f.title),
        ...e.openActions
          .filter((a) => a.phase === "POST_EVENT" || a.phase === "FOLLOWUP")
          .map((a) => a.title),
      ];
      return {
        eventId: e.eventId,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        summary: after.slice(0, 3).join(" · ") || "Follow-up open",
        href: eventHref(e.eventId, e.startsAt),
      };
    });
}

export function projectPeopleLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  const byPerson = new Map<string, OperatingEventRecord[]>();
  for (const e of events) {
    for (const name of e.people) {
      const list = byPerson.get(name) ?? [];
      list.push(e);
      byPerson.set(name, list);
    }
  }
  return [...byPerson.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 40)
    .map(([name, list]) => {
      const first = list[0];
      return {
        eventId: first.eventId,
        title: name,
        startsAt: first.startsAt,
        endsAt: first.endsAt,
        summary: `${list.length} event${list.length === 1 ? "" : "s"} · ${list
          .slice(0, 2)
          .map((e) => e.title)
          .join(" · ")}`,
        href: eventHref(first.eventId, first.startsAt),
      };
    });
}

export function projectCountiesLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  return events
    .filter((e) => e.location?.label || e.primaryCalendar.type === "COUNTY_ACTIVITY")
    .map((e) => ({
      eventId: e.eventId,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      summary: e.location?.label ?? e.primaryCalendar.name,
      href: eventHref(e.eventId, e.startsAt),
    }));
}

export function projectMissionLens(events: OperatingEventRecord[]): ProjectedLensItem[] {
  return events
    .filter((e) => e.missionId)
    .map((e) => ({
      eventId: e.eventId,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      summary: [e.missionLifecyclePhase, e.missionStatus].filter(Boolean).join(" · ") || "Mission",
      href: `/system/missions/${e.missionId}`,
    }));
}

export function projectConflictsLens(
  events: OperatingEventRecord[],
  conflictEventIds: Set<string>,
): ProjectedLensItem[] {
  return events
    .filter((e) => conflictEventIds.has(e.eventId))
    .map((e) => ({
      eventId: e.eventId,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      summary: "Schedule conflict",
      href: eventHref(e.eventId, e.startsAt),
    }));
}

export function projectSecondaryLens(
  lens: Exclude<OperatingViewLens, "today" | "day" | "week" | "month" | "agenda">,
  events: OperatingEventRecord[],
  conflictEventIds: Set<string> = new Set(),
): ProjectedLensItem[] {
  switch (lens) {
    case "travel":
      return projectTravelLens(events);
    case "preparation":
      return projectPreparationLens(events);
    case "follow_up":
      return projectFollowUpLens(events);
    case "people":
      return projectPeopleLens(events);
    case "counties":
      return projectCountiesLens(events);
    case "mission":
      return projectMissionLens(events);
    case "conflicts":
      return projectConflictsLens(events, conflictEventIds);
    default:
      return [];
  }
}
