/**
 * CC-07 Unified Search, Filters & Saved Views — server search service.
 * Build: KCCC-CC-07-UNIFIED-SEARCH-FILTERS-SAVED-VIEWS-1.0
 * Authorized under ADR-095 (CC-07) via standing execution ADR-094.
 *
 * Hard constraints (binding):
 * - Read-only. MUST NOT call prisma.event.update/create/delete, mission
 *   mutations, availability rule writes, or conflict recompute on this path.
 * - Every event is passed through `canAccessEvent` + `projectSafeEvent`
 *   before anything else touches it. NO_ACCESS events are dropped entirely
 *   — never counted, never hinted at.
 * - Free text only ever searches fields the viewer is already authorized to
 *   see (see `buildAuthorizedSearchBlob`). `privateNotes` is never included
 *   unless the viewer has FULL (non-limited) access to the event.
 * - Conflict data is read via CC-06's `loadConflictsForViewEvents` (and a
 *   read-only disposition lookup) — never recomputed here.
 * - The raw `q` search string is never logged.
 */

import "server-only";

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import { accessLevelRank } from "@/lib/auth/access-level";
import { ValidationError } from "@/lib/security/safe-error";
import { isStandingWorkBlockEvent } from "@/lib/campaign/standing-work-blocks";
import { eventSheetHref } from "@/lib/calendar/event-sheet-href";
import { chicagoDateKey, chicagoDateKeysToUtcRange, chicagoTodayKey } from "@/lib/calendar/chicago-date";
import {
  applyRelativeDates,
  buildAuthorizedSearchBlob,
  canonicalizeCalendarQuery,
  matchEventAgainstQuery,
  parseCalendarQuery,
  type CalendarQueryContract,
  type CalendarSearchHit,
  CALENDAR_QUERY_FORWARD_DAYS_DEFAULT,
} from "@/lib/calendar/search";
import {
  DEFAULT_CAMPAIGN_KEY,
  loadActiveRulesAndExceptions,
} from "@/server/services/availability-service";
import { evaluateAvailability, type AvailabilityClassification } from "@/lib/calendar/availability";
import { loadConflictsForViewEvents } from "@/server/services/conflict-engine-service";
import type { Cc06OverlapEvent } from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";

/** Hard scan cap for a single search pass — protects the DB from unbounded queries. */
const SEARCH_SCAN_LIMIT = 1500;
/** Above this many candidates, skip the per-event availability evaluation pass. */
const AVAILABILITY_FILTER_SOFT_LIMIT = 300;
/** Facet result cap per dimension. */
const FACET_TOP_N = 12;

type ViewerAccess = "NO_ACCESS" | "AVAILABILITY_ONLY" | "VIEW_LIMITED" | "VIEW_FULL" | "FULL";

function mapAccessToViewer(level: string): ViewerAccess {
  const rank = accessLevelRank(level);
  if (rank <= 0) return "NO_ACCESS";
  if (rank === 1) return "AVAILABILITY_ONLY";
  if (rank <= 3) return "VIEW_LIMITED";
  if (rank <= 5) return "VIEW_FULL";
  return "FULL";
}

const SEARCH_EVENT_INCLUDE = {
  primaryCalendar: true,
  county: true,
  eventTags: { include: { tag: true } },
  eventOrganizations: { include: { organization: true } },
  campaignMission: {
    select: { id: true, missionStatus: true, lifecyclePhase: true },
  },
  eventPeople: {
    take: 10,
    include: { person: { select: { displayName: true } } },
  },
  externalIdentities: {
    take: 3,
    select: { id: true, provider: true, externalEventId: true },
  },
} satisfies Prisma.EventInclude;

type SearchEventRow = Prisma.EventGetPayload<{ include: typeof SEARCH_EVENT_INCLUDE }>;

type ProvenanceState = "LOCAL" | "IMPORTED_WITH_IDENTITY" | "IMPORTED_WITHOUT_IDENTITY";

function computeProvenanceState(event: SearchEventRow): ProvenanceState {
  if (!event.isImported) return "LOCAL";
  return event.externalIdentities.length > 0 ? "IMPORTED_WITH_IDENTITY" : "IMPORTED_WITHOUT_IDENTITY";
}

type CandidateEvent = {
  event: SearchEventRow;
  safe: NonNullable<ReturnType<typeof projectSafeEvent>>;
  score: number;
  reasons: import("@/lib/calendar/search").SearchMatchExplanation[];
};

/**
 * Parse + canonicalize + resolve relative dates for a raw query, enforcing
 * the campaign-key guard rail and (optionally) an allowed-filter list. This
 * is the one entry point API routes should call before touching the
 * database — it never throws for a malformed body, it returns a
 * `ValidationError` the route can translate to a 400.
 */
export function normalizeQueryForActor(input: {
  actor: AuthenticatedActor;
  raw: unknown;
  campaignKey?: string;
  allowedFilters?: readonly string[];
  now?: Date;
}): CalendarQueryContract {
  void input.actor;
  const parsed = parseCalendarQuery(input.raw, {
    campaignKey: input.campaignKey,
    allowedFilters: input.allowedFilters,
  });
  if (!parsed.ok) {
    throw new ValidationError(parsed.error);
  }
  return applyRelativeDates(parsed.query, input.now ?? new Date());
}

/** Build the deterministic Cc06 overlap-event shape from a canonical Event row. */
function toOverlapEvent(event: SearchEventRow): Cc06OverlapEvent {
  return {
    id: event.id,
    label: event.campaignDisplayTitle || event.internalTitle,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    candidateAttending: event.candidateAttendance !== false,
  };
}

async function loadCandidateWindow(query: CalendarQueryContract): Promise<{
  rows: SearchEventRow[];
  truncated: boolean;
}> {
  let rangeStart: Date;
  let rangeEnd: Date;
  if (query.dateFrom || query.dateTo) {
    const fromKey = query.dateFrom ?? query.dateTo!;
    const toKey = query.dateTo ?? query.dateFrom!;
    const range = chicagoDateKeysToUtcRange(fromKey, toKey);
    rangeStart = range.rangeStart;
    rangeEnd = range.rangeEnd;
  } else {
    // No range at all (no relative mode resolved, no viewMode default) —
    // fall back to a bounded forward window rather than an unbounded scan.
    const todayKey = chicagoTodayKey();
    const range = chicagoDateKeysToUtcRange(
      todayKey,
      todayKey,
    );
    rangeStart = new Date(range.rangeStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    rangeEnd = new Date(
      range.rangeEnd.getTime() + CALENDAR_QUERY_FORWARD_DAYS_DEFAULT * 24 * 60 * 60 * 1000,
    );
  }

  const where: Prisma.EventWhereInput = {
    startsAt: { lt: rangeEnd },
    endsAt: { gt: rangeStart },
    archivedAt: query.includeArchived ? undefined : null,
    status: query.includeCancelled ? undefined : { not: "CANCELLED" },
  };

  const rows = await prisma.event.findMany({
    where,
    include: SEARCH_EVENT_INCLUDE,
    orderBy: { startsAt: "asc" },
    take: SEARCH_SCAN_LIMIT + 1,
  });

  const truncated = rows.length > SEARCH_SCAN_LIMIT;
  return { rows: truncated ? rows.slice(0, SEARCH_SCAN_LIMIT) : rows, truncated };
}

function passesStructuredFilters(event: SearchEventRow, query: CalendarQueryContract): boolean {
  if (query.calendarIds?.length && !query.calendarIds.includes(event.primaryCalendarId)) {
    return false;
  }
  if (query.statuses?.length && !query.statuses.includes(event.status)) return false;
  if (query.eventTypes?.length && (!event.eventType || !query.eventTypes.includes(event.eventType))) {
    return false;
  }
  if (query.tags?.length) {
    const eventTagNames = event.eventTags.map((t) => t.tag.slug.toLowerCase());
    const wanted = query.tags.map((t) => t.toLowerCase());
    if (!wanted.some((t) => eventTagNames.includes(t))) return false;
  }
  if (query.countyIds?.length && (!event.countyId || !query.countyIds.includes(event.countyId))) {
    return false;
  }
  if (query.sourceTypes?.length && !query.sourceTypes.includes(event.sourceType)) return false;
  if (query.importedOnly && !event.isImported) return false;
  if (query.localOnly && event.isImported) return false;
  if (query.provenanceStates?.length) {
    if (!query.provenanceStates.includes(computeProvenanceState(event))) return false;
  }
  if (query.missionLinked !== undefined) {
    const linked = Boolean(event.campaignMission);
    if (query.missionLinked !== linked) return false;
  }
  if (query.missionStatuses?.length) {
    if (!event.campaignMission || !query.missionStatuses.includes(event.campaignMission.missionStatus)) {
      return false;
    }
  }
  if (query.timedOnly && event.isAllDay) return false;
  if (query.allDayOnly && !event.isAllDay) return false;
  if (query.overnightOrMultiDay && !event.isMultiDay) return false;
  if (query.recurringOnly && !event.isRecurring) return false;
  if (query.nonRecurringOnly && event.isRecurring) return false;
  if (query.seriesId && event.recurrenceSeriesId !== query.seriesId) return false;
  return true;
}

/**
 * Load + authorize + filter candidate events for a canonical query, up to
 * (but not including) pagination. Shared by `searchCalendarEvents` and
 * `getSearchFacets` so facets are always computed over the same
 * already-authorized result set the operator is looking at.
 */
async function loadAuthorizedCandidates(input: {
  actor: AuthenticatedActor;
  query: CalendarQueryContract;
  campaignKey: string;
}): Promise<{ candidates: CandidateEvent[]; truncated: boolean; partialResults: boolean }> {
  const { actor, query, campaignKey } = input;
  const { rows, truncated } = await loadCandidateWindow(query);

  const structurallyFiltered = rows.filter(
    (event) =>
      !isStandingWorkBlockEvent({
        eventType: event.eventType,
        internalTitle: event.internalTitle,
        campaignDisplayTitle: event.campaignDisplayTitle,
        privateNotes: event.privateNotes,
        sourceType: event.sourceType,
      }) && passesStructuredFilters(event, query),
  );

  const authorized: Array<{ event: SearchEventRow; safe: NonNullable<ReturnType<typeof projectSafeEvent>> }> = [];
  for (const event of structurallyFiltered) {
    const access = await canAccessEvent({ eventId: event.id, viewerUserId: actor.userId });
    if (!access.allowed) continue; // NO_ACCESS — dropped entirely, never counted.
    const safe = projectSafeEvent({
      event,
      calendar: event.primaryCalendar,
      viewerAccess: mapAccessToViewer(access.accessLevel),
    });
    if (!safe) continue;

    if (query.visibilityLevels?.length && !query.visibilityLevels.includes(safe.visibilityLevel)) {
      continue;
    }
    if (query.locationText) {
      const label = safe.location?.label ?? "";
      if (!label.toLowerCase().includes(query.locationText.toLowerCase())) continue;
    }
    if (query.organizationText || (query.peopleNames?.length ?? 0) > 0) {
      // Organization/person filters only ever apply to events the viewer
      // has full participant visibility for — limited events simply never
      // match rather than leaking a name the viewer is not entitled to see.
      if (!safe.capabilities.canViewParticipants) continue;
      if (query.organizationText) {
        const names = event.eventOrganizations.map((eo) => eo.organization.name.toLowerCase());
        if (!names.some((n) => n.includes(query.organizationText!.toLowerCase()))) continue;
      }
      if (query.peopleNames?.length) {
        const names = event.eventPeople.map((ep) => ep.person.displayName.toLowerCase());
        const wanted = query.peopleNames.map((p) => p.toLowerCase());
        if (!wanted.some((w) => names.some((n) => n.includes(w)))) continue;
      }
    }

    authorized.push({ event, safe });
  }

  let candidates: CandidateEvent[] = [];
  for (const { event, safe } of authorized) {
    const blob = buildAuthorizedSearchBlob({
      title: safe.title,
      eventNumber: safe.eventNumber,
      locationLabel: safe.location?.label ?? null,
      calendarName: safe.primaryCalendar.name,
      countyName: event.county?.name ?? null,
      organizationNames: safe.capabilities.canViewParticipants
        ? event.eventOrganizations.map((eo) => eo.organization.name)
        : [],
      peopleNames: safe.capabilities.canViewParticipants
        ? event.eventPeople.map((ep) => ep.person.displayName)
        : [],
      tags: event.eventTags.map((t) => t.tag.name),
      eventType: event.eventType,
      eventSubtype: event.eventSubtype,
      status: safe.status,
      privateNotes: safe.capabilities.canViewNotes ? event.privateNotes : null,
      viewerHasFullNotesAccess: safe.capabilities.canViewNotes,
    });
    const matchResult = matchEventAgainstQuery(blob, query);
    if (!matchResult.matched) continue;
    candidates.push({ event, safe, score: matchResult.score, reasons: matchResult.reasons });
  }

  let partialResults = false;

  if (query.availabilityClassifications?.length) {
    if (candidates.length > AVAILABILITY_FILTER_SOFT_LIMIT) {
      // Deliberately skip the expensive per-event evaluation rather than
      // silently mis-filtering — report the truth via `partialResults`.
      partialResults = true;
    } else {
      const { rules, exceptions } = await loadActiveRulesAndExceptions(campaignKey);
      const wanted = new Set(query.availabilityClassifications);
      candidates = candidates.filter(({ event }) => {
        const assessment = evaluateAvailability({
          rules,
          exceptions,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          timezone: event.timezone,
          isAllDay: event.isAllDay,
          eventStatus: event.status,
          subjectType: "CANDIDATE",
        });
        return wanted.has(assessment.classification as AvailabilityClassification);
      });
    }
  }

  const needsConflictFilter =
    query.conflictActive !== undefined ||
    Boolean(query.conflictTypes?.length) ||
    Boolean(query.conflictSeverities?.length) ||
    Boolean(query.conflictDispositions?.length);

  if (needsConflictFilter && candidates.length > 0) {
    const candidateIds = candidates.map((c) => c.event.id);
    const overlapEvents = candidates.map((c) => toOverlapEvent(c.event));
    let merged: OperationalConflict[] = [];
    try {
      merged = await loadConflictsForViewEvents(overlapEvents, campaignKey);
    } catch {
      merged = [];
    }

    const conflictsByEvent = new Map<string, OperationalConflict[]>();
    const candidateIdSet = new Set(candidateIds);
    for (const conflict of merged) {
      const ids = [conflict.primaryEntity.id, conflict.relatedEntity?.id].filter(
        (id): id is string => Boolean(id) && candidateIdSet.has(id!),
      );
      for (const id of ids) {
        const list = conflictsByEvent.get(id) ?? [];
        list.push(conflict);
        conflictsByEvent.set(id, list);
      }
    }

    let dispositionEventIds: Set<string> | null = null;
    if (query.conflictDispositions?.length) {
      const rows = await prisma.operationalConflictRecord.findMany({
        where: {
          campaignKey,
          disposition: { in: query.conflictDispositions },
          OR: [
            { primaryEntityId: { in: candidateIds } },
            { relatedEntityId: { in: candidateIds } },
          ],
        },
        select: { primaryEntityId: true, relatedEntityId: true },
      });
      dispositionEventIds = new Set<string>();
      for (const row of rows) {
        if (candidateIdSet.has(row.primaryEntityId)) dispositionEventIds.add(row.primaryEntityId);
        if (row.relatedEntityId && candidateIdSet.has(row.relatedEntityId)) {
          dispositionEventIds.add(row.relatedEntityId);
        }
      }
    }

    candidates = candidates.filter(({ event }) => {
      let conflicts = conflictsByEvent.get(event.id) ?? [];
      if (query.conflictTypes?.length) {
        conflicts = conflicts.filter((c) => query.conflictTypes!.includes(c.conflictType));
      }
      if (query.conflictSeverities?.length) {
        conflicts = conflicts.filter((c) => query.conflictSeverities!.includes(c.severity));
      }
      let hasMatch = conflicts.length > 0;
      if (dispositionEventIds) hasMatch = hasMatch && dispositionEventIds.has(event.id);

      if (query.conflictActive === true) return hasMatch;
      if (query.conflictActive === false) return !hasMatch;
      // No explicit conflictActive, but type/severity/disposition filters
      // were supplied — treat as "must have a matching conflict".
      return hasMatch;
    });
  }

  if (query.integrityFinding?.length && candidates.length > 0) {
    const candidateIds = candidates.map((c) => c.event.id);
    const findings = await prisma.calendarIntegrityFinding.findMany({
      where: {
        campaignKey,
        findingType: { in: query.integrityFinding },
        state: { notIn: ["RESOLVED", "NOT_APPLICABLE"] },
        OR: [
          { primaryEventId: { in: candidateIds } },
          { relatedEventIds: { hasSome: candidateIds } },
        ],
      },
      select: { primaryEventId: true, relatedEventIds: true },
    });
    const flaggedIds = new Set<string>();
    for (const finding of findings) {
      if (finding.primaryEventId) flaggedIds.add(finding.primaryEventId);
      for (const id of finding.relatedEventIds) flaggedIds.add(id);
    }
    candidates = candidates.filter(({ event }) => flaggedIds.has(event.id));
  }

  return { candidates, truncated, partialResults };
}

function sortCandidates(candidates: CandidateEvent[], query: CalendarQueryContract): CandidateEvent[] {
  const field = query.sort?.field ?? "relevance";
  const direction = query.sort?.direction ?? (field === "relevance" ? "desc" : "asc");
  const sign = direction === "asc" ? 1 : -1;

  return [...candidates].sort((a, b) => {
    let primary = 0;
    switch (field) {
      case "relevance":
        primary = (a.score - b.score) * sign;
        break;
      case "startsAt":
        primary = (a.event.startsAt.getTime() - b.event.startsAt.getTime()) * sign;
        break;
      case "title":
        primary = a.safe.title.localeCompare(b.safe.title) * sign;
        break;
      case "updatedAt":
        primary = (a.event.updatedAt.getTime() - b.event.updatedAt.getTime()) * sign;
        break;
      default:
        primary = 0;
    }
    if (primary !== 0) return primary;
    // Deterministic tiebreak: always finish with chronological order.
    return a.event.startsAt.getTime() - b.event.startsAt.getTime();
  });
}

function toHit(candidate: CandidateEvent): CalendarSearchHit {
  const { event, safe, reasons, score } = candidate;
  return {
    eventId: event.id,
    eventNumber: event.eventNumber,
    title: safe.title,
    startsAt: safe.startsAt,
    endsAt: safe.endsAt,
    dateKey: chicagoDateKey(event.startsAt),
    href: eventSheetHref(event.id),
    matchReasons: reasons,
    score,
    calendarName: safe.primaryCalendar.name,
    locationLabel: safe.location?.label,
    status: safe.status,
  };
}

export type SearchCalendarEventsResult = {
  query: CalendarQueryContract;
  results: CalendarSearchHit[];
  totalUniqueEvents: number;
  truncated: boolean;
  partialResults: boolean;
  page: number;
  pageSize: number;
};

/**
 * `/api/calendar/search` GET. Read-only across the entire path — no Event,
 * Mission, availability, or conflict writes ever occur here.
 */
export async function searchCalendarEvents(input: {
  actor: AuthenticatedActor;
  rawQuery: unknown;
  campaignKey?: string;
  allowedFilters?: readonly string[];
}): Promise<SearchCalendarEventsResult> {
  await requireAuthorized(input.actor, { action: "EVENT_VIEW", resource: { type: "system" } });

  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const query = normalizeQueryForActor({
    actor: input.actor,
    raw: input.rawQuery,
    campaignKey: input.campaignKey,
    allowedFilters: input.allowedFilters,
  });

  const { candidates, truncated, partialResults } = await loadAuthorizedCandidates({
    actor: input.actor,
    query,
    campaignKey,
  });

  const sorted = sortCandidates(candidates, query);

  // Count unique events once — search never expands multi-day display
  // segments into duplicate rows the way the month grid does.
  const totalUniqueEvents = sorted.length;

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 50;
  const startIndex = (page - 1) * pageSize;
  const pageSlice = sorted.slice(startIndex, startIndex + pageSize);

  return {
    query: canonicalizeCalendarQuery(query),
    results: pageSlice.map(toHit),
    totalUniqueEvents,
    truncated,
    partialResults,
    page,
    pageSize,
  };
}

export type SearchFacetBucket = { value: string; label: string; count: number };

export type SearchFacets = {
  calendars: SearchFacetBucket[];
  statuses: SearchFacetBucket[];
  eventTypes: SearchFacetBucket[];
  truncated: boolean;
  partialResults: boolean;
};

/**
 * Safe facet counts computed strictly over the already-authorized,
 * already-filtered candidate set for this query — never a raw table scan,
 * never a count that could hint at events the viewer cannot see.
 */
export async function getSearchFacets(input: {
  actor: AuthenticatedActor;
  rawQuery: unknown;
  campaignKey?: string;
  allowedFilters?: readonly string[];
}): Promise<SearchFacets> {
  await requireAuthorized(input.actor, { action: "EVENT_VIEW", resource: { type: "system" } });

  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const query = normalizeQueryForActor({
    actor: input.actor,
    raw: input.rawQuery,
    campaignKey: input.campaignKey,
    allowedFilters: input.allowedFilters,
  });

  const { candidates, truncated, partialResults } = await loadAuthorizedCandidates({
    actor: input.actor,
    query,
    campaignKey,
  });

  const bucket = (key: string, label: string, map: Map<string, SearchFacetBucket>) => {
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { value: key, label, count: 1 });
  };

  const calendarMap = new Map<string, SearchFacetBucket>();
  const statusMap = new Map<string, SearchFacetBucket>();
  const eventTypeMap = new Map<string, SearchFacetBucket>();

  for (const { event, safe } of candidates) {
    bucket(safe.primaryCalendar.id, safe.primaryCalendar.name, calendarMap);
    bucket(safe.status, safe.status, statusMap);
    if (event.eventType) bucket(event.eventType, event.eventType, eventTypeMap);
  }

  const topN = (map: Map<string, SearchFacetBucket>) =>
    [...map.values()].sort((a, b) => b.count - a.count).slice(0, FACET_TOP_N);

  return {
    calendars: topN(calendarMap),
    statuses: topN(statusMap),
    eventTypes: topN(eventTypeMap),
    truncated,
    partialResults,
  };
}
