import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listSubscriptionFeeds } from "@/server/services/calendar-ics-export-service";

export const metadata: Metadata = {
  title: "Calendar subscriptions",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CalendarSubscriptionsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const { feeds } = await listSubscriptionFeeds({ actor });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar subscriptions</h1>
        <p className="muted">
          Private ICS feeds for Apple, Google, and Outlook. Tokens are shown only
          once at creation — treat them like passwords.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/subscriptions/new">
            New subscription
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/exports">
            One-time export
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/health">
            Health
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/print/preview">
            Print
          </Link>
        </p>
      </header>

      {feeds.length === 0 ? (
        <section className="panel">
          <p className="muted">No subscription feeds yet.</p>
        </section>
      ) : (
        <ul className="agenda-list">
          {feeds.map((feed) => (
            <li key={feed.id}>
              <Link href={`/system/calendar/subscriptions/${feed.id}`}>
                {feed.name}
              </Link>
              <p className="muted">
                {feed.status} · {feed.privacyProfile} · {feed.scopeType} · token{" "}
                {feed.tokenPrefix}…
                {feed.lastAccessedAt
                  ? ` · last access ${feed.lastAccessedAt.slice(0, 10)}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
