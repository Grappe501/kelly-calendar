import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOutcomeReviewQueue } from "@/server/services/event-outcome-service";

export const metadata: Metadata = { title: "Outcome reviews report" };
export const dynamic = "force-dynamic";

export default async function CalendarReviewsReportPage() {
  const actor = await requireActiveAuthenticatedActor();
  const queue = await getOutcomeReviewQueue(actor);
  const reviewed = queue.sections.reviewed;
  const drafts = queue.sections.draft;
  const stale = queue.sections.stale;

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Outcome reviews — read-only report</h1>
        <p>
          Broad board view. Confidential hot-wash content is redacted unless
          opened from a leadership-authorized event report.
        </p>
      </header>
      <section className="panel">
        <h2>Totals</h2>
        <ul>
          <li>Reviewed: {reviewed.length}</li>
          <li>Draft: {drafts.length}</li>
          <li>Stale: {stale.length}</li>
          <li>Follow-up gaps: {queue.sections.followUpGaps.length}</li>
        </ul>
      </section>
      <section className="panel">
        <h2>Reviewed Events</h2>
        <ul>
          {reviewed.map((item) => (
            <li key={String(item.reviewId)}>
              <Link href={`/system/events/${String(item.eventId)}/outcome`}>
                {String(item.title)}
              </Link>{" "}
              · {String(item.attendanceOutcome)} /{" "}
              {String(item.operationalOutcome)}
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/calendar/reviews">
        Back to queue
      </Link>
    </div>
  );
}
