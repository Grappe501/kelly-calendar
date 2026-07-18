import type { Metadata } from "next";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";

export const metadata: Metadata = {
  title: "Calendar",
};

const FUTURE_VIEWS = ["Day", "Week", "Month", "Campaign year"] as const;

export default function CalendarPage() {
  const availability = getStandingAvailabilityPolicy();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar</h1>
        <p>Module shell — full views arrive in Steps 9–10.</p>
      </header>

      <section className="panel" aria-labelledby="standing-heading">
        <h2 id="standing-heading">Standing rules (all views)</h2>
        <p className="muted">
          Noted from the beginning for Day, Week, Month, and Campaign Year. Not yet written as
          database events.
        </p>
        <ul>
          {availability.rules.map((rule) => (
            <li key={rule.id}>
              <strong>{rule.summary}</strong>
              {rule.overrideAllowed ? " — Command Calendar can override (e.g. vacation)." : null}
            </li>
          ))}
        </ul>
      </section>

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
    </div>
  );
}
