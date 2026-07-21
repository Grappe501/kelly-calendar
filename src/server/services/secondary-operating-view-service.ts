import "server-only";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import {
  OPERATING_VIEW_QUESTIONS,
  SECONDARY_OPERATING_VIEWS,
  type OperatingViewLens,
} from "@/lib/calendar/operating-view-lenses";
import { projectSecondaryLens } from "@/lib/calendar/project-event-lenses";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { loadEventGraphForAgenda } from "@/server/services/operating-views/load-event-graph";

export type SecondaryOperatingViewData = {
  lens: (typeof SECONDARY_OPERATING_VIEWS)[number];
  executiveQuestion: string;
  timezone: string;
  dateKey: string;
  cataloguePartial: boolean;
  items: ReturnType<typeof projectSecondaryLens>;
  viewerDisplayName: string;
  designedOnlyNote: string;
};

export function isSecondaryOperatingLens(
  value: string,
): value is (typeof SECONDARY_OPERATING_VIEWS)[number] {
  return (SECONDARY_OPERATING_VIEWS as readonly string[]).includes(value);
}

/**
 * Secondary lenses — filtered projections over the same Event graph.
 * Designed for growth; Step 10 ships thin projection lists, not new models.
 */
export async function getSecondaryOperatingViewData(
  actor: AuthenticatedActor,
  lens: (typeof SECONDARY_OPERATING_VIEWS)[number],
  dateKeyInput?: string | null,
): Promise<SecondaryOperatingViewData> {
  const graph = await loadEventGraphForAgenda(actor, dateKeyInput, 60);
  const conflicts = detectCandidateOverlaps(
    graph.events.map((e) => ({
      id: e.eventId,
      label: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      status: e.status,
      candidateAttending: true,
      calendarType: e.primaryCalendar.type,
    })),
  );
  const conflictIds = new Set<string>();
  for (const c of conflicts) {
    if (c.primaryEntity.type === "event") conflictIds.add(c.primaryEntity.id);
    if (c.relatedEntity?.type === "event") conflictIds.add(c.relatedEntity.id);
  }

  return {
    lens,
    executiveQuestion: OPERATING_VIEW_QUESTIONS[lens as OperatingViewLens],
    timezone: graph.timezone,
    dateKey: graph.dateKey,
    cataloguePartial: graph.cataloguePartial,
    items: projectSecondaryLens(lens, graph.events, conflictIds),
    viewerDisplayName: actor.displayName,
    designedOnlyNote:
      "Secondary operating lens — projection over canonical Event, not a separate data model.",
  };
}
