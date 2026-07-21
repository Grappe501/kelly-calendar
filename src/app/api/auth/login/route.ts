import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnvironment } from "@/lib/env/server-environment";
import { verifyPassword } from "@/lib/auth/password";
import { isSystemRole } from "@/lib/auth/system-roles";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";
import { prisma } from "@/server/db/prisma";
import {
  createSessionForUser,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/server/auth/session";
import { getAuthProviderStatus } from "@/server/auth/provider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    const serverEnv = getServerEnvironment();
    const provider = getAuthProviderStatus();
    if (!provider.loginEnabled) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 503,
        publicMessage:
          "Login is not configured. Set APP_SESSION_SECRET (32+ chars) in kelly-calendar/.env.local.",
      });
    }
    if (!serverEnv.databaseUrl) {
      throw new AppError({
        code: "DATABASE_UNAVAILABLE",
        status: 503,
        publicMessage:
          "Database is not configured. Set DATABASE_URL (and DIRECT_URL) for this environment.",
      });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        status: 400,
        publicMessage: "Email and password are required.",
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    let user;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (dbError) {
      throw new AppError({
        code: "DATABASE_UNAVAILABLE",
        status: 503,
        publicMessage:
          "Database is temporarily unavailable. Try again shortly.",
        cause: dbError,
      });
    }
    if (!user || !user.isActive || !user.passwordHash) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage: "Invalid email or password.",
      });
    }
    if (!verifyPassword(parsed.data.password, user.passwordHash)) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage: "Invalid email or password.",
      });
    }
    if (!isSystemRole(user.systemRole)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        status: 403,
        publicMessage: "Account role is invalid.",
      });
    }

    const session = await createSessionForUser({
      userId: user.id,
      systemRole: user.systemRole,
      userAgent: request.headers.get("user-agent"),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        systemRole: user.systemRole,
      },
      requestId,
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.cookieValue,
      sessionCookieOptions(),
    );
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/auth/login");
  }
}
