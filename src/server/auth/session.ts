import "server-only";

import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import {
  decodeSessionCookie,
  encodeSessionCookie,
  newTokenId,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  type SessionCookiePayload,
} from "@/lib/auth/session-cookie";
import { isSystemRole, type SystemRoleName } from "@/lib/auth/system-roles";
import type { ViewerContext } from "@/lib/calendar-security/calendar-access-types";

export type SessionViewer = {
  userId: string;
  email: string;
  displayName: string;
  systemRole: SystemRoleName;
  teamIds: string[];
  sessionId: string;
  tokenId: string;
};

function hashMeta(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function createSessionForUser(input: {
  userId: string;
  systemRole: SystemRoleName;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ cookieValue: string; expiresAt: Date; tokenId: string }> {
  const tokenId = newTokenId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.authSession.create({
    data: {
      userId: input.userId,
      tokenId,
      expiresAt,
      ipHash: hashMeta(input.ip),
      userAgentHash: hashMeta(input.userAgent),
    },
  });
  const payload: SessionCookiePayload = {
    sid: tokenId,
    uid: input.userId,
    role: input.systemRole,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  return {
    cookieValue: encodeSessionCookie(payload),
    expiresAt,
    tokenId,
  };
}

export async function revokeSession(tokenId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionViewer(
  cookieHeaderValue?: string | null,
): Promise<SessionViewer | null> {
  const jar = cookieHeaderValue
    ? null
    : await cookies();
  const raw =
    cookieHeaderValue ??
    jar?.get(SESSION_COOKIE_NAME)?.value ??
    null;
  const payload = decodeSessionCookie(raw);
  if (!payload || !isSystemRole(payload.role)) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenId: payload.sid },
    include: {
      user: {
        include: {
          teamMemberships: {
            where: { isActive: true },
            select: { teamId: true, endsAt: true },
          },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (!session.user.isActive || session.user.id !== payload.uid) return null;
  if (!isSystemRole(session.user.systemRole)) return null;

  const now = new Date();
  // Throttle lastSeen updates
  if (now.getTime() - session.lastSeenAt.getTime() > 60_000) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });
  }

  const teamIds = session.user.teamMemberships
    .filter((m) => !m.endsAt || m.endsAt.getTime() > now.getTime())
    .map((m) => m.teamId);

  return {
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    systemRole: session.user.systemRole,
    teamIds,
    sessionId: session.id,
    tokenId: session.tokenId,
  };
}

export async function requireSessionViewer(): Promise<SessionViewer> {
  const viewer = await getSessionViewer();
  if (!viewer) {
    throw Object.assign(new Error("Authentication required"), {
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage: "Sign in required.",
    });
  }
  return viewer;
}

export function viewerToContext(
  viewer: SessionViewer,
  calendarPermissions: ViewerContext["calendarPermissions"] = {},
): ViewerContext {
  return {
    authenticated: true,
    systemRole: viewer.systemRole,
    teamIds: viewer.teamIds,
    calendarPermissions,
  };
}

export { SESSION_COOKIE_NAME, sessionCookieOptions };
