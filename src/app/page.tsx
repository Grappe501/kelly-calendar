import Link from "next/link";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { formatCampaignDate, getElectionCountdown } from "@/lib/dates/election";
import { getPublicAppConfig } from "@/lib/env/public-config";

export default function TodayPage() {
  const config = getPublicAppConfig();
  const countdown = getElectionCountdown();
  const todayLabel = formatCampaignDate();
  const availability = getStandingAvailabilityPolicy();

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">{config.appName}</p>
        <h1>Kelly’s Day</h1>
        <p>
          {todayLabel}
          <br />
          {countdown.label}
        </p>
      </header>

      <section className="panel" aria-labelledby="next-heading">
        <h2 id="next-heading">Next</h2>
        <div className="empty-state">
          <strong>No confirmed event is currently loaded.</strong>
          <p className="muted">
            Schedule intelligence appears here after the calendar database is connected
            (Step 5) and events can be created (Step 7).
          </p>
        </div>
      </section>

      <section className="panel" aria-labelledby="availability-heading">
        <h2 id="availability-heading">Standing availability</h2>
        <ul>
          {availability.rules.slice(0, 2).map((rule) => (
            <li key={rule.id}>{rule.summary}</li>
          ))}
        </ul>
        <p className="muted">
          Vacation and explicit releases can override work blocks through the Command Calendar.
        </p>
      </section>

      <section className="panel" aria-labelledby="today-heading">
        <h2 id="today-heading">Today</h2>
        <p className="muted">
          Your schedule will appear here after the calendar database is connected.
        </p>
      </section>

      <section className="panel" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Quick actions</h2>
        <div className="button-row">
          <Link className="button" href="/add">
            Add event
          </Link>
          <Link className="button secondary" href="/search">
            Search calendar
          </Link>
          <Link className="button secondary" href="/calendar">
            View calendar
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
