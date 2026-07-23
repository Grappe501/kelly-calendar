import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import {
  ORG_CAMPAIGN_SCOPE,
  ORG_CLUSTER_KEYS,
  ORG_CORE_POSITIONS,
  ORG_DEPARTMENTS,
  ORG_TEMPLATE_CODE,
  ORG_TEMPLATE_VERSION,
  TOP_OPERATING_DEPARTMENT_KEYS,
  buildOrgTemplateFingerprint,
} from "@/lib/organization/template";

export async function findTemplateInstall() {
  return prisma.campaignOrgTemplateInstall.findUnique({
    where: {
      campaignScopeKey_templateCode_templateVersion: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        templateCode: ORG_TEMPLATE_CODE,
        templateVersion: ORG_TEMPLATE_VERSION,
      },
    },
  });
}

export async function countOrgScaffold() {
  const [departments, functions, positions, clusters, captains, assignments, people, users] =
    await Promise.all([
      prisma.campaignOrgDepartment.count({ where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE } }),
      prisma.campaignOrgFunction.count({ where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE } }),
      prisma.campaignOrgPosition.count({ where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE } }),
      prisma.campaignOrgCluster.count({ where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE } }),
      prisma.campaignOrgPosition.count({
        where: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          key: { startsWith: "COUNTY_CAPTAIN_" },
        },
      }),
      prisma.campaignOrgPositionAssignment.count({
        where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
      }),
      prisma.person.count(),
      prisma.user.count(),
    ]);
  return { departments, functions, positions, clusters, captains, assignments, people, users };
}

/**
 * Explicit idempotent install. Creates vacant structure only.
 */
export async function installOrganizationTemplate(actorUserId?: string | null) {
  const existing = await findTemplateInstall();
  if (existing) {
    return {
      installed: false,
      idempotentHit: true,
      templateCode: ORG_TEMPLATE_CODE,
      templateVersion: ORG_TEMPLATE_VERSION,
      counts: await countOrgScaffold(),
      created: {
        departments: 0,
        functions: 0,
        positions: 0,
        clusters: 0,
        countyCaptains: 0,
        assignments: 0,
        people: 0,
      },
    };
  }

  const counties = await prisma.arkansasCounty.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, name: true, fipsCode: true },
  });
  if (counties.length !== 75) {
    throw new Error(`Expected 75 IC-01 counties, found ${counties.length}`);
  }

  const fingerprint = createHash("sha256")
    .update(buildOrgTemplateFingerprint(), "utf8")
    .digest("hex")
    .slice(0, 32);

  const result = await prisma.$transaction(
    async (tx) => {
    const deptMap = new Map<string, string>();
    const fnMap = new Map<string, string>();

    for (const d of ORG_DEPARTMENTS) {
      const row = await tx.campaignOrgDepartment.create({
        data: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          key: d.key,
          displayName: d.displayName,
          purpose: d.purpose,
          parentKey: d.parentKey ?? null,
          sortOrder: d.sortOrder,
          privacyLevel: d.privacyLevel,
          templateVersion: ORG_TEMPLATE_VERSION,
        },
      });
      deptMap.set(d.key, row.id);
      for (const f of d.functions) {
        const fn = await tx.campaignOrgFunction.create({
          data: {
            campaignScopeKey: ORG_CAMPAIGN_SCOPE,
            departmentId: row.id,
            key: f.key,
            displayName: f.displayName,
            purpose: f.purpose,
            sortOrder: f.sortOrder,
            templateVersion: ORG_TEMPLATE_VERSION,
          },
        });
        fnMap.set(f.key, fn.id);
      }
    }

    const clusterMap = new Map<string, string>();
    for (const c of ORG_CLUSTER_KEYS) {
      const row = await tx.campaignOrgCluster.create({
        data: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          key: c.key,
          displayName: c.displayName,
          description: "Draft placeholder — county membership not invented.",
          membershipStatus: "DRAFT",
          membershipVersion: "1",
          templateVersion: ORG_TEMPLATE_VERSION,
          sortOrder: c.sortOrder,
        },
      });
      clusterMap.set(c.key, row.id);
      await tx.campaignOrgPosition.create({
        data: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          key: `CLUSTER_MANAGER_${c.key}`,
          title: `Cluster Manager — ${c.displayName}`,
          departmentId: deptMap.get("VOLUNTEER_AND_ORGANIZING")!,
          functionId: fnMap.get("COUNTY_ORGANIZING")!,
          reportsToPositionKey: "COUNTY_ORGANIZING_LEAD",
          scopeType: "CLUSTER",
          clusterId: row.id,
          permissionsProfile: "CLUSTER_MANAGER",
          status: "VACANT",
          templateVersion: ORG_TEMPLATE_VERSION,
          sortOrder: 100 + c.sortOrder,
        },
      });
    }

    for (const p of ORG_CORE_POSITIONS) {
      await tx.campaignOrgPosition.create({
        data: {
          campaignScopeKey: ORG_CAMPAIGN_SCOPE,
          key: p.key,
          title: p.title,
          departmentId: p.departmentKey ? deptMap.get(p.departmentKey)! : null,
          functionId: p.functionKey ? fnMap.get(p.functionKey)! : null,
          reportsToPositionKey: p.reportsToPositionKey ?? null,
          scopeType: p.scopeType,
          permissionsProfile: p.permissionsProfile,
          privacyLevel: p.privacyLevel ?? "INTERNAL",
          status: "VACANT",
          templateVersion: ORG_TEMPLATE_VERSION,
          sortOrder: p.sortOrder,
        },
      });
    }

    await tx.campaignOrgPosition.createMany({
      data: counties.map((county) => ({
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        key: `COUNTY_CAPTAIN_${county.slug}`,
        title: `County Captain — ${county.name}`,
        departmentId: deptMap.get("VOLUNTEER_AND_ORGANIZING")!,
        functionId: fnMap.get("COUNTY_ORGANIZING")!,
        reportsToPositionKey: "COUNTY_ORGANIZING_LEAD",
        scopeType: "COUNTY" as const,
        arkansasCountyId: county.id,
        permissionsProfile: "COUNTY_CAPTAIN",
        status: "VACANT" as const,
        templateVersion: ORG_TEMPLATE_VERSION,
        sortOrder: 200,
      })),
    });

    await tx.campaignOrgTemplateInstall.create({
      data: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        templateCode: ORG_TEMPLATE_CODE,
        templateVersion: ORG_TEMPLATE_VERSION,
        installedByUserId: actorUserId ?? null,
        fingerprint,
      },
    });

    await tx.campaignOrgAuditEvent.create({
      data: {
        campaignScopeKey: ORG_CAMPAIGN_SCOPE,
        action: "INSTALL_TEMPLATE",
        actorUserId: actorUserId ?? null,
        detailJson: {
          templateCode: ORG_TEMPLATE_CODE,
          templateVersion: ORG_TEMPLATE_VERSION,
          counties: counties.length,
          clusters: 6,
          assignments: 0,
          people: 0,
          topOperatingDepartments: [...TOP_OPERATING_DEPARTMENT_KEYS],
        },
      },
    });

    return {
      departments: ORG_DEPARTMENTS.length,
      functions: ORG_DEPARTMENTS.reduce((n, d) => n + d.functions.length, 0),
      corePositions: ORG_CORE_POSITIONS.length,
      clusterManagers: 6,
      countyCaptains: counties.length,
    };
  },
    { timeout: 120_000, maxWait: 20_000 },
  );

  return {
    installed: true,
    idempotentHit: false,
    templateCode: ORG_TEMPLATE_CODE,
    templateVersion: ORG_TEMPLATE_VERSION,
    counts: await countOrgScaffold(),
    created: {
      departments: result.departments,
      functions: result.functions,
      positions: result.corePositions + result.clusterManagers + result.countyCaptains,
      clusters: 6,
      countyCaptains: result.countyCaptains,
      assignments: 0,
      people: 0,
    },
  };
}

export async function listDepartments() {
  return prisma.campaignOrgDepartment.findMany({
    where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
    include: { functions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listPositions(filter?: { vacantOnly?: boolean }) {
  return prisma.campaignOrgPosition.findMany({
    where: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      ...(filter?.vacantOnly ? { status: "VACANT" } : {}),
    },
    include: {
      department: { select: { key: true, displayName: true } },
      county: { select: { name: true, slug: true, fipsCode: true } },
      cluster: { select: { key: true, displayName: true } },
      assignments: {
        where: { status: { in: ["ACTIVE", "INTERIM", "PROPOSED"] } },
        take: 5,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

export async function listClusters() {
  return prisma.campaignOrgCluster.findMany({
    where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
    include: {
      counties: true,
      positions: { where: { key: { startsWith: "CLUSTER_MANAGER_" } } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listAudits(take = 50) {
  return prisma.campaignOrgAuditEvent.findMany({
    where: { campaignScopeKey: ORG_CAMPAIGN_SCOPE },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function proposeAssignment(input: {
  positionId: string;
  userId: string;
  actorUserId?: string | null;
  reason?: string;
  autoMatchByName?: boolean;
}) {
  if (input.autoMatchByName === true) {
    throw new Error("Name-only assignment is blocked.");
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found — select an existing campaign user.");

  const assignment = await prisma.campaignOrgPositionAssignment.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      positionId: input.positionId,
      userId: input.userId,
      status: "PROPOSED",
      assignedByUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
    },
  });
  await prisma.campaignOrgAuditEvent.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      action: "PROPOSE_ASSIGNMENT",
      actorUserId: input.actorUserId ?? null,
      detailJson: {
        assignmentId: assignment.id,
        grantsAccess: false,
        status: "PROPOSED",
      },
    },
  });
  return assignment;
}

export async function activateAssignment(
  assignmentId: string,
  actorUserId?: string | null,
) {
  const updated = await prisma.campaignOrgPositionAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "ACTIVE",
      acceptedAt: new Date(),
      startsAt: new Date(),
    },
  });
  await prisma.campaignOrgPosition.update({
    where: { id: updated.positionId },
    data: { status: "FILLED" },
  });
  await prisma.campaignOrgAuditEvent.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      action: "ACTIVATE_ASSIGNMENT",
      actorUserId: actorUserId ?? null,
      detailJson: { assignmentId, grantsAccess: true },
    },
  });
  return updated;
}

export async function endAssignment(
  assignmentId: string,
  actorUserId?: string | null,
) {
  const updated = await prisma.campaignOrgPositionAssignment.update({
    where: { id: assignmentId },
    data: { status: "ENDED", endsAt: new Date() },
  });
  const remaining = await prisma.campaignOrgPositionAssignment.count({
    where: {
      positionId: updated.positionId,
      status: { in: ["ACTIVE", "INTERIM"] },
    },
  });
  if (remaining === 0) {
    await prisma.campaignOrgPosition.update({
      where: { id: updated.positionId },
      data: { status: "VACANT" },
    });
  }
  await prisma.campaignOrgAuditEvent.create({
    data: {
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
      action: "END_ASSIGNMENT",
      actorUserId: actorUserId ?? null,
      detailJson: { assignmentId, grantsAccess: false },
    },
  });
  return updated;
}

export async function getActiveAssignmentsForUser(userId: string) {
  return prisma.campaignOrgPositionAssignment.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "INTERIM"] },
      campaignScopeKey: ORG_CAMPAIGN_SCOPE,
    },
    include: {
      position: {
        include: { department: true, county: true, cluster: true },
      },
    },
  });
}
