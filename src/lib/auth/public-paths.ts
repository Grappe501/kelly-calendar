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
  /**
   * CC-10 private ICS subscription feeds — authenticated by feed token,
   * not campaign session cookie.
   */
  "/api/calendar/feeds/",
  /**
   * CC-11 calendar health scheduled ingress — authenticated by shared secret
   * header (x-kccc-calendar-health-secret), not campaign session cookie.
   */
  "/api/internal/calendar/health/",
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
