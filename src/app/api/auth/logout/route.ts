import { NextResponse } from "next/server";
import { getServerEnvironment } from "@/lib/env/server-environment";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import {
  decodeSessionCookie,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session-cookie";
import { revokeSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  getServerEnvironment();
  const raw = request.headers.get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  const payload = decodeSessionCookie(raw);
  if (payload?.sid) {
    await revokeSession(payload.sid).catch(() => undefined);
  }
  const response = NextResponse.json({ ok: true, requestId });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  response.headers.set("x-request-id", requestId);
  return response;
}
