/**
 * CC-07 Unified Search — the Calendar query contract: parse, canonicalize,
 * serialize, resolve relative dates, and migrate legacy `filtersJson`.
 *
 * Pure module — no `server-only` / Prisma imports. Callers on the server
 * (calendar-search-service, calendar-saved-view-service) own authorization
 * decisions about *which* filters a viewer may use; this module only knows
 * how to validate shape and (optionally) enforce an explicit allow-list
 * passed in by the caller.
 */

import {
  CALENDAR_QUERY_ARRAY_FIELDS,
  CALENDAR_QUERY_BOOLEAN_FIELDS,
  CALENDAR_QUERY_FORWARD_DAYS_DEFAULT,
  CALENDAR_QUERY_GROUPINGS,
  CALENDAR_QUERY_KNOWN_KEYS,
  CALENDAR_QUERY_PAGE_SIZE_DEFAULT,
  CALENDAR_QUERY_PAGE_SIZE_MAX,
  CALENDAR_QUERY_PAGE_SIZE_MIN,
  CALENDAR_QUERY_SCHEMA_VERSION,
  CALENDAR_QUERY_SORT_FIELDS,
  RELATIVE_DATE_MODES,
  VIEW_MODES,
  type CalendarQueryContract,
  type CalendarQueryGrouping,
  type CalendarQuerySort,
  type ParseCalendarQueryOptions,
  type ParseCalendarQueryResult,
  type RelativeDateMode,
  type ViewMode,
} from "@/lib/calendar/search/types";
import {
  chicagoTodayKey,
  monthDateKeys,
  shiftChicagoDateKey,
  weekDateKeys,
} from "@/lib/calendar/chicago-date";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fields that are paging/sort/view mechanics rather than access-sensitive
 * data filters. Always allowed even when `options.allowedFilters` is set.
 */
const ALWAYS_ALLOWED_KEYS = new Set<string>([
  "schemaVersion",
  "q",
  "dateFrom",
  "dateTo",
  "relativeDateMode",
  "forwardDays",
  "viewMode",
  "sort",
  "grouping",
  "timezone",
  "savedViewId",
  "campaignKey",
  "page",
  "pageSize",
]);

type RawValue = string | string[] | boolean | number | undefined;
type RawRecord = Record<string, RawValue>;

function isUrlSearchParams(value: unknown): value is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams;
}

function toRawRecord(input: unknown): { record: RawRecord; keys: string[] } | { error: string } {
  if (input === null || input === undefined) {
    return { record: {}, keys: [] };
  }

  if (isUrlSearchParams(input)) {
    const record: RawRecord = {};
    const seen = new Set<string>();
    for (const key of input.keys()) seen.add(key);
    for (const key of seen) {
      const values = input.getAll(key);
      if (values.length > 1) {
        record[key] = values;
      } else {
        const single = values[0] ?? "";
        record[key] = single.includes(",")
          ? single
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : single;
      }
    }
    return { record, keys: [...seen] };
  }

  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const record: RawRecord = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        record[key] = value.map((v) => String(v));
      } else if (typeof value === "boolean" || typeof value === "number") {
        record[key] = value;
      } else if (typeof value === "string") {
        record[key] = value;
      } else if (key === "sort" && typeof value === "object") {
        const sortObj = value as { field?: unknown; direction?: unknown };
        record[key] = `${String(sortObj.field ?? "")}:${String(sortObj.direction ?? "asc")}`;
      } else {
        return { error: `Unsupported value type for filter "${key}".` };
      }
    }
    return { record, keys: Object.keys(record) };
  }

  return { error: "Query input must be an object, URLSearchParams, or nullish." };
}

function coerceStringArray(value: RawValue): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  const str = String(value).trim();
  if (!str) return undefined;
  const cleaned = str
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

function coerceBoolean(value: RawValue): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = Array.isArray(value) ? value[0] : value;
  const s = String(raw ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off", ""].includes(s)) return false;
  return undefined;
}

function coerceNumber(value: RawValue): number | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function coerceString(value: RawValue): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const s = String(raw ?? "");
  return s.length > 0 ? s : undefined;
}

function parseSortValue(value: RawValue): CalendarQuerySort | "invalid" | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : String(value);
  if (!raw) return undefined;
  const [fieldRaw, directionRaw] = raw.split(":");
  const field = fieldRaw?.trim();
  const direction = (directionRaw?.trim() || "asc") as CalendarQuerySort["direction"];
  if (!field || !CALENDAR_QUERY_SORT_FIELDS.includes(field as never)) return "invalid";
  if (direction !== "asc" && direction !== "desc") return "invalid";
  return { field: field as CalendarQuerySort["field"], direction };
}

/**
 * Parse + validate a raw query (URLSearchParams from a GET request, a plain
 * object from a JSON body, or an already-loose `unknown`) into the
 * canonical `CalendarQueryContract`. Rejects unknown keys and, when
 * `options.allowedFilters` is supplied, rejects filters the caller has not
 * explicitly authorized for this viewer.
 */
export function parseCalendarQuery(
  input: unknown,
  options: ParseCalendarQueryOptions = {},
): ParseCalendarQueryResult {
  const rawResult = toRawRecord(input);
  if ("error" in rawResult) return { ok: false, error: rawResult.error };
  const { record, keys } = rawResult;

  for (const key of keys) {
    if (!CALENDAR_QUERY_KNOWN_KEYS.includes(key)) {
      return { ok: false, error: `Unknown calendar query filter: "${key}".` };
    }
  }

  if (options.allowedFilters) {
    const allowed = new Set<string>([...ALWAYS_ALLOWED_KEYS, ...options.allowedFilters]);
    for (const key of keys) {
      if (!allowed.has(key)) {
        return {
          ok: false,
          error: `Filter "${key}" is not authorized for this viewer.`,
          unauthorized: true,
        };
      }
    }
  }

  const suppliedCampaignKey = coerceString(record.campaignKey);
  if (suppliedCampaignKey && options.campaignKey && suppliedCampaignKey !== options.campaignKey) {
    return {
      ok: false,
      error: "campaignKey does not match the authorized campaign for this session.",
      unauthorized: true,
    };
  }

  const query: CalendarQueryContract = { schemaVersion: CALENDAR_QUERY_SCHEMA_VERSION };

  const q = coerceString(record.q);
  if (q !== undefined) query.q = q;

  const dateFrom = coerceString(record.dateFrom);
  if (dateFrom !== undefined) {
    if (!DATE_KEY_RE.test(dateFrom)) return { ok: false, error: "dateFrom must be YYYY-MM-DD." };
    query.dateFrom = dateFrom;
  }
  const dateTo = coerceString(record.dateTo);
  if (dateTo !== undefined) {
    if (!DATE_KEY_RE.test(dateTo)) return { ok: false, error: "dateTo must be YYYY-MM-DD." };
    query.dateTo = dateTo;
  }
  if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom) {
    return { ok: false, error: "dateTo must not be before dateFrom." };
  }

  const relativeDateMode = coerceString(record.relativeDateMode);
  if (relativeDateMode !== undefined) {
    if (!RELATIVE_DATE_MODES.includes(relativeDateMode as RelativeDateMode)) {
      return { ok: false, error: `Unknown relativeDateMode: "${relativeDateMode}".` };
    }
    query.relativeDateMode = relativeDateMode as RelativeDateMode;
  }

  const forwardDays = coerceNumber(record.forwardDays);
  if (forwardDays !== undefined) {
    if (!Number.isInteger(forwardDays) || forwardDays < 1 || forwardDays > 365) {
      return { ok: false, error: "forwardDays must be an integer between 1 and 365." };
    }
    query.forwardDays = forwardDays;
  }

  const viewMode = coerceString(record.viewMode);
  if (viewMode !== undefined) {
    if (!VIEW_MODES.includes(viewMode as ViewMode)) {
      return { ok: false, error: `Unknown viewMode: "${viewMode}".` };
    }
    query.viewMode = viewMode as ViewMode;
  }

  for (const field of CALENDAR_QUERY_ARRAY_FIELDS) {
    const arr = coerceStringArray(record[field]);
    if (arr !== undefined) (query as Record<string, unknown>)[field] = arr;
  }

  for (const field of CALENDAR_QUERY_BOOLEAN_FIELDS) {
    const bool = coerceBoolean(record[field]);
    if (bool !== undefined) (query as Record<string, unknown>)[field] = bool;
  }

  const locationText = coerceString(record.locationText);
  if (locationText !== undefined) query.locationText = locationText;
  const organizationText = coerceString(record.organizationText);
  if (organizationText !== undefined) query.organizationText = organizationText;
  const seriesId = coerceString(record.seriesId);
  if (seriesId !== undefined) query.seriesId = seriesId;
  const timezone = coerceString(record.timezone);
  if (timezone !== undefined) query.timezone = timezone;
  const savedViewId = coerceString(record.savedViewId);
  if (savedViewId !== undefined) query.savedViewId = savedViewId;
  if (suppliedCampaignKey !== undefined) query.campaignKey = suppliedCampaignKey;

  if (record.sort !== undefined) {
    const parsedSort = parseSortValue(record.sort);
    if (parsedSort === "invalid") {
      return { ok: false, error: "Invalid sort. Use field:direction, e.g. startsAt:asc." };
    }
    if (parsedSort) query.sort = parsedSort;
  }

  const grouping = coerceString(record.grouping);
  if (grouping !== undefined) {
    if (!CALENDAR_QUERY_GROUPINGS.includes(grouping as CalendarQueryGrouping)) {
      return { ok: false, error: `Unknown grouping: "${grouping}".` };
    }
    query.grouping = grouping as CalendarQueryGrouping;
  }

  const page = coerceNumber(record.page);
  if (page !== undefined) {
    if (!Number.isInteger(page) || page < 1) {
      return { ok: false, error: "page must be a positive integer." };
    }
    query.page = page;
  }
  const pageSize = coerceNumber(record.pageSize);
  if (pageSize !== undefined) {
    if (!Number.isInteger(pageSize)) {
      return { ok: false, error: "pageSize must be an integer." };
    }
    query.pageSize = pageSize;
  }

  if (query.timedOnly && query.allDayOnly) {
    return { ok: false, error: "timedOnly and allDayOnly are mutually exclusive." };
  }
  if (query.recurringOnly && query.nonRecurringOnly) {
    return { ok: false, error: "recurringOnly and nonRecurringOnly are mutually exclusive." };
  }

  return { ok: true, query: canonicalizeCalendarQuery(query) };
}

/**
 * Normalize a query to its stable, comparable form: sorted/deduped arrays,
 * trimmed strings (empty → omitted), clamped paging, and a pinned
 * `schemaVersion`. Two contracts describing the same filters always
 * canonicalize to deep-equal objects.
 */
export function canonicalizeCalendarQuery(query: CalendarQueryContract): CalendarQueryContract {
  const out: CalendarQueryContract = { schemaVersion: CALENDAR_QUERY_SCHEMA_VERSION };

  const q = query.q?.trim();
  if (q) out.q = q;

  if (query.dateFrom) out.dateFrom = query.dateFrom;
  if (query.dateTo) out.dateTo = query.dateTo;
  if (query.relativeDateMode) out.relativeDateMode = query.relativeDateMode;
  if (query.forwardDays !== undefined) out.forwardDays = query.forwardDays;
  if (query.viewMode) out.viewMode = query.viewMode;

  for (const field of CALENDAR_QUERY_ARRAY_FIELDS) {
    const value = query[field] as string[] | undefined;
    if (value && value.length > 0) {
      const cleaned = [...new Set(value.map((v) => v.trim()).filter(Boolean))].sort();
      if (cleaned.length > 0) (out as Record<string, unknown>)[field] = cleaned;
    }
  }

  for (const field of CALENDAR_QUERY_BOOLEAN_FIELDS) {
    const value = query[field] as boolean | undefined;
    if (value !== undefined) (out as Record<string, unknown>)[field] = value;
  }

  const locationText = query.locationText?.trim();
  if (locationText) out.locationText = locationText;
  const organizationText = query.organizationText?.trim();
  if (organizationText) out.organizationText = organizationText;
  const seriesId = query.seriesId?.trim();
  if (seriesId) out.seriesId = seriesId;
  const timezone = query.timezone?.trim();
  if (timezone) out.timezone = timezone;
  const savedViewId = query.savedViewId?.trim();
  if (savedViewId) out.savedViewId = savedViewId;
  const campaignKey = query.campaignKey?.trim();
  if (campaignKey) out.campaignKey = campaignKey;

  if (query.sort) out.sort = { ...query.sort };
  if (query.grouping) out.grouping = query.grouping;

  out.pageSize = Math.min(
    CALENDAR_QUERY_PAGE_SIZE_MAX,
    Math.max(CALENDAR_QUERY_PAGE_SIZE_MIN, query.pageSize ?? CALENDAR_QUERY_PAGE_SIZE_DEFAULT),
  );
  out.page = Math.max(1, query.page ?? 1);

  return out;
}

/**
 * Serialize a canonical query to a stable URLSearchParams string. Omits
 * empty/default values so two equivalent queries always serialize
 * identically. Never includes anything beyond the documented filter
 * surface — no secrets ever pass through this contract.
 */
export function serializeCalendarQuery(query: CalendarQueryContract): string {
  const canonical = canonicalizeCalendarQuery(query);
  const params = new URLSearchParams();

  if (canonical.q) params.set("q", canonical.q);
  if (canonical.dateFrom) params.set("dateFrom", canonical.dateFrom);
  if (canonical.dateTo) params.set("dateTo", canonical.dateTo);
  if (canonical.relativeDateMode && canonical.relativeDateMode !== "FIXED") {
    params.set("relativeDateMode", canonical.relativeDateMode);
  }
  if (canonical.forwardDays && canonical.forwardDays !== CALENDAR_QUERY_FORWARD_DAYS_DEFAULT) {
    params.set("forwardDays", String(canonical.forwardDays));
  }
  if (canonical.viewMode) params.set("viewMode", canonical.viewMode);

  for (const field of CALENDAR_QUERY_ARRAY_FIELDS) {
    const value = canonical[field] as string[] | undefined;
    if (value && value.length > 0) params.set(field, value.join(","));
  }
  for (const field of CALENDAR_QUERY_BOOLEAN_FIELDS) {
    const value = canonical[field] as boolean | undefined;
    if (value === true) params.set(field, "1");
    else if (value === false) params.set(field, "0");
  }

  if (canonical.locationText) params.set("locationText", canonical.locationText);
  if (canonical.organizationText) params.set("organizationText", canonical.organizationText);
  if (canonical.seriesId) params.set("seriesId", canonical.seriesId);
  if (canonical.timezone) params.set("timezone", canonical.timezone);
  if (canonical.campaignKey) params.set("campaignKey", canonical.campaignKey);
  if (canonical.savedViewId) params.set("savedViewId", canonical.savedViewId);

  if (canonical.sort) params.set("sort", `${canonical.sort.field}:${canonical.sort.direction}`);
  if (canonical.grouping && canonical.grouping !== "none") params.set("grouping", canonical.grouping);

  if (canonical.page && canonical.page !== 1) params.set("page", String(canonical.page));
  if (canonical.pageSize && canonical.pageSize !== CALENDAR_QUERY_PAGE_SIZE_DEFAULT) {
    params.set("pageSize", String(canonical.pageSize));
  }

  return params.toString();
}

/**
 * Resolve `dateFrom`/`dateTo` from `relativeDateMode` using Chicago
 * calendar-date keys. Pure — `now` is injectable for deterministic tests.
 * When no explicit range or relative mode is given and `viewMode` is
 * `agenda` or `search`, defaults to a `NEXT_N_DAYS` forward window
 * (`forwardDays` default `CALENDAR_QUERY_FORWARD_DAYS_DEFAULT`).
 */
export function applyRelativeDates(
  query: CalendarQueryContract,
  now: Date = new Date(),
): CalendarQueryContract {
  const resolved: CalendarQueryContract = { ...query };

  const hasExplicitRange = Boolean(query.dateFrom || query.dateTo);
  let mode: RelativeDateMode | undefined = query.relativeDateMode;
  if (!mode && !hasExplicitRange && (query.viewMode === "agenda" || query.viewMode === "search")) {
    mode = "NEXT_N_DAYS";
  }
  if (!mode) return resolved;

  const todayKey = chicagoTodayKey(now);

  switch (mode) {
    case "FIXED":
      return resolved;
    case "TODAY":
      resolved.dateFrom = todayKey;
      resolved.dateTo = todayKey;
      return resolved;
    case "THIS_WEEK": {
      const week = weekDateKeys(todayKey);
      resolved.dateFrom = week[0];
      resolved.dateTo = week[week.length - 1];
      return resolved;
    }
    case "THIS_MONTH": {
      const month = monthDateKeys(todayKey);
      resolved.dateFrom = month[0];
      resolved.dateTo = month[month.length - 1];
      return resolved;
    }
    case "NEXT_N_DAYS": {
      const forwardDays = query.forwardDays ?? CALENDAR_QUERY_FORWARD_DAYS_DEFAULT;
      resolved.dateFrom = todayKey;
      resolved.dateTo = shiftChicagoDateKey(todayKey, Math.max(0, forwardDays - 1));
      return resolved;
    }
    default:
      return resolved;
  }
}

/**
 * Structural equivalence between two queries: canonicalize both, then
 * compare via their stable serialized form. Two queries built from
 * differently-ordered/differently-typed raw input but describing the same
 * filters always compare equal.
 */
export function queriesAreEquivalent(a: CalendarQueryContract, b: CalendarQueryContract): boolean {
  return serializeCalendarQuery(a) === serializeCalendarQuery(b);
}

const LEGACY_DATE_RANGE_MODE_MAP: Record<string, RelativeDateMode> = {
  TODAY: "TODAY",
  DAY: "TODAY",
  WEEK: "THIS_WEEK",
  THIS_WEEK: "THIS_WEEK",
  MONTH: "THIS_MONTH",
  THIS_MONTH: "THIS_MONTH",
  UPCOMING: "NEXT_N_DAYS",
  NEXT_N_DAYS: "NEXT_N_DAYS",
  FIXED: "FIXED",
  CUSTOM: "FIXED",
};

/**
 * Best-effort migration from a pre-CC-07 `CalendarSavedView.filtersJson`
 * shape into the versioned `CalendarQueryContract`. Never throws — an
 * unrecognized/empty legacy shape migrates to an empty (schemaVersion-only)
 * contract rather than failing the read. Callers should mark the resulting
 * saved view `staleState: "NEEDS_MIGRATION"` review-only, never silently
 * rewrite history without an explicit save.
 */
export function migrateLegacyFiltersJson(legacy: unknown): CalendarQueryContract {
  const out: CalendarQueryContract = { schemaVersion: CALENDAR_QUERY_SCHEMA_VERSION };
  if (!legacy || typeof legacy !== "object") return canonicalizeCalendarQuery(out);

  const obj = legacy as Record<string, unknown>;

  if (typeof obj.q === "string") out.q = obj.q;
  else if (typeof obj.search === "string") out.q = obj.search;

  if (typeof obj.viewMode === "string" && VIEW_MODES.includes(obj.viewMode as ViewMode)) {
    out.viewMode = obj.viewMode as ViewMode;
  }

  if (typeof obj.dateFrom === "string" && DATE_KEY_RE.test(obj.dateFrom)) out.dateFrom = obj.dateFrom;
  if (typeof obj.dateTo === "string" && DATE_KEY_RE.test(obj.dateTo)) out.dateTo = obj.dateTo;

  const legacyMode = typeof obj.dateRangeMode === "string" ? obj.dateRangeMode.toUpperCase() : undefined;
  if (legacyMode && LEGACY_DATE_RANGE_MODE_MAP[legacyMode]) {
    out.relativeDateMode = LEGACY_DATE_RANGE_MODE_MAP[legacyMode];
  }

  for (const field of CALENDAR_QUERY_ARRAY_FIELDS) {
    const value = obj[field];
    if (Array.isArray(value)) {
      (out as Record<string, unknown>)[field] = value.map((v) => String(v));
    }
  }

  if (typeof obj.calendarId === "string") {
    out.calendarIds = [...(out.calendarIds ?? []), obj.calendarId];
  }
  if (Array.isArray(obj.layers)) {
    const layerCalendarIds = (obj.layers as unknown[])
      .map((layer) =>
        layer && typeof layer === "object"
          ? (layer as Record<string, unknown>).calendarId
          : undefined,
      )
      .filter((v): v is string => typeof v === "string");
    if (layerCalendarIds.length > 0) {
      out.calendarIds = [...new Set([...(out.calendarIds ?? []), ...layerCalendarIds])];
    }
  }

  for (const field of CALENDAR_QUERY_BOOLEAN_FIELDS) {
    const value = obj[field];
    if (typeof value === "boolean") (out as Record<string, unknown>)[field] = value;
  }

  return canonicalizeCalendarQuery(out);
}
