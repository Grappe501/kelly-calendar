import "server-only";

import { getServerEnvironment } from "@/lib/env/server-environment";
import { getSessionViewer, type SessionViewer } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/lib/security/safe-error";
import type { SystemRoleName } from "@/lib/auth/system-roles";

export type AuthenticatedActor = {
  userId: string;
  email: string;
  displayName: string;
  systemRoles: SystemRoleName[];
  primarySystemRole: SystemRoleName;
  teamMemberships: Array<{
    teamId: string;
    teamName: string;
    role?: string;
    active: boolean;
  }>;
  teamIds: string[];
  sessionId: string;
  tokenId: string;
  isActive: boolean;
};

function toActor(
  viewer: SessionViewer,
  teams: AuthenticatedActor["teamMemberships"],
): AuthenticatedActor {
  return {
    userId: viewer.userId,
    email: viewer.email,
    displayName: viewer.displayName,
    systemRoles: [viewer.systemRole],
    primarySystemRole: viewer.systemRole,
    teamMemberships: teams,
    teamIds: teams.filter((t) => t.active).map((t) => t.teamId),
    sessionId: viewer.sessionId,
    tokenId: viewer.tokenId,
    isActive: true,
  };
}

export async function getOptionalAuthenticatedActor(
  _request?: Request,
): Promise<AuthenticatedActor | null> {
  void _request;
  getServerEnvironment();
  const viewer = await getSessionViewer();
  if (!viewer) return null;

  const memberships = await prisma.teamMembership.findMany({
    where: { userId: viewer.userId, isActive: true },
    include: { team: { select: { id: true, name: true, isActive: true } } },
  });
  const teams = memberships
    .filter((m) => m.team.isActive)
    .map((m) => ({
      teamId: m.teamId,
      teamName: m.team.name,
      role: m.roleLabel ?? undefined,
      active: true,
    }));

  return toActor(viewer, teams);
}

export async function requireAuthenticatedActor(
  request?: Request,
): Promise<AuthenticatedActor> {
  const actor = await getOptionalAuthenticatedActor(request);
  if (!actor) {
    throw new AppError({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Sign in is required.",
    });
  }
  return actor;
}

export async function requireActiveAuthenticatedActor(
  request?: Request,
): Promise<AuthenticatedActor> {
  const actor = await requireAuthenticatedActor(request);
  if (!actor.isActive) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      status: 403,
      publicMessage: "This account is not active.",
    });
  }
  return actor;
}

export function actorAsSessionViewer(actor: AuthenticatedActor): SessionViewer {
  return {
    userId: actor.userId,
    email: actor.email,
    displayName: actor.displayName,
    systemRole: actor.primarySystemRole,
    teamIds: actor.teamIds,
    sessionId: actor.sessionId,
    tokenId: actor.tokenId,
  };
}
