import "server-only";

import type { AuthenticatedActor } from "@/server/auth/actor";
import type {
  AuthorizationResource,
  MutationAction,
} from "@/server/auth/actions";
import { resolveCalendarAccess } from "@/server/authorization/resolve-calendar-access";
import { canAccessEvent } from "@/server/authorization/can-access-event";
import { accessLevelRank } from "@/lib/auth/access-level";
import {
  roleHasFullCalendarAccess,
  roleMayMutate,
} from "@/lib/auth/system-roles";
import { AppError } from "@/lib/security/safe-error";
import { prisma } from "@/server/db/prisma";

export type AuthorizeResult = {
  allowed: boolean;
  reason: string;
  accessLevel?: string;
};

const VIEW_ACTIONS = new Set<MutationAction>([
  "EVENT_VIEW",
  "WORKFLOW_PREVIEW",
  "RECOMMENDATION_VIEW",
  "READINESS_VIEW",
  "CONFLICT_VIEW",
  "HISTORICAL_IMPORT_VIEW",
  "CALENDAR_INTEGRITY_VIEW",
  "AUDIT_VIEW",
  "AVAILABILITY_VIEW",
]);

function needsMutatorRole(action: MutationAction): boolean {
  return !VIEW_ACTIONS.has(action);
}

function minRankForAction(action: MutationAction): number {
  switch (action) {
    case "EVENT_VIEW":
    case "WORKFLOW_PREVIEW":
    case "RECOMMENDATION_VIEW":
    case "READINESS_VIEW":
    case "CONFLICT_VIEW":
    case "HISTORICAL_IMPORT_VIEW":
    case "CALENDAR_INTEGRITY_VIEW":
    case "AUDIT_VIEW":
    case "AVAILABILITY_VIEW":
      return 1;
    case "EVENT_CREATE":
    case "EVENT_EDIT":
    case "EVENT_OBJECTIVES_EDIT":
    case "EVENT_PROGRAM_FLOW_EDIT":
    case "EVENT_PACKING_EDIT":
    case "EVENT_STAFFING_EDIT":
    case "EVENT_ACTIONS_EDIT":
    case "EVENT_COMMUNICATIONS_EDIT":
    case "EVENT_TRAVEL_EDIT":
    case "WORKFLOW_APPLY":
    case "RECOMMENDATION_DECIDE":
    case "READINESS_RECALCULATE":
    case "READINESS_SNAPSHOT_WRITE":
    case "CONFLICT_ACKNOWLEDGE":
    case "APPROVAL_REQUEST":
    case "HISTORICAL_IMPORT_APPROVE":
    case "HISTORICAL_IMPORT_REJECT":
    case "HISTORICAL_IMPORT_MERGE":
    case "CALENDAR_INTEGRITY_SCAN":
    case "CALENDAR_INTEGRITY_DISPOSE":
    case "AVAILABILITY_MANAGE":
    case "AVAILABILITY_ACKNOWLEDGE":
      return 4; // CONTRIBUTE+
    case "EVENT_ARCHIVE":
    case "EVENT_RESTORE":
    case "EVENT_CHANGE_PRIMARY_CALENDAR":
    case "EVENT_MANAGE_CALENDARS":
    case "CALENDAR_MEMBERSHIP_MANAGE":
    case "APPROVAL_RESOLVE":
    case "CONFLICT_OVERRIDE":
    case "CALENDAR_INTEGRITY_REPAIR":
    case "AVAILABILITY_APPROVE":
      return 5; // EDIT+
    case "TEAM_MEMBERSHIP_MANAGE":
    case "SYSTEM_ROLE_MANAGE":
      return 7; // ADMINISTER
    default:
      return 7;
  }
}

export async function authorize(
  actor: AuthenticatedActor,
  input: { action: MutationAction; resource?: AuthorizationResource },
): Promise<AuthorizeResult> {
  if (!actor.isActive) {
    return { allowed: false, reason: "Account inactive" };
  }

  if (needsMutatorRole(input.action) && !roleMayMutate(actor.primarySystemRole)) {
    return { allowed: false, reason: "Role may not mutate" };
  }

  if (roleHasFullCalendarAccess(actor.primarySystemRole)) {
    if (
      input.action === "SYSTEM_ROLE_MANAGE" &&
      actor.primarySystemRole !== "KELLY" &&
      actor.primarySystemRole !== "CAMPAIGN_MANAGER"
    ) {
      return { allowed: false, reason: "System role manage restricted" };
    }
    return {
      allowed: true,
      reason: `${actor.primarySystemRole} administers`,
      accessLevel: "ADMINISTER",
    };
  }

  if (input.action === "SYSTEM_ROLE_MANAGE" || input.action === "TEAM_MEMBERSHIP_MANAGE") {
    return { allowed: false, reason: "Requires leadership administer" };
  }

  if (input.action === "CONFLICT_OVERRIDE") {
    return { allowed: false, reason: "Conflict override requires leadership" };
  }

  const resource = input.resource;
  if (!resource) {
    return { allowed: false, reason: "Resource required" };
  }

  if (resource.type === "system") {
    if (VIEW_ACTIONS.has(input.action)) {
      return { allowed: true, reason: "System view" };
    }
    // Draft staging and similar pre-calendar writes: mutator roles only.
    if (input.action === "EVENT_CREATE" && roleMayMutate(actor.primarySystemRole)) {
      return { allowed: true, reason: "System draft create for mutator role" };
    }
    if (
      (input.action === "CALENDAR_INTEGRITY_SCAN" ||
        input.action === "CALENDAR_INTEGRITY_DISPOSE" ||
        input.action === "CALENDAR_INTEGRITY_REPAIR") &&
      roleMayMutate(actor.primarySystemRole)
    ) {
      return { allowed: true, reason: "Calendar integrity mutation for mutator role" };
    }
    if (
      (input.action === "AVAILABILITY_MANAGE" ||
        input.action === "AVAILABILITY_ACKNOWLEDGE") &&
      roleMayMutate(actor.primarySystemRole)
    ) {
      return { allowed: true, reason: "Availability mutation for mutator role" };
    }
    // AVAILABILITY_APPROVE (and standing-rule seeding) requires leadership
    // full calendar access, already granted above for KELLY/CAMPAIGN_MANAGER.
    return { allowed: false, reason: "System mutation denied" };
  }

  if (resource.type === "calendar" && resource.calendarId) {
    const access = await resolveCalendarAccess({
      calendarId: resource.calendarId,
      viewerUserId: actor.userId,
      systemRole: actor.primarySystemRole,
      teamIds: actor.teamIds,
    });
    const ok =
      access.allowed &&
      accessLevelRank(access.accessLevel) >= minRankForAction(input.action);
    return {
      allowed: ok,
      reason: access.reason,
      accessLevel: access.accessLevel,
    };
  }

  if (resource.type === "event" && resource.id) {
    const access = await canAccessEvent({
      eventId: resource.id,
      viewerUserId: actor.userId,
    });
    const ok =
      access.allowed &&
      accessLevelRank(access.accessLevel) >= minRankForAction(input.action);
    return {
      allowed: ok,
      reason: access.reason,
      accessLevel: access.accessLevel,
    };
  }

  if (resource.type === "import_record") {
    // Import review: mutator roles with contribute+ on any ops calendar, or leadership
    return {
      allowed: roleMayMutate(actor.primarySystemRole),
      reason: "Import review for mutator roles",
    };
  }

  if (resource.type === "approval") {
    return {
      allowed: roleMayMutate(actor.primarySystemRole),
      reason: "Approval actions for mutator roles",
    };
  }

  if (resource.type === "conflict") {
    if (input.action === "CONFLICT_ACKNOWLEDGE" || input.action === "CONFLICT_VIEW") {
      return {
        allowed: roleMayMutate(actor.primarySystemRole) || actor.primarySystemRole === "READ_ONLY_ADVISOR",
        reason: "Conflict view/ack",
      };
    }
  }

  void prisma;
  return { allowed: false, reason: "Default deny" };
}

export async function requireAuthorized(
  actor: AuthenticatedActor,
  input: { action: MutationAction; resource?: AuthorizationResource },
): Promise<AuthorizeResult> {
  const result = await authorize(actor, input);
  if (!result.allowed) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "You do not have permission to perform this action.",
      internalMessage: `${input.action}: ${result.reason}`,
    });
  }
  return result;
}
