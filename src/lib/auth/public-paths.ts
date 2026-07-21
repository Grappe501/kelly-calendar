/**
 * Routes reachable without a session cookie.
 * Everything else requires authentication (S4-B).
 */
export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
  "/api/auth/status",
  "/api/health",
  "/api/health/db",
  /** Provider webhooks — authenticated by signature, not campaign session. */
  "/api/webhooks/communications/",
  "/manifest.webmanifest",
  "/icons/",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    // Root requires auth after Step 4 — Today command is protected.
    return false;
  }
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}
