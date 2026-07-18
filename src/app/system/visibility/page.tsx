import type { Metadata } from "next";
import Link from "next/link";
import { CalendarVisibilityLegend } from "@/components/calendar/calendar-visibility-legend";
import { SafeEventBlock } from "@/components/calendar/safe-event-block";
import { getDemoVisibilityCases } from "@/lib/calendar-security/demo-fixtures";

export const metadata: Metadata = {
  title: "Calendar visibility",
};

export const dynamic = "force-dynamic";

export default function VisibilityDoctrinePage() {
  const demos = getDemoVisibilityCases();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar visibility</h1>
        <p>
          Protected events stay visible as occupied time. Authenticated campaign users who
          lack full access still see the primary calendar name, a safe title, general
          location when safe, and start/end times.
        </p>
      </header>

      <section className="dev-banner" role="alert">
        These are demonstration visibility examples. Real candidate schedule data remains
        prohibited until authentication, role-based access control, and the protected
        calendar database layer are complete.
      </section>

      <section className="panel">
        <h2>What limited viewers see</h2>
        <ul className="plain-list">
          <li>Primary calendar name (operational context)</li>
          <li>Safe event title (not internal notes or named participants)</li>
          <li>General location when available and permitted (usually city)</li>
          <li>Start and end time — the block never disappears</li>
        </ul>
        <h2>What stays protected</h2>
        <p className="muted">
          Private notes, donor names and amounts, host phones, attendee lists, travel
          confirmations, hotel/room details, strategy notes, attachments, and audit history
          are omitted server-side. They are not delivered to unauthorized clients.
        </p>
      </section>

      <CalendarVisibilityLegend />

      {demos.map((demo) => (
        <section key={demo.id} className="panel" aria-labelledby={`demo-${demo.id}`}>
          <h2 id={`demo-${demo.id}`}>{demo.label}</h2>
          <div className="visibility-demo-grid">
            <div>
              <h3>Limited campaign viewer</h3>
              {demo.limited ? (
                <SafeEventBlock event={demo.limited} />
              ) : (
                <p className="muted">Not visible</p>
              )}
            </div>
            <div>
              <h3>Authorized full viewer</h3>
              {demo.full ? (
                <SafeEventBlock event={demo.full} showAccessNotice={false} />
              ) : (
                <p className="muted">Not visible</p>
              )}
            </div>
          </div>
        </section>
      ))}

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
          <Link className="button secondary" href="/more">
            Back to More
          </Link>
        </div>
      </section>
    </div>
  );
}
