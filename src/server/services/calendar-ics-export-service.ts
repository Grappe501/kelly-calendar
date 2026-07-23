/**
 * CC-10 ICS export & private subscription feeds — server service.
 * Authorized under ADR-098 (CC-10) via standing execution ADR-094.
 *
 * Hard constraints (binding):
 * - Read Event data only — NEVER prisma.event.update/create/delete.
 * - NEVER mutate missions or write external calendars.
 * - NEVER store raw subscription tokens (hash + prefix only).
 * - NEVER emit streetAddress / privateNotes into ICS projections.
 * - Feed serve failures are opaque (do not distinguish missing vs revoked).
 */

import "server-only";

import type {
  CalendarFeedPrivacyProfile,
  CalendarFeedScopeType,
  CalendarSubscriptionFeed,
  EventStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { runWithActorAsync } from "@/server/auth/actor-context";
import { requireAuthorized } from "@/server/auth/authorization";
import type { SessionViewer } from "@/server/auth/session";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import { checkInMemoryRateLimit } from "@/lib/security/rate-limit";
import {
  isSystemRole,
  roleHasFullCalendarAccess,
  roleMayMutate,
  type SystemRoleName,
} from "@/lib/auth/system-roles";
import { chicagoDateKeysToUtcRange, chicagoTodayKey } from "@/lib/calendar/chicago-date";
import {
  applyRelativeDates,
  canonicalizeCalendarQuery,
  parseCalendarQuery,
  type CalendarQueryContract,
} from "@/lib/calendar/search";
import {
  applyIcsPrivacyPolicy,
  buildStableEventUid,
  clampFeedWindow,
  computeIcsBodyEtag,
  generateSubscriptionToken,
  hashSubscriptionToken,
  MAX_FEED_EVENTS,
  serializeIcsCalendar,
  type IcsExportProjection,
  type IcsPrivacyProfile,
} from "@/lib/calendar/ics";
import { DEFAULT_CAMPAIGN_KEY } from "@/server/services/availability-service";

const DEFAULT_EXPORT_STATUSES: EventStatus[] = [
  "CONFIRMED",
  "TENTATIVE",
  "HOLD",
];

const ELEVATED_ICS_ROLES = new Set<SystemRoleName>([
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
]);

const EXPORT_VIEW_ROLES = new Set<SystemRoleName>([
  "KELLY",
  "CAMPAIGN_MANAGER",
  "SCHEDULER",
  "STAFF",
  "READ_ONLY_ADVISOR",
]);

type IcsEventRow = {
  id: string;
  eventNumber: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  status: EventStatus;
  campaignDisplayTitle: string;
  publicTitle: string | null;
  internalTitle: string;
  city: string | null;
  state: string;
  streetAddress: string | null;
  venueName: string | null;
  publicDescription: string | null;
  campaignDescription: string | null;
  privateNotes: string | null;
  recurrenceRule: string | null;
  virtualMeetingUrl: string | null;
};

export type SerializedSubscriptionFeed = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scopeType: string;
  savedViewId: string | null;
  privacyProfile: string;
  maxVisibilityGrant: string;
  tokenPrefix: string;
  tokenVersion: number;
  includeCancelledHistory: boolean;
  includedStatuses: string[];
  expiresAt: string | null;
  lastRotatedAt: string | null;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
};

export type ServeFeedResult =
  | {
      kind: "ok";
      ics: string;
      etag: string;
      lastModified: Date;
      eventCount: number;
      truncated: boolean;
      filename: string;
    }
  | { kind: "not_modified"; etag: string; lastModified: Date }
  | { kind: "unauthorized" }
  | { kind: "rate_limited" };

function assertExportRole(actor: AuthenticatedActor, privacy: IcsPrivacyProfile) {
  if (!EXPORT_VIEW_ROLES.has(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Your role may not export calendar ICS data.",
    );
  }
  if (actor.primarySystemRole === "READ_ONLY_ADVISOR") {
    if (privacy !== "BUSY_ONLY" && privacy !== "CITY_ONLY") {
      throw new PermissionDeniedError(
        "Read-only advisors may only export BUSY_ONLY or CITY_ONLY profiles.",
      );
    }
  }
  if (privacy === "OPERATIONAL_REDACTED" && !ELEVATED_ICS_ROLES.has(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "OPERATIONAL_REDACTED export requires Kelly, Campaign Manager, or Scheduler.",
    );
  }
}

function maxVisibilityGrantForRole(role: SystemRoleName): string {
  if (role === "KELLY" || role === "CAMPAIGN_MANAGER") return "FULL";
  if (role === "SCHEDULER") return "VIEW_FULL";
  return "VIEW_LIMITED";
}

/** Map stored access-grant ceiling to ICS privacy ceiling. */
export function grantToIcsPrivacyCeiling(grant: string): IcsPrivacyProfile {
  if (grant === "FULL" || grant === "ADMINISTER" || grant === "VIEW_FULL" || grant === "EDIT" || grant === "MANAGE") {
    return "OPERATIONAL_REDACTED";
  }
  if (grant === "VIEW_LIMITED" || grant === "CONTRIBUTE" || grant === "VIEW") {
    return "CITY_ONLY";
  }
  return "BUSY_ONLY";
}

function parseIncludedStatuses(raw: unknown): EventStatus[] {
  if (!Array.isArray(raw)) return [...DEFAULT_EXPORT_STATUSES];
  const out = raw
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().toUpperCase()) as EventStatus[];
  return out.length > 0 ? out : [...DEFAULT_EXPORT_STATUSES];
}

function serializeFeed(row: CalendarSubscriptionFeed): SerializedSubscriptionFeed {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    scopeType: row.scopeType,
    savedViewId: row.savedViewId,
    privacyProfile: row.privacyProfile,
    maxVisibilityGrant: row.maxVisibilityGrant,
    tokenPrefix: row.tokenPrefix,
    tokenVersion: row.tokenVersion,
    includeCancelledHistory: row.includeCancelledHistory,
    includedStatuses: parseIncludedStatuses(row.includedStatusesJson),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastRotatedAt: row.lastRotatedAt?.toISOString() ?? null,
    lastAccessedAt: row.lastAccessedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    revocationReason: row.revocationReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ownerUserId: row.ownerUserId,
  };
}

function subscriptionUrlForToken(rawToken: string): string {
  return `/api/calendar/feeds/${rawToken}.ics`;
}

function exportFilename(now = new Date()): string {
  return `kelly-calendar-export-${chicagoTodayKey(now).replace(/-/g, "")}.ics`;
}

function scopeSummary(query: CalendarQueryContract, privacy: string): string {
  const from = query.dateFrom ?? "?";
  const to = query.dateTo ?? "?";
  const statuses = query.statuses?.join(",") ?? "default";
  return `${privacy}:${from}..${to};statuses=${statuses}`;
}

function categorizeUserAgent(userAgent?: string | null): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (ua.includes("google") || ua.includes("calendar.google")) return "google";
  if (ua.includes("outlook") || ua.includes("microsoft") || ua.includes("office")) {
    return "outlook";
  }
  if (ua.includes("apple") || ua.includes("macos") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("ical")) {
    return "apple";
  }
  return "generic";
}

function eventToPolicyInput(event: IcsEventRow) {
  return {
    campaignDisplayTitle: event.campaignDisplayTitle,
    publicTitle: event.publicTitle,
    internalTitle: event.internalTitle,
    city: event.city,
    state: event.state,
    streetAddress: event.streetAddress,
    venueName: event.venueName,
    publicDescription: event.publicDescription,
    campaignDescription: event.campaignDescription,
    privateNotes: event.privateNotes,
    status: event.status,
    isResidential: null as boolean | null,
  };
}

function toProjection(
  event: IcsEventRow,
  privacy: IcsPrivacyProfile,
  grantCeiling: IcsPrivacyProfile,
): IcsExportProjection {
  const fields = applyIcsPrivacyPolicy({
    profile: privacy,
    event: eventToPolicyInput(event),
    maxVisibilityGrant: grantCeiling,
  });
  return {
    eventId: event.id,
    eventNumber: event.eventNumber,
    uid: buildStableEventUid(event.id),
    sequence: Math.max(0, event.version - 1),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone || "America/Chicago",
    isAllDay: event.isAllDay,
    status: event.status,
    summary: fields.summary,
    description: fields.description,
    location: fields.location,
    url: event.virtualMeetingUrl?.trim() || undefined,
    recurrenceRule: event.recurrenceRule ?? undefined,
    isCancelled: event.status === "CANCELLED",
  };
}

function normalizeQueryInput(raw: unknown, now?: Date): CalendarQueryContract {
  const parsed = parseCalendarQuery(raw ?? {});
  if (!parsed.ok) throw new ValidationError(parsed.error);
  return applyRelativeDates(canonicalizeCalendarQuery(parsed.query), now ?? new Date());
}

async function loadEventsInWindow(input: {
  dateFrom: string;
  dateTo: string;
  statuses: EventStatus[];
  includeCancelled: boolean;
}): Promise<{ rows: IcsEventRow[]; truncatedScan: boolean }> {
  const { rangeStart, rangeEnd } = chicagoDateKeysToUtcRange(input.dateFrom, input.dateTo);
  let statuses = [...input.statuses];
  if (input.includeCancelled && !statuses.includes("CANCELLED")) {
    statuses = [...statuses, "CANCELLED"];
  } else if (!input.includeCancelled) {
    statuses = statuses.filter((s) => s !== "CANCELLED");
  }
  if (statuses.length === 0) statuses = [...DEFAULT_EXPORT_STATUSES];

  const where: Prisma.EventWhereInput = {
    startsAt: { lt: rangeEnd },
    endsAt: { gt: rangeStart },
    archivedAt: null,
    status: { in: statuses },
  };

  const rows = await prisma.event.findMany({
    where,
    select: {
      id: true,
      eventNumber: true,
      version: true,
      createdAt: true,
      updatedAt: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      isAllDay: true,
      status: true,
      campaignDisplayTitle: true,
      publicTitle: true,
      internalTitle: true,
      city: true,
      state: true,
      streetAddress: true,
      venueName: true,
      publicDescription: true,
      campaignDescription: true,
      privateNotes: true,
      recurrenceRule: true,
      virtualMeetingUrl: true,
    },
    orderBy: { startsAt: "asc" },
    take: MAX_FEED_EVENTS + 1,
  });

  const truncatedScan = rows.length > MAX_FEED_EVENTS;
  return {
    rows: truncatedScan ? rows.slice(0, MAX_FEED_EVENTS) : rows,
    truncatedScan,
  };
}

async function projectAccessibleEvents(input: {
  viewerUserId: string;
  rows: IcsEventRow[];
  privacy: IcsPrivacyProfile;
  grantCeiling: IcsPrivacyProfile;
  truncatedScan: boolean;
}): Promise<{ projections: IcsExportProjection[]; truncated: boolean }> {
  const projections: IcsExportProjection[] = [];
  for (const row of input.rows) {
    if (projections.length >= MAX_FEED_EVENTS) break;
    const access = await canAccessEvent({
      eventId: row.id,
      viewerUserId: input.viewerUserId,
    });
    if (!access.allowed || access.accessLevel === "NO_ACCESS") continue;
    projections.push(toProjection(row, input.privacy, input.grantCeiling));
  }
  return {
    projections,
    truncated: input.truncatedScan || projections.length >= MAX_FEED_EVENTS,
  };
}

async function requireFeedForActor(input: {
  actor: AuthenticatedActor;
  feedId: string;
}): Promise<CalendarSubscriptionFeed> {
  const row = await prisma.calendarSubscriptionFeed.findUnique({
    where: { id: input.feedId },
  });
  if (!row) throw new NotFoundError("Subscription feed not found.");
  if (
    row.ownerUserId !== input.actor.userId &&
    !roleHasFullCalendarAccess(input.actor.primarySystemRole)
  ) {
    throw new PermissionDeniedError("You do not have permission to manage this feed.");
  }
  return row;
}

async function loadOwnerViewer(ownerUserId: string): Promise<SessionViewer | null> {
  const user = await prisma.user.findUnique({
    where: { id: ownerUserId },
    include: {
      teamMemberships: {
        where: { isActive: true },
        select: { teamId: true, endsAt: true },
      },
    },
  });
  if (!user || !user.isActive || !isSystemRole(user.systemRole)) return null;
  const now = Date.now();
  const teamIds = user.teamMemberships
    .filter((m) => !m.endsAt || m.endsAt.getTime() > now)
    .map((m) => m.teamId);
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    systemRole: user.systemRole,
    teamIds,
    sessionId: `ics-feed-owner:${user.id}`,
    tokenId: `ics-feed-owner:${user.id}`,
  };
}

async function writeAccessAudit(input: {
  feedId: string;
  resultCategory: string;
  conditionalNotModified?: boolean;
  clientCategory?: string | null;
  rateLimited?: boolean;
  eventCount?: number | null;
}) {
  await prisma.calendarSubscriptionAccessAudit.create({
    data: {
      feedId: input.feedId,
      resultCategory: input.resultCategory,
      conditionalNotModified: input.conditionalNotModified ?? false,
      clientCategory: input.clientCategory ?? null,
      rateLimited: input.rateLimited ?? false,
      eventCount: input.eventCount ?? null,
    },
  });
}

function opaqueUnauthorized(): ServeFeedResult {
  return { kind: "unauthorized" };
}

// ─── One-time export ─────────────────────────────────────────────────

export async function generateOneTimeIcsExport(input: {
  actor: AuthenticatedActor;
  privacyProfile: IcsPrivacyProfile;
  query: unknown;
  calendarName?: string;
}): Promise<{
  ics: string;
  etag: string;
  eventCount: number;
  truncated: boolean;
  filename: string;
}> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  assertExportRole(input.actor, input.privacyProfile);

  const query = normalizeQueryInput(input.query);
  if (!query.dateFrom || !query.dateTo) {
    throw new ValidationError("Export requires dateFrom and dateTo (or a relativeDateMode).");
  }
  const clamped = clampFeedWindow({
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  query.dateFrom = clamped.dateFrom;
  query.dateTo = clamped.dateTo;

  const includeCancelled = Boolean(query.includeCancelled);
  const statuses = (query.statuses?.length
    ? (query.statuses as EventStatus[])
    : DEFAULT_EXPORT_STATUSES) as EventStatus[];

  const { rows, truncatedScan } = await loadEventsInWindow({
    dateFrom: clamped.dateFrom,
    dateTo: clamped.dateTo,
    statuses,
    includeCancelled,
  });

  const grantCeiling = grantToIcsPrivacyCeiling(
    maxVisibilityGrantForRole(input.actor.primarySystemRole),
  );
  const { projections, truncated } = await projectAccessibleEvents({
    viewerUserId: input.actor.userId,
    rows,
    privacy: input.privacyProfile,
    grantCeiling,
    truncatedScan: truncatedScan || clamped.truncated,
  });

  const ics = serializeIcsCalendar({
    calendarName: input.calendarName?.trim() || "Kelly Campaign Calendar",
    events: projections,
  });
  const etag = computeIcsBodyEtag(ics);
  const filename = exportFilename();

  await prisma.calendarExportAudit.create({
    data: {
      campaignKey: DEFAULT_CAMPAIGN_KEY,
      actorUserId: input.actor.userId,
      exportMode: "ONE_TIME",
      privacyProfile: input.privacyProfile,
      scopeSummary: scopeSummary(query, input.privacyProfile),
      eventCount: projections.length,
      truncated,
    },
  });

  return {
    ics,
    etag,
    eventCount: projections.length,
    truncated,
    filename,
  };
}

export async function previewOneTimeIcsExport(input: {
  actor: AuthenticatedActor;
  privacyProfile: IcsPrivacyProfile;
  query: unknown;
  sampleLimit?: number;
}): Promise<{
  events: Array<{
    eventId: string;
    eventNumber: string;
    summary: string;
    description?: string;
    location?: string;
    startsAt: string;
    endsAt: string;
    status: string;
    isAllDay: boolean;
  }>;
  eventCount: number;
  truncated: boolean;
  sampleLimit: number;
}> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  assertExportRole(input.actor, input.privacyProfile);

  const query = normalizeQueryInput(input.query);
  if (!query.dateFrom || !query.dateTo) {
    throw new ValidationError("Preview requires dateFrom and dateTo (or a relativeDateMode).");
  }
  const clamped = clampFeedWindow({
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  const includeCancelled = Boolean(query.includeCancelled);
  const statuses = (query.statuses?.length
    ? (query.statuses as EventStatus[])
    : DEFAULT_EXPORT_STATUSES) as EventStatus[];

  const { rows, truncatedScan } = await loadEventsInWindow({
    dateFrom: clamped.dateFrom,
    dateTo: clamped.dateTo,
    statuses,
    includeCancelled,
  });

  const grantCeiling = grantToIcsPrivacyCeiling(
    maxVisibilityGrantForRole(input.actor.primarySystemRole),
  );
  const { projections, truncated } = await projectAccessibleEvents({
    viewerUserId: input.actor.userId,
    rows,
    privacy: input.privacyProfile,
    grantCeiling,
    truncatedScan: truncatedScan || clamped.truncated,
  });

  const sampleLimit = Math.min(50, Math.max(1, input.sampleLimit ?? 25));
  return {
    events: projections.slice(0, sampleLimit).map((p) => ({
      eventId: p.eventId,
      eventNumber: p.eventNumber,
      summary: p.summary,
      description: p.description,
      location: p.location,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      status: p.status,
      isAllDay: p.isAllDay,
    })),
    eventCount: projections.length,
    truncated,
    sampleLimit,
  };
}

// ─── Subscription feeds ──────────────────────────────────────────────

export async function createSubscriptionFeed(input: {
  actor: AuthenticatedActor;
  name: string;
  description?: string;
  privacyProfile: CalendarFeedPrivacyProfile;
  scopeType: CalendarFeedScopeType;
  savedViewId?: string;
  query?: unknown;
  dateWindowPolicy?: unknown;
  includedStatuses?: string[];
  includeCancelledHistory?: boolean;
  expiresAt?: string | Date | null;
}): Promise<{ feed: SerializedSubscriptionFeed; subscriptionUrl: string }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  if (!roleMayMutate(input.actor.primarySystemRole) && input.actor.primarySystemRole !== "READ_ONLY_ADVISOR") {
    throw new PermissionDeniedError("Your role may not create subscription feeds.");
  }
  assertExportRole(input.actor, input.privacyProfile);

  const name = input.name.trim();
  if (!name) throw new ValidationError("Feed name is required.");

  let queryJson: CalendarQueryContract | null = null;
  let savedViewId: string | null = null;

  if (input.scopeType === "SAVED_VIEW") {
    if (!input.savedViewId?.trim()) {
      throw new ValidationError("savedViewId is required for SAVED_VIEW scope.");
    }
    const view = await prisma.calendarSavedView.findUnique({
      where: { id: input.savedViewId.trim() },
    });
    if (!view || view.archivedAt) {
      throw new NotFoundError("Saved view not found.");
    }
    const isOwner = view.ownerUserId === input.actor.userId;
    const isShared = view.visibility === "CAMPAIGN_SHARED" || view.isShared;
    if (!isOwner && !isShared && !roleHasFullCalendarAccess(input.actor.primarySystemRole)) {
      throw new PermissionDeniedError("You may only subscribe to your own or campaign-shared saved views.");
    }
    if (view.staleState === "NEEDS_MIGRATION" || (view.querySchemaVersion ?? 0) < 1) {
      throw new ValidationError("Saved view is stale and must be updated before creating a feed.");
    }
    const parsed = parseCalendarQuery(view.queryJson ?? {});
    if (!parsed.ok) {
      throw new ValidationError("Saved view query could not be parsed.");
    }
    queryJson = canonicalizeCalendarQuery(parsed.query);
    savedViewId = view.id;
  } else {
    const raw =
      input.query ??
      (input.scopeType === "RELATIVE_WINDOW"
        ? {
            relativeDateMode:
              (input.dateWindowPolicy as { relativeDateMode?: string } | undefined)
                ?.relativeDateMode ?? "NEXT_N_DAYS",
            forwardDays:
              (input.dateWindowPolicy as { forwardDays?: number } | undefined)?.forwardDays ??
              90,
          }
        : {});
    const parsed = parseCalendarQuery(raw);
    if (!parsed.ok) throw new ValidationError(parsed.error);
    queryJson = canonicalizeCalendarQuery(parsed.query);
    if (input.scopeType === "DATE_RANGE" && (!queryJson.dateFrom || !queryJson.dateTo)) {
      throw new ValidationError("DATE_RANGE feeds require dateFrom and dateTo.");
    }
  }

  const token = generateSubscriptionToken();
  const includedStatuses = parseIncludedStatuses(
    input.includedStatuses ?? DEFAULT_EXPORT_STATUSES,
  );
  const expiresAt =
    input.expiresAt == null || input.expiresAt === ""
      ? null
      : new Date(input.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new ValidationError("expiresAt must be a valid date.");
  }

  const row = await prisma.calendarSubscriptionFeed.create({
    data: {
      campaignKey: DEFAULT_CAMPAIGN_KEY,
      ownerUserId: input.actor.userId,
      createdByUserId: input.actor.userId,
      name,
      description: input.description?.trim() || null,
      status: "ACTIVE",
      scopeType: input.scopeType,
      savedViewId,
      queryJson: queryJson as Prisma.InputJsonValue,
      querySchemaVersion: queryJson.schemaVersion,
      dateWindowPolicyJson: (input.dateWindowPolicy ?? null) as Prisma.InputJsonValue,
      privacyProfile: input.privacyProfile,
      includedStatusesJson: includedStatuses as unknown as Prisma.InputJsonValue,
      includeCancelledHistory: Boolean(input.includeCancelledHistory),
      maxVisibilityGrant: maxVisibilityGrantForRole(input.actor.primarySystemRole),
      tokenHash: token.tokenHash,
      tokenPrefix: token.tokenPrefix,
      tokenVersion: token.tokenVersion,
      expiresAt,
    },
  });

  return {
    feed: serializeFeed(row),
    subscriptionUrl: subscriptionUrlForToken(token.rawToken),
  };
}

export async function rotateSubscriptionFeedToken(input: {
  actor: AuthenticatedActor;
  feedId: string;
}): Promise<{ feed: SerializedSubscriptionFeed; subscriptionUrl: string }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const existing = await requireFeedForActor(input);
  if (existing.status === "REVOKED") {
    throw new ValidationError("Revoked feeds cannot be rotated.");
  }
  const token = generateSubscriptionToken();
  const row = await prisma.calendarSubscriptionFeed.update({
    where: { id: existing.id },
    data: {
      tokenHash: token.tokenHash,
      tokenPrefix: token.tokenPrefix,
      tokenVersion: existing.tokenVersion + 1,
      lastRotatedAt: new Date(),
      status: existing.status === "DISABLED" ? "DISABLED" : "ACTIVE",
      revokedAt: null,
      revocationReason: null,
      revokedByUserId: null,
    },
  });
  return {
    feed: serializeFeed(row),
    subscriptionUrl: subscriptionUrlForToken(token.rawToken),
  };
}

export async function revokeSubscriptionFeed(input: {
  actor: AuthenticatedActor;
  feedId: string;
  reason?: string;
}): Promise<{ feed: SerializedSubscriptionFeed }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const existing = await requireFeedForActor(input);
  const row = await prisma.calendarSubscriptionFeed.update({
    where: { id: existing.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByUserId: input.actor.userId,
      revocationReason: input.reason?.trim() || null,
      // Invalidate token material so old URLs cannot 304 with stale body.
      tokenHash: hashSubscriptionToken(`revoked:${existing.id}:${Date.now()}`),
      tokenPrefix: existing.tokenPrefix,
      tokenVersion: existing.tokenVersion + 1,
    },
  });
  return { feed: serializeFeed(row) };
}

export async function disableSubscriptionFeed(input: {
  actor: AuthenticatedActor;
  feedId: string;
}): Promise<{ feed: SerializedSubscriptionFeed }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const existing = await requireFeedForActor(input);
  if (existing.status === "REVOKED") {
    throw new ValidationError("Revoked feeds cannot be disabled.");
  }
  const row = await prisma.calendarSubscriptionFeed.update({
    where: { id: existing.id },
    data: { status: "DISABLED" },
  });
  return { feed: serializeFeed(row) };
}

export async function enableSubscriptionFeed(input: {
  actor: AuthenticatedActor;
  feedId: string;
}): Promise<{ feed: SerializedSubscriptionFeed }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const existing = await requireFeedForActor(input);
  if (existing.status === "REVOKED") {
    throw new ValidationError("Revoked feeds cannot be re-enabled; create a new feed.");
  }
  const now = new Date();
  if (existing.expiresAt && existing.expiresAt.getTime() <= now.getTime()) {
    throw new ValidationError("Expired feeds cannot be re-enabled.");
  }
  const row = await prisma.calendarSubscriptionFeed.update({
    where: { id: existing.id },
    data: { status: "ACTIVE" },
  });
  return { feed: serializeFeed(row) };
}

export async function listSubscriptionFeeds(input: {
  actor: AuthenticatedActor;
}): Promise<{ feeds: SerializedSubscriptionFeed[] }> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const where = roleHasFullCalendarAccess(input.actor.primarySystemRole)
    ? { campaignKey: DEFAULT_CAMPAIGN_KEY }
    : { campaignKey: DEFAULT_CAMPAIGN_KEY, ownerUserId: input.actor.userId };

  const rows = await prisma.calendarSubscriptionFeed.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return { feeds: rows.map(serializeFeed) };
}

export async function getSubscriptionFeedDetail(input: {
  actor: AuthenticatedActor;
  feedId: string;
}): Promise<{
  feed: SerializedSubscriptionFeed;
  accessAudits: Array<{
    id: string;
    accessedAt: string;
    resultCategory: string;
    conditionalNotModified: boolean;
    clientCategory: string | null;
    rateLimited: boolean;
    eventCount: number | null;
  }>;
}> {
  await requireAuthorized(input.actor, {
    action: "EVENT_VIEW",
    resource: { type: "system" },
  });
  const row = await requireFeedForActor(input);
  const audits = await prisma.calendarSubscriptionAccessAudit.findMany({
    where: { feedId: row.id },
    orderBy: { accessedAt: "desc" },
    take: 40,
  });
  return {
    feed: serializeFeed(row),
    accessAudits: audits.map((a) => ({
      id: a.id,
      accessedAt: a.accessedAt.toISOString(),
      resultCategory: a.resultCategory,
      conditionalNotModified: a.conditionalNotModified,
      clientCategory: a.clientCategory,
      rateLimited: a.rateLimited,
      eventCount: a.eventCount,
    })),
  };
}

async function buildIcsForFeed(feed: CalendarSubscriptionFeed): Promise<{
  ics: string;
  etag: string;
  eventCount: number;
  truncated: boolean;
}> {
  const owner = await loadOwnerViewer(feed.ownerUserId);
  if (!owner) {
    throw new Error("Feed owner unavailable");
  }

  return runWithActorAsync(owner, async () => {
    const rawQuery = feed.queryJson ?? {};
    let query = normalizeQueryInput(rawQuery);
    if (feed.scopeType === "RELATIVE_WINDOW") {
      const policy =
        feed.dateWindowPolicyJson && typeof feed.dateWindowPolicyJson === "object"
          ? (feed.dateWindowPolicyJson as Record<string, unknown>)
          : {};
      query = normalizeQueryInput({
        ...query,
        relativeDateMode: policy.relativeDateMode ?? query.relativeDateMode ?? "NEXT_N_DAYS",
        forwardDays: policy.forwardDays ?? query.forwardDays ?? 90,
      });
    }
    if (!query.dateFrom || !query.dateTo) {
      query = normalizeQueryInput({
        ...query,
        relativeDateMode: "NEXT_N_DAYS",
        forwardDays: query.forwardDays ?? 90,
      });
    }
    const clamped = clampFeedWindow({
      dateFrom: query.dateFrom!,
      dateTo: query.dateTo!,
    });

    const statuses = parseIncludedStatuses(feed.includedStatusesJson);
    const { rows, truncatedScan } = await loadEventsInWindow({
      dateFrom: clamped.dateFrom,
      dateTo: clamped.dateTo,
      statuses,
      includeCancelled: feed.includeCancelledHistory,
    });

    const grantCeiling = grantToIcsPrivacyCeiling(feed.maxVisibilityGrant);
    const { projections, truncated } = await projectAccessibleEvents({
      viewerUserId: feed.ownerUserId,
      rows,
      privacy: feed.privacyProfile,
      grantCeiling,
      truncatedScan: truncatedScan || clamped.truncated,
    });

    const ics = serializeIcsCalendar({
      calendarName: feed.name,
      events: projections,
    });
    return {
      ics,
      etag: computeIcsBodyEtag(ics),
      eventCount: projections.length,
      truncated,
    };
  });
}

export async function serveSubscriptionFeedIcs(input: {
  rawToken: string;
  ifNoneMatch?: string | null;
  userAgent?: string | null;
}): Promise<ServeFeedResult> {
  const rawToken = input.rawToken.trim();
  if (!rawToken) return opaqueUnauthorized();

  const tokenPrefix = rawToken.slice(0, 12);
  const tokenHash = hashSubscriptionToken(rawToken);
  const clientCategory = categorizeUserAgent(input.userAgent);

  const globalLimit = checkInMemoryRateLimit({
    key: "ics-feed-global",
    limit: 300,
    windowMs: 60_000,
  });
  if (!globalLimit.allowed) {
    return { kind: "rate_limited" };
  }

  const feed = await prisma.calendarSubscriptionFeed.findUnique({
    where: { tokenHash },
  });

  if (!feed) {
    checkInMemoryRateLimit({
      key: `ics-feed-invalid:${tokenPrefix}`,
      limit: 30,
      windowMs: 60_000,
    });
    return opaqueUnauthorized();
  }

  // Status first — never 304 a revoked/disabled/expired feed with a stale body.
  const now = new Date();
  if (feed.status === "REVOKED") {
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: "REVOKED",
      clientCategory,
    });
    return opaqueUnauthorized();
  }
  if (feed.status === "DISABLED") {
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: "DISABLED",
      clientCategory,
    });
    return opaqueUnauthorized();
  }
  if (feed.expiresAt && feed.expiresAt.getTime() <= now.getTime()) {
    if (feed.status !== "EXPIRED") {
      await prisma.calendarSubscriptionFeed.update({
        where: { id: feed.id },
        data: { status: "EXPIRED" },
      });
    }
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: "EXPIRED",
      clientCategory,
    });
    return opaqueUnauthorized();
  }
  if (feed.status !== "ACTIVE") {
    return opaqueUnauthorized();
  }

  const feedLimit = checkInMemoryRateLimit({
    key: `ics-feed:${feed.id}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!feedLimit.allowed) {
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: "RATE_LIMITED",
      clientCategory,
      rateLimited: true,
    });
    return { kind: "rate_limited" };
  }

  try {
    const built = await buildIcsForFeed(feed);
    const lastModified = feed.updatedAt;

    if (input.ifNoneMatch && input.ifNoneMatch === built.etag) {
      await prisma.calendarSubscriptionFeed.update({
        where: { id: feed.id },
        data: { lastAccessedAt: now },
      });
      await writeAccessAudit({
        feedId: feed.id,
        resultCategory: "NOT_MODIFIED",
        conditionalNotModified: true,
        clientCategory,
        eventCount: built.eventCount,
      });
      return { kind: "not_modified", etag: built.etag, lastModified };
    }

    await prisma.calendarSubscriptionFeed.update({
      where: { id: feed.id },
      data: { lastAccessedAt: now },
    });
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: built.truncated ? "TRUNCATED" : "OK",
      clientCategory,
      eventCount: built.eventCount,
    });

    return {
      kind: "ok",
      ics: built.ics,
      etag: built.etag,
      lastModified,
      eventCount: built.eventCount,
      truncated: built.truncated,
      filename: `${feed.name.replace(/[^\w.-]+/g, "_").slice(0, 64) || "kelly-feed"}.ics`,
    };
  } catch {
    await writeAccessAudit({
      feedId: feed.id,
      resultCategory: "ERROR",
      clientCategory,
    });
    return opaqueUnauthorized();
  }
}
