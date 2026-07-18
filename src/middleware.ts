import { NextResponse, type NextRequest } from "next/server";
import { buildSecurityHeaders } from "@/lib/security/headers";
import { normalizeRequestId } from "@/lib/security/request-id";

export function middleware(request: NextRequest) {
  const requestId = normalizeRequestId(request.headers.get("x-request-id"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

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
    /*
     * Apply to app routes; exclude static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest).*)",
  ],
};
