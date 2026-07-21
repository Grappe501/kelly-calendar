/**
 * Presentational banner only — never imports env or auth-flags (client-safe).
 */
export function DevelopmentSecurityBanner({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;
  return (
    <div className="dev-banner" role="status">
      {message}
    </div>
  );
}
