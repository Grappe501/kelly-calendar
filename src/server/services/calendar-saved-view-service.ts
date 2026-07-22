/**
 * CC-07 Unified Search, Filters & Saved Views — saved view server service.
 * Build: KCCC-CC-07-UNIFIED-SEARCH-FILTERS-SAVED-VIEWS-1.0
 * Authorized under ADR-095 (CC-07) via standing execution ADR-094.
 *
 * Hard constraints (binding):
 * - A saved view is a stored *filter preference*, never an access grant.
 *   Reading a shared/role-restricted saved view never widens what Events
 *   the reading actor can see — `calendar-search-service` still re-runs
 *   `canAccessEvent` / `projectSafeEvent` for every event when the view's
 *   query is executed.
 * - Reads (`listSavedViewsForActor`, `getSavedViewForActor`) never create,
 *   update, or fabricate rows — including "personal default" fabrication.
 * - PRIVATE views are owner-only. CAMPAIGN_SHARED / ROLE_RESTRICTED views
 *   may only be created or have their visibility changed by a viewer with
 *   full calendar authority (KELLY / CAMPAIGN_MANAGER); any other write to
 *   a non-owned view is rejected.
 *
 * Return shapes are wrapped (`{ views }`, `{ view }`, `{ view, resolvedQuery }`)
 * rather than bare arrays/objects so `withAuthenticatedMutation`'s
 * `{ ok: true, ...result }` spread produces stable, named response keys.
 */

import "server-only";

import type { Prisma, CalendarSavedView } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { requireAuthorized } from "@/server/auth/authorization";
import { NotFoundError, PermissionDeniedError, ValidationError } from "@/lib/security/safe-error";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { DEFAULT_CAMPAIGN_KEY } from "@/server/services/availability-service";
import {
  CALENDAR_QUERY_SCHEMA_VERSION,
  SAVED_VIEW_VISIBILITIES,
  VIEW_MODES,
  canonicalizeCalendarQuery,
  migrateLegacyFiltersJson,
  parseCalendarQuery,
  type CalendarQueryContract,
  type SavedViewVisibility,
  type ViewMode,
} from "@/lib/calendar/search";

type StaleState = "CURRENT" | "NEEDS_MIGRATION";

/** Saved view metadata only — the resolved filter contract is returned separately as `resolvedQuery`. */
export type SerializedSavedView = {
  id: string;
  ownerUserId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPinned: boolean;
  isShared: boolean;
  isSystemView: boolean;
  sharedWithTeamId: string | null;
  visibility: SavedViewVisibility;
  roleScope: string[] | null;
  campaignKey: string | null;
  viewMode: ViewMode | null;
  querySchemaVersion: number;
  staleState: StaleState | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type SavedViewWithQuery = {
  view: SerializedSavedView;
  resolvedQuery: CalendarQueryContract;
};

function normalizeVisibility(row: CalendarSavedView): SavedViewVisibility {
  const raw = row.visibility as string | null;
  if (raw && (SAVED_VIEW_VISIBILITIES as readonly string[]).includes(raw)) {
    return raw as SavedViewVisibility;
  }
  return row.isShared ? "CAMPAIGN_SHARED" : "PRIVATE";
}

/**
 * Resolve the canonical query for a stored row. Prefers `queryJson` when it
 * is present and current-schema; otherwise falls back to a best-effort
 * migration from legacy `filtersJson`. Never throws — an unreadable legacy
 * shape simply resolves to an empty (schemaVersion-only) query, flagged
 * `NEEDS_MIGRATION`.
 */
function resolveQueryForRow(row: CalendarSavedView): { query: CalendarQueryContract; staleState: StaleState } {
  const schemaVersion = row.querySchemaVersion ?? 0;
  if (row.queryJson && schemaVersion >= CALENDAR_QUERY_SCHEMA_VERSION) {
    const parsed = parseCalendarQuery(row.queryJson);
    if (parsed.ok) {
      return { query: canonicalizeCalendarQuery(parsed.query), staleState: "CURRENT" };
    }
  }
  return { query: migrateLegacyFiltersJson(row.filtersJson), staleState: "NEEDS_MIGRATION" };
}

function serializeSavedView(row: CalendarSavedView, staleState: StaleState): SerializedSavedView {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    isPinned: row.isPinned,
    isShared: row.isShared,
    isSystemView: row.isSystemView,
    sharedWithTeamId: row.sharedWithTeamId,
    visibility: normalizeVisibility(row),
    roleScope: Array.isArray(row.roleScope) ? (row.roleScope as string[]) : null,
    campaignKey: row.campaignKey,
    viewMode: (row.viewMode as ViewMode | null) ?? null,
    querySchemaVersion: row.querySchemaVersion,
    staleState: (row.staleState as StaleState | null) ?? staleState,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
  };
}

function toSavedViewWithQuery(row: CalendarSavedView): SavedViewWithQuery {
  const { query, staleState } = resolveQueryForRow(row);
  return { view: serializeSavedView(row, staleState), resolvedQuery: query };
}

/** A saved view preference never grants Event access — only read visibility of the preference row itself. */
function canReadSavedView(actor: AuthenticatedActor, row: CalendarSavedView): boolean {
  if (row.ownerUserId === actor.userId) return true;
  if (row.isSystemView) return true;
  if (roleHasFullCalendarAccess(actor.primarySystemRole)) return true;
  const visibility = normalizeVisibility(row);
  if (visibility === "CAMPAIGN_SHARED") return true;
  if (visibility === "ROLE_RESTRICTED") {
    const roles = Array.isArray(row.roleScope) ? (row.roleScope as string[]) : [];
    return roles.includes(actor.primarySystemRole);
  }
  return false;
}

function canManageSavedView(actor: AuthenticatedActor, row: CalendarSavedView): boolean {
  if (row.ownerUserId === actor.userId) return true;
  return roleHasFullCalendarAccess(actor.primarySystemRole);
}

function assertVisibilityChangeAllowed(actor: AuthenticatedActor, visibility: SavedViewVisibility) {
  if (visibility === "PRIVATE") return;
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Only Kelly or the Campaign Manager may create or change shared / role-restricted saved views.",
    );
  }
}

async function requireSavedViewRow(viewId: string): Promise<CalendarSavedView> {
  const row = await prisma.calendarSavedView.findUnique({ where: { id: viewId } });
  if (!row) throw new NotFoundError("Saved view not found.");
  return row;
}

/**
 * List saved views visible to this actor: their own, campaign-shared,
 * role-restricted views matching their role, and system views. Never
 * creates a "default" row — an empty list means the operator has no saved
 * views yet.
 */
export async function listSavedViewsForActor(input: {
  actor: AuthenticatedActor;
  includeArchived?: boolean;
}): Promise<{ views: SerializedSavedView[] }> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_VIEW", resource: { type: "system" } });

  const rows = await prisma.calendarSavedView.findMany({
    where: input.includeArchived ? {} : { archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const views = rows
    .filter((row) => canReadSavedView(input.actor, row))
    .map((row) => toSavedViewWithQuery(row).view);
  return { views };
}

/** Fetch one saved view. Re-checks the viewer's own read authorization on every call. */
export async function getSavedViewForActor(input: {
  actor: AuthenticatedActor;
  viewId: string;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_VIEW", resource: { type: "system" } });
  const row = await requireSavedViewRow(input.viewId);
  if (!canReadSavedView(input.actor, row)) {
    throw new PermissionDeniedError("You do not have permission to view this saved view.");
  }
  return toSavedViewWithQuery(row);
}

export type CreateSavedViewInput = {
  actor: AuthenticatedActor;
  name: string;
  description?: string | null;
  query: unknown;
  viewMode?: string;
  visibility?: SavedViewVisibility;
  roleScope?: string[];
  isPinned?: boolean;
  isDefault?: boolean;
  campaignKey?: string;
  requestId?: string;
};

export async function createSavedView(input: CreateSavedViewInput): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });

  const name = input.name?.trim();
  if (!name) throw new ValidationError("Saved view name is required.");

  const campaignKey = input.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
  const parsed = parseCalendarQuery(input.query, { campaignKey });
  if (!parsed.ok) throw new ValidationError(`Invalid saved view query: ${parsed.error}`);
  const canonicalQuery = canonicalizeCalendarQuery(parsed.query);

  const viewMode = input.viewMode as ViewMode | undefined;
  if (viewMode && !VIEW_MODES.includes(viewMode)) {
    throw new ValidationError(`Unknown viewMode: "${input.viewMode}".`);
  }

  const visibility = input.visibility ?? "PRIVATE";
  if (!SAVED_VIEW_VISIBILITIES.includes(visibility)) {
    throw new ValidationError(`Unknown visibility: "${visibility}".`);
  }
  assertVisibilityChangeAllowed(input.actor, visibility);

  if (visibility === "ROLE_RESTRICTED" && !(input.roleScope && input.roleScope.length > 0)) {
    throw new ValidationError("ROLE_RESTRICTED saved views require at least one roleScope entry.");
  }

  if (input.isDefault) {
    await prisma.calendarSavedView.updateMany({
      where: { ownerUserId: input.actor.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const row = await prisma.calendarSavedView.create({
    data: {
      ownerUserId: input.actor.userId,
      name,
      description: input.description ?? null,
      isDefault: Boolean(input.isDefault),
      isPinned: Boolean(input.isPinned),
      isShared: visibility !== "PRIVATE",
      isSystemView: false,
      visibility,
      roleScope: (input.roleScope ?? null) as unknown as Prisma.InputJsonValue,
      campaignKey,
      dateRangeMode: canonicalQuery.relativeDateMode ?? null,
      viewMode: viewMode ?? canonicalQuery.viewMode ?? null,
      filtersJson: canonicalQuery as unknown as Prisma.InputJsonValue,
      queryJson: canonicalQuery as unknown as Prisma.InputJsonValue,
      querySchemaVersion: CALENDAR_QUERY_SCHEMA_VERSION,
      staleState: null,
      createdByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
    },
  });

  return toSavedViewWithQuery(row);
}

export type UpdateSavedViewInput = {
  actor: AuthenticatedActor;
  viewId: string;
  name?: string;
  description?: string | null;
  query?: unknown;
  viewMode?: string | null;
  visibility?: SavedViewVisibility;
  roleScope?: string[] | null;
  isPinned?: boolean;
  isDefault?: boolean;
  campaignKey?: string;
  requestId?: string;
};

export async function updateSavedView(input: UpdateSavedViewInput): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (existing.isSystemView) {
    throw new PermissionDeniedError("System saved views cannot be edited.");
  }
  if (!canManageSavedView(input.actor, existing)) {
    throw new PermissionDeniedError("You do not have permission to edit this saved view.");
  }

  const nextVisibility = input.visibility ?? normalizeVisibility(existing);
  if (input.visibility && input.visibility !== normalizeVisibility(existing)) {
    assertVisibilityChangeAllowed(input.actor, input.visibility);
  }

  const data: Prisma.CalendarSavedViewUpdateInput = {
    updatedByUserId: input.actor.userId,
  };

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new ValidationError("Saved view name cannot be empty.");
    data.name = trimmed;
  }
  if (input.description !== undefined) data.description = input.description;

  if (input.query !== undefined) {
    const campaignKey = input.campaignKey ?? existing.campaignKey ?? DEFAULT_CAMPAIGN_KEY;
    const parsed = parseCalendarQuery(input.query, { campaignKey });
    if (!parsed.ok) throw new ValidationError(`Invalid saved view query: ${parsed.error}`);
    const canonicalQuery = canonicalizeCalendarQuery(parsed.query);
    data.filtersJson = canonicalQuery as unknown as Prisma.InputJsonValue;
    data.queryJson = canonicalQuery as unknown as Prisma.InputJsonValue;
    data.querySchemaVersion = CALENDAR_QUERY_SCHEMA_VERSION;
    data.staleState = null;
    data.dateRangeMode = canonicalQuery.relativeDateMode ?? null;
    if (!input.viewMode && canonicalQuery.viewMode) data.viewMode = canonicalQuery.viewMode;
  }

  if (input.viewMode !== undefined) {
    if (input.viewMode !== null && !VIEW_MODES.includes(input.viewMode as ViewMode)) {
      throw new ValidationError(`Unknown viewMode: "${input.viewMode}".`);
    }
    data.viewMode = input.viewMode;
  }

  if (input.visibility !== undefined) {
    if (!SAVED_VIEW_VISIBILITIES.includes(input.visibility)) {
      throw new ValidationError(`Unknown visibility: "${input.visibility}".`);
    }
    data.visibility = input.visibility;
    data.isShared = input.visibility !== "PRIVATE";
  }
  if (input.roleScope !== undefined) {
    if (nextVisibility === "ROLE_RESTRICTED" && (!input.roleScope || input.roleScope.length === 0)) {
      throw new ValidationError("ROLE_RESTRICTED saved views require at least one roleScope entry.");
    }
    data.roleScope = (input.roleScope ?? null) as unknown as Prisma.InputJsonValue;
  }
  if (input.campaignKey !== undefined) data.campaignKey = input.campaignKey;

  if (input.isPinned !== undefined) {
    if (!canManageSavedView(input.actor, existing)) {
      throw new PermissionDeniedError("You do not have permission to pin this saved view.");
    }
    data.isPinned = input.isPinned;
  }

  if (input.isDefault !== undefined) {
    if (existing.ownerUserId !== input.actor.userId) {
      throw new PermissionDeniedError("Only the owner may set their personal default saved view.");
    }
    if (input.isDefault) {
      await prisma.calendarSavedView.updateMany({
        where: { ownerUserId: input.actor.userId, isDefault: true, id: { not: existing.id } },
        data: { isDefault: false },
      });
    }
    data.isDefault = input.isDefault;
  }

  const row = await prisma.calendarSavedView.update({ where: { id: existing.id }, data });
  return toSavedViewWithQuery(row);
}

/** Copy any saved view the actor can currently read into a brand-new PRIVATE view they own. */
export async function duplicateSavedViewAsPrivate(input: {
  actor: AuthenticatedActor;
  viewId: string;
  name?: string;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const source = await requireSavedViewRow(input.viewId);
  if (!canReadSavedView(input.actor, source)) {
    throw new PermissionDeniedError("You do not have permission to view this saved view.");
  }
  const { query } = resolveQueryForRow(source);
  const canonicalQuery = canonicalizeCalendarQuery(query);
  const name = input.name?.trim() || `${source.name} (copy)`;

  const row = await prisma.calendarSavedView.create({
    data: {
      ownerUserId: input.actor.userId,
      name,
      description: source.description,
      isDefault: false,
      isPinned: false,
      isShared: false,
      isSystemView: false,
      visibility: "PRIVATE",
      roleScope: null as unknown as Prisma.InputJsonValue,
      campaignKey: source.campaignKey,
      dateRangeMode: canonicalQuery.relativeDateMode ?? null,
      viewMode: source.viewMode,
      filtersJson: canonicalQuery as unknown as Prisma.InputJsonValue,
      queryJson: canonicalQuery as unknown as Prisma.InputJsonValue,
      querySchemaVersion: CALENDAR_QUERY_SCHEMA_VERSION,
      staleState: null,
      createdByUserId: input.actor.userId,
      updatedByUserId: input.actor.userId,
    },
  });
  return toSavedViewWithQuery(row);
}

export async function pinSavedView(input: {
  actor: AuthenticatedActor;
  viewId: string;
  pinned: boolean;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (!canManageSavedView(input.actor, existing)) {
    throw new PermissionDeniedError("You do not have permission to pin this saved view.");
  }
  const row = await prisma.calendarSavedView.update({
    where: { id: existing.id },
    data: { isPinned: input.pinned, updatedByUserId: input.actor.userId },
  });
  return toSavedViewWithQuery(row);
}

/** Setting a default clears any other default owned by the same user — never across owners. */
export async function setDefaultSavedView(input: {
  actor: AuthenticatedActor;
  viewId: string;
  isDefault?: boolean;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (existing.ownerUserId !== input.actor.userId) {
    throw new PermissionDeniedError("Only the owner may set their personal default saved view.");
  }

  const isDefault = input.isDefault ?? true;

  if (isDefault) {
    await prisma.calendarSavedView.updateMany({
      where: { ownerUserId: input.actor.userId, isDefault: true, id: { not: existing.id } },
      data: { isDefault: false },
    });
  }

  const row = await prisma.calendarSavedView.update({
    where: { id: existing.id },
    data: { isDefault, updatedByUserId: input.actor.userId },
  });
  return toSavedViewWithQuery(row);
}

export async function archiveSavedView(input: {
  actor: AuthenticatedActor;
  viewId: string;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (existing.isSystemView) throw new PermissionDeniedError("System saved views cannot be archived.");
  if (!canManageSavedView(input.actor, existing)) {
    throw new PermissionDeniedError("You do not have permission to archive this saved view.");
  }
  const row = await prisma.calendarSavedView.update({
    where: { id: existing.id },
    data: { archivedAt: new Date(), updatedByUserId: input.actor.userId },
  });
  return toSavedViewWithQuery(row);
}

export async function restoreSavedView(input: {
  actor: AuthenticatedActor;
  viewId: string;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (!canManageSavedView(input.actor, existing)) {
    throw new PermissionDeniedError("You do not have permission to restore this saved view.");
  }
  const row = await prisma.calendarSavedView.update({
    where: { id: existing.id },
    data: { archivedAt: null, updatedByUserId: input.actor.userId },
  });
  return toSavedViewWithQuery(row);
}

/**
 * Explicitly migrate a saved view's stored query to the current schema
 * version. Idempotent — re-running on an already-current view is a no-op
 * write (still bumps `updatedByUserId`/`updatedAt` for auditability).
 */
export async function migrateSavedViewQuery(input: {
  actor: AuthenticatedActor;
  viewId: string;
}): Promise<SavedViewWithQuery> {
  await requireAuthorized(input.actor, { action: "SAVED_VIEW_MANAGE", resource: { type: "system" } });
  const existing = await requireSavedViewRow(input.viewId);
  if (!canManageSavedView(input.actor, existing)) {
    throw new PermissionDeniedError("You do not have permission to migrate this saved view.");
  }

  const { query, staleState } = resolveQueryForRow(existing);
  const row = await prisma.calendarSavedView.update({
    where: { id: existing.id },
    data: {
      filtersJson: query as unknown as Prisma.InputJsonValue,
      queryJson: query as unknown as Prisma.InputJsonValue,
      querySchemaVersion: CALENDAR_QUERY_SCHEMA_VERSION,
      staleState: staleState === "NEEDS_MIGRATION" ? "NEEDS_MIGRATION" : null,
      updatedByUserId: input.actor.userId,
    },
  });
  return toSavedViewWithQuery(row);
}
