import { NextResponse, type NextRequest } from "next/server";
import { buildSecurityHeaders } from "@/lib/security/headers";
import { normalizeRequestId } from "@/lib/security/request-id";
import { isPublicPath } from "@/lib/auth/public-paths";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import { decodeSessionCookieEdge } from "@/lib/auth/session-cookie-edge";

/**
 * Step 4 edge gate: require signed session cookie for non-public routes.
 * Full session revocation checks happen in server getSessionViewer().
 */
export async function middleware(request: NextRequest) {
  const requestId = normalizeRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const { pathname } = request.nextUrl;
  const needsAuth = !isPublicPath(pathname);

  if (needsAuth) {
    const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = await decodeSessionCookieEdge(
      raw,
      process.env.APP_SESSION_SECRET,
    );

    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Sign in required.",
              path: pathname,
            },
            requestId,
          },
          {
            status: 401,
            headers: {
              "x-request-id": requestId,
              ...buildSecurityHeaders({
                isDev: process.env.NODE_ENV !== "production",
              }),
            },
          },
        );
      }
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      const redirect = NextResponse.redirect(login);
      redirect.headers.set("x-request-id", requestId);
      return redirect;
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-request-id", requestId);
  const headers = buildSecurityHeaders({
    isDev: process.env.NODE_ENV !== "production",
  });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)",
  ],
};
