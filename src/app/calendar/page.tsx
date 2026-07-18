import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
};

const FUTURE_VIEWS = ["Day", "Week", "Month", "Campaign year"] as const;

export default function CalendarPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar</h1>
        <p>Module shell — full views arrive in Steps 9–10.</p>
      </header>

      <section className="panel" aria-labelledby="views-heading">
        <h2 id="views-heading">Planned views</h2>
        <p className="muted">
          Scaffold-only selector. These controls do not open a working calendar grid yet.
        </p>
        <div className="view-chips" role="list" aria-label="Future calendar views">
          {FUTURE_VIEWS.map((view) => (
            <span key={view} className="chip" role="listitem">
              {view} · coming later
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>What comes next</h2>
        <ul>
          <li>Step 8 — Today command center with live next-event intelligence</li>
          <li>Step 9 — Day and hourly timeline</li>
          <li>Step 10 — Week, month, and campaign-year views</li>
        </ul>
      </section>
    </div>
  );
}
