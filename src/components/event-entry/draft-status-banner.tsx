export function DraftStatusBanner() {
  return (
    <div className="dev-banner" role="status">
      <strong>DRAFT — NOT YET ON LIVE CALENDAR</strong>
      <p style={{ margin: "0.35rem 0 0" }}>
        Saves go to H-drive staging only. PostgreSQL persistence is disabled until
        authentication and the protected schema are certified.
      </p>
    </div>
  );
}
