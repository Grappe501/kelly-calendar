/**
 * CC-07 Unified Search, Filters & Saved Views — shared type contracts.
 * Build: KCCC-CC-07-UNIFIED-SEARCH-FILTERS-SAVED-VIEWS-1.0
 * Authorized under ADR-095 (CC-07) via standing execution ADR-094.
 *
 * Pure types only — no `server-only` / Prisma imports so both the API layer
 * and any future client-side view state can share this module.
 *
 * Hard constraints carried by every consumer of this contract:
 * - Never a mutation surface. Nothing in this module mutates Events,
 *   Missions, availability rules, or conflict records.
 * - Never leaks the existence of a NO_ACCESS event — callers must already
 *   have filtered those out before anything here is applied.
 */

/** Bump only with an explicit migration path in `migrateLegacyFiltersJson`. */
export const CALENDAR_QUERY_SCHEMA_VERSION = 1 as const;

export type SavedViewVisibility = "PRIVATE" | "CAMPAIGN_SHARED" | "ROLE_RESTRICTED";

export const SAVED_VIEW_VISIBILITIES: readonly SavedViewVisibility[] = [
  "PRIVATE",
  "CAMPAIGN_SHARED",
  "ROLE_RESTRICTED",
];

export type RelativeDateMode = "FIXED" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "NEXT_N_DAYS";

export const RELATIVE_DATE_MODES: readonly RelativeDateMode[] = [
  "FIXED",
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "NEXT_N_DAYS",
];

export type ViewMode = "today" | "day" | "week" | "month" | "agenda" | "ops" | "search";

export const VIEW_MODES: readonly ViewMode[] = [
  "today",
  "day",
  "week",
  "month",
  "agenda",
  "ops",
  "search",
];

export type CalendarQuerySortField = "relevance" | "startsAt" | "title" | "updatedAt";

export const CALENDAR_QUERY_SORT_FIELDS: readonly CalendarQuerySortField[] = [
  "relevance",
  "startsAt",
  "title",
  "updatedAt",
];

export type CalendarQuerySortDirection = "asc" | "desc";

export type CalendarQuerySort = {
  field: CalendarQuerySortField;
  direction: CalendarQuerySortDirection;
};

export type CalendarQueryGrouping =
  | "none"
  | "day"
  | "week"
  | "month"
  | "calendar"
  | "county"
  | "mission";

export const CALENDAR_QUERY_GROUPINGS: readonly CalendarQueryGrouping[] = [
  "none",
  "day",
  "week",
  "month",
  "calendar",
  "county",
  "mission",
];

/**
 * The canonical, versioned Calendar query contract. Every field is optional
 * except `schemaVersion` — an absent field means "no filter", never "empty
 * result". Serialized into `CalendarSavedView.filtersJson` /
 * `CalendarSavedView.queryJson` and into `/api/calendar/search` query
 * strings via `serializeCalendarQuery`.
 */
export type CalendarQueryContract = {
  schemaVersion: 1;

  /** Free-text search string. Never logged raw (see calendar-search-service). */
  q?: string;

  /** Chicago calendar date key (YYYY-MM-DD), inclusive. */
  dateFrom?: string;
  /** Chicago calendar date key (YYYY-MM-DD), inclusive. */
  dateTo?: string;
  relativeDateMode?: RelativeDateMode;
  /** Forward window size in days for NEXT_N_DAYS / agenda-search defaults. */
  forwardDays?: number;

  viewMode?: ViewMode;

  calendarIds?: string[];
  statuses?: string[];
  eventTypes?: string[];
  tags?: string[];
  countyIds?: string[];
  locationText?: string;
  organizationText?: string;
  peopleNames?: string[];

  sourceTypes?: string[];
  importedOnly?: boolean;
  localOnly?: boolean;
  provenanceStates?: string[];

  missionLinked?: boolean;
  missionStatuses?: string[];

  timedOnly?: boolean;
  allDayOnly?: boolean;
  overnightOrMultiDay?: boolean;
  recurringOnly?: boolean;
  nonRecurringOnly?: boolean;
  seriesId?: string;

  availabilityClassifications?: string[];

  conflictActive?: boolean;
  conflictTypes?: string[];
  conflictSeverities?: string[];
  conflictDispositions?: string[];

  integrityFinding?: string[];

  visibilityLevels?: string[];
  includeCancelled?: boolean;
  includeArchived?: boolean;

  sort?: CalendarQuerySort;
  grouping?: CalendarQueryGrouping;
  timezone?: string;

  /** Multi-campaign guard rail — see query-contract.ts authorization checks. */
  campaignKey?: string;
  savedViewId?: string;

  page?: number;
  pageSize?: number;
};

/** String-array fields — used for canonicalization (sort+dedupe) and key enumeration. */
export const CALENDAR_QUERY_ARRAY_FIELDS = [
  "calendarIds",
  "statuses",
  "eventTypes",
  "tags",
  "countyIds",
  "peopleNames",
  "sourceTypes",
  "provenanceStates",
  "missionStatuses",
  "availabilityClassifications",
  "conflictTypes",
  "conflictSeverities",
  "conflictDispositions",
  "integrityFinding",
  "visibilityLevels",
] as const satisfies readonly (keyof CalendarQueryContract)[];

export const CALENDAR_QUERY_BOOLEAN_FIELDS = [
  "importedOnly",
  "localOnly",
  "missionLinked",
  "timedOnly",
  "allDayOnly",
  "overnightOrMultiDay",
  "recurringOnly",
  "nonRecurringOnly",
  "conflictActive",
  "includeCancelled",
  "includeArchived",
] as const satisfies readonly (keyof CalendarQueryContract)[];

export const CALENDAR_QUERY_STRING_FIELDS = [
  "q",
  "dateFrom",
  "dateTo",
  "locationText",
  "organizationText",
  "seriesId",
  "timezone",
  "campaignKey",
  "savedViewId",
] as const satisfies readonly (keyof CalendarQueryContract)[];

/** Every recognized top-level filter key — used to reject unknown filters. */
export const CALENDAR_QUERY_KNOWN_KEYS: readonly string[] = [
  "schemaVersion",
  ...CALENDAR_QUERY_STRING_FIELDS,
  "relativeDateMode",
  "forwardDays",
  "viewMode",
  ...CALENDAR_QUERY_ARRAY_FIELDS,
  ...CALENDAR_QUERY_BOOLEAN_FIELDS,
  "sort",
  "grouping",
  "page",
  "pageSize",
];

export const CALENDAR_QUERY_PAGE_SIZE_MIN = 1;
export const CALENDAR_QUERY_PAGE_SIZE_MAX = 100;
export const CALENDAR_QUERY_PAGE_SIZE_DEFAULT = 50;
export const CALENDAR_QUERY_FORWARD_DAYS_DEFAULT = 90;

export type SearchMatchExplanation = {
  field: string;
  label: string;
  snippet?: string;
};

export type CalendarSearchHit = {
  eventId: string;
  eventNumber?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  dateKey: string;
  href: string;
  matchReasons: SearchMatchExplanation[];
  score: number;
  calendarName?: string;
  locationLabel?: string | null;
  status?: string;
};

export type ParseCalendarQueryOptions = {
  /**
   * If provided, any filter key present in the raw input that is not in
   * this list (beyond the always-allowed base fields) is rejected as
   * unauthorized. Base fields (q, paging, sort, viewMode, dates, timezone,
   * savedViewId, campaignKey) are always allowed.
   */
  allowedFilters?: readonly string[];
  /** The viewer's bound campaign key. A mismatched client-supplied campaignKey is rejected. */
  campaignKey?: string;
};

export type ParseCalendarQueryResult =
  | { ok: true; query: CalendarQueryContract }
  | { ok: false; error: string; unauthorized?: boolean };
