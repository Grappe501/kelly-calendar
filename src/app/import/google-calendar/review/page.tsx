import type { Metadata } from "next";
import Link from "next/link";
import { getReviewQueue } from "@/features/calendar-import/staging-store";

export const metadata: Metadata = {
  title: "Import review queue",
};

export const dynamic = "force-dynamic";

export default function ImportReviewPage() {
  const queue = getReviewQueue();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Review queue</h1>
        <p>
          Imported events are not confirmed attendance. Approve, edit, merge, or reject before any
          future canonical save.
        </p>
      </header>

      <section className="dev-banner" role="status">
        {queue.length} staged item(s) awaiting review. Database writes remain disabled.
      </section>

      <section className="panel">
        {queue.length === 0 ? (
          <p className="muted">No staged imports yet. Run an import from the Google Calendar panel.</p>
        ) : (
          <ul className="plain-list">
            {queue.slice(0, 100).map((event) => (
              <li key={event.stagedEventId}>
                <strong>{event.basic.importedTitle}</strong>
                <br />
                <span className="muted">
                  {event.timing.startsAt} → {event.timing.endsAt}
                  {" · "}
                  {event.proposedClassification.primaryCalendar}
                  {" · "}
                  {event.deduplication.status}
                  {" · "}
                  {event.review.status}
                </span>
                {event.geographicProposal.city ? (
                  <>
                    <br />
                    <span className="muted">{event.geographicProposal.city}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <Link className="button secondary" href="/import/google-calendar">
          Back to import
        </Link>
      </section>
    </div>
  );
}
