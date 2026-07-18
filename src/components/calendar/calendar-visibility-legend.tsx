const ROWS = [
  {
    level: "FULL",
    meaning: "Authorized details for the viewer’s role and section permissions.",
  },
  {
    level: "TITLE_LOCATION / LIMITED",
    meaning: "Calendar name, safe title, general location, start/end — default for campaign staff without full access.",
  },
  {
    level: "BUSY_WITH_CATEGORY",
    meaning: "Calendar category plus a generic safe title; used for higher-sensitivity fallbacks.",
  },
  {
    level: "BUSY_ONLY",
    meaning: "Occupied time only (e.g. Protected Personal Time). No location.",
  },
  {
    level: "PUBLIC",
    meaning: "Approved public representation only.",
  },
] as const;

export function CalendarVisibilityLegend() {
  return (
    <section className="panel" aria-labelledby="visibility-legend-heading">
      <h2 id="visibility-legend-heading">Visibility levels</h2>
      <dl className="visibility-legend">
        {ROWS.map((row) => (
          <div key={row.level} className="visibility-legend-row">
            <dt>{row.level}</dt>
            <dd>{row.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
