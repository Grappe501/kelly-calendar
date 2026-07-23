import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  assignmentGrantsAccess,
  boardsForPermissionsProfile,
  financeBoardRequiresRestrictedProfile,
  maturityFromEventAttendanceAlone,
} from "@/lib/organization/access";
import {
  ORG_BUILD_ID,
  ORG_TEMPLATE_CODE,
  ORG_TEMPLATE_VERSION,
  TOP_OPERATING_DEPARTMENT_KEYS,
  buildOrgTemplateFingerprint,
} from "@/lib/organization/template";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  activateAssignment,
  countOrgScaffold,
  endAssignment,
  findTemplateInstall,
  getActiveAssignmentsForUser,
  installOrganizationTemplate,
  listAudits,
  listClusters,
  listDepartments,
  listPositions,
  proposeAssignment,
} from "@/server/repositories/campaign-organization-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { findActivePlanForMission } from "@/server/repositories/mission-activation-repository";

function requireOrgAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Organization structure requires campaign calendar access.",
    );
  }
}

/** Read status — creates ZERO records. */
export async function getOrganizationStatus(actor: AuthenticatedActor) {
  requireOrgAccess(actor);
  const install = await findTemplateInstall();
  const counts = await countOrgScaffold();
  return {
    buildId: ORG_BUILD_ID,
    templateCode: ORG_TEMPLATE_CODE,
    templateVersion: ORG_TEMPLATE_VERSION,
    fingerprint: buildOrgTemplateFingerprint(),
    installed: Boolean(install),
    installedAt: install?.installedAt?.toISOString() ?? null,
    counts,
    topOperatingDepartments: [...TOP_OPERATING_DEPARTMENT_KEYS],
    guarantees: {
      readsCreateZeroRecords: true,
      noFabricatedPeople: true,
      noAutoAssignments: true,
    },
  };
}

export async function previewOrganizationTemplate(actor: AuthenticatedActor) {
  requireOrgAccess(actor);
  return {
    buildId: ORG_BUILD_ID,
    templateCode: ORG_TEMPLATE_CODE,
    templateVersion: ORG_TEMPLATE_VERSION,
    fingerprint: buildOrgTemplateFingerprint(),
    willCreate: {
      departments: 6,
      topOperatingDepartments: 4,
      clusters: 6,
      countyCaptains: 75,
      assignments: 0,
      people: 0,
      tasks: 0,
      events: 0,
      missions: 0,
    },
    createdRecords: 0,
  };
}

export async function installOrganization(
  actor: AuthenticatedActor,
  body: Record<string, unknown>,
) {
  requireOrgAccess(actor);
  if (body.confirmInstall !== true) {
    throw new ValidationError("confirmInstall: true is required.");
  }
  const before = await countOrgScaffold();
  const result = await installOrganizationTemplate(actor.userId);
  return { ...result, before, buildId: ORG_BUILD_ID };
}

export async function getOrganizationDirectory(actor: AuthenticatedActor) {
  requireOrgAccess(actor);
  const [departments, positions, clusters] = await Promise.all([
    listDepartments(),
    listPositions(),
    listClusters(),
  ]);
  return {
    buildId: ORG_BUILD_ID,
    departments: departments.map((d) => ({
      key: d.key,
      displayName: d.displayName,
      purpose: d.purpose,
      privacyLevel: d.privacyLevel,
      functions: d.functions.map((f) => ({
        key: f.key,
        displayName: f.displayName,
      })),
    })),
    positions: positions.map((p) => ({
      id: p.id,
      key: p.key,
      title: p.title,
      status: p.status,
      department: p.department?.displayName ?? null,
      county: p.county?.name ?? null,
      cluster: p.cluster?.displayName ?? null,
      activeAssignments: p.assignments.filter((a) =>
        assignmentGrantsAccess(a.status),
      ).length,
      proposedOnly: p.assignments.some((a) => a.status === "PROPOSED"),
    })),
    clusters: clusters.map((c) => ({
      key: c.key,
      displayName: c.displayName,
      membershipStatus: c.membershipStatus,
      countyMembershipCount: c.counties.length,
      managerVacant: c.positions.every((p) => p.status === "VACANT"),
    })),
    privateContactsExposed: false,
  };
}

export async function getRoleAwareDashboard(
  actor: AuthenticatedActor,
  board: string,
) {
  requireOrgAccess(actor);
  const assignments = await getActiveAssignmentsForUser(actor.userId);
  const boards = new Set<string>();
  for (const a of assignments) {
    for (const b of boardsForPermissionsProfile(
      a.position.permissionsProfile,
      a.position.department?.key,
    )) {
      boards.add(b);
    }
  }
  // System calendar roles may view org boards for scaffolding until positions filled
  if (roleHasFullCalendarAccess(actor.primarySystemRole)) {
    boards.add("campaign_manager");
    boards.add("operations_data");
    boards.add("volunteer_organizing");
    boards.add("communications");
    boards.add("organization_directory");
  }

  if (board === "finance") {
    const ok = assignments.some((a) =>
      financeBoardRequiresRestrictedProfile(a.position.permissionsProfile),
    ) || actor.primarySystemRole === "KELLY" || actor.primarySystemRole === "CAMPAIGN_MANAGER";
    if (!ok && !boards.has("finance")) {
      throw new PermissionDeniedError("Finance board requires restricted access.");
    }
  }

  const vacant = await listPositions({ vacantOnly: true });
  const clusters = await listClusters();

  return {
    buildId: ORG_BUILD_ID,
    board,
    authorizedBoards: [...boards],
    vacantCritical: vacant
      .filter((p) =>
        [
          "CAMPAIGN_MANAGER",
          "VOLUNTEER_ORGANIZING_MANAGER",
          "COMMUNICATIONS_MANAGER",
          "FINANCE_MANAGER",
          "OPERATIONS_DATA_COORDINATOR",
        ].includes(p.key),
      )
      .map((p) => ({ key: p.key, title: p.title })),
    clusterDrafts: clusters.map((c) => ({
      key: c.key,
      membershipStatus: c.membershipStatus,
      countiesAssigned: c.counties.length,
    })),
    notes: [
      "Dashboard is scaffolded — no fabricated workload or people.",
      "IC-02B activation routes to Operations & Data / department positions when installed.",
    ],
    derivedCalendarCopiesEvents: false,
  };
}

export async function mutateAssignment(
  actor: AuthenticatedActor,
  body: Record<string, unknown>,
) {
  requireOrgAccess(actor);
  const action = String(body.action ?? "");
  if (action === "propose") {
    if (body.autoMatchByName === true) {
      throw new ValidationError("Name-only assignment is blocked.");
    }
    const positionId = String(body.positionId ?? "");
    const userId = String(body.userId ?? "");
    if (!positionId || !userId) {
      throw new ValidationError("positionId and userId required.");
    }
    const row = await proposeAssignment({
      positionId,
      userId,
      actorUserId: actor.userId,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      autoMatchByName: false,
    });
    return { assignment: row, grantsAccess: assignmentGrantsAccess(row.status) };
  }
  if (action === "activate") {
    const id = String(body.assignmentId ?? "");
    if (!id) throw new ValidationError("assignmentId required.");
    const row = await activateAssignment(id, actor.userId);
    return { assignment: row, grantsAccess: true };
  }
  if (action === "end") {
    const id = String(body.assignmentId ?? "");
    if (!id) throw new ValidationError("assignmentId required.");
    const row = await endAssignment(id, actor.userId);
    return { assignment: row, grantsAccess: false };
  }
  throw new ValidationError("Unknown assignment action.");
}

/**
 * Mission Operating Team panel — reads create zero tasks.
 * Surfaces vacant position gaps for IC-02B routing.
 */
export async function getMissionOperatingTeam(
  actor: AuthenticatedActor,
  missionId: string,
) {
  requireOrgAccess(actor);
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");

  const install = await findTemplateInstall();
  const plan = await findActivePlanForMission(missionId).catch(() => null);
  const critical = install
    ? await listPositions({ vacantOnly: true })
    : [];

  const lanes = [
    "Candidate",
    "Campaign Management",
    "Events",
    "Volunteer and Organizing",
    "County Organizing",
    "Communications",
    "Finance",
    "Operations",
    "Logistics",
    "Follow-up",
  ];

  return {
    buildId: ORG_BUILD_ID,
    missionId,
    createdTasks: 0,
    organizationInstalled: Boolean(install),
    activationPlanId: plan?.id ?? null,
    lanes: lanes.map((name) => ({
      name,
      accountablePositionVacant: true,
      staffingBlocker: install
        ? "Position may be vacant — do not silently reassign."
        : "Install organization template to bind positions.",
    })),
    vacantCriticalPositions: critical
      .filter((p) =>
        [
          "OPERATIONS_DATA_COORDINATOR",
          "VOLUNTEER_ORGANIZING_MANAGER",
          "COMMUNICATIONS_MANAGER",
          "EVENTS_DISTRIBUTED_ACTIONS_LEAD",
        ].includes(p.key),
      )
      .map((p) => p.title),
    escalationPath: [
      "Coordinator",
      "Department Manager",
      "Operations and Data",
      "Campaign Manager",
    ],
    maturityNote:
      "County maturity is not advanced by Mission/Event alone: " +
      maturityFromEventAttendanceAlone(),
  };
}

export async function getOrganizationAudit(actor: AuthenticatedActor) {
  requireOrgAccess(actor);
  const items = await listAudits();
  return { buildId: ORG_BUILD_ID, items };
}
