import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOutcomeReviewQueue } from "@/server/services/event-outcome-service";

export const metadata: Metadata = { title: "Event reviews" };
export const dynamic = "force-dynamic";

function Section({
  title,
  items,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  return (
    <section className="panel">
      <h2>
        {title}{" "}
        <span className="muted">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul>
          {items.map((item) => {
            const eventId = String(item.eventId);
            return (
              <li key={`${title}-${eventId}-${String(item.reviewId ?? "x")}`}>
                <Link href={`/system/events/${eventId}/outcome`}>
                  {String(item.title)} ({String(item.eventNumber)})
                </Link>{" "}
                · {String(item.eligibility)}
                {item.attendanceOutcome
                  ? ` · ${String(item.attendanceOutcome)}`
                  : ""}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default async function CalendarReviewsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const queue = await getOutcomeReviewQueue(actor);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Event outcome reviews</h1>
        <p>
          Loading this queue creates zero review records. Time passing only
          marks Events eligible — never complete or not attended.
        </p>
        <p className="muted">
          Created on load: {queue.createdOnLoad} · build {queue.buildId}
        </p>
      </header>
      <Section title="Due now" items={queue.sections.dueNow} />
      <Section title="Overdue" items={queue.sections.overdue} />
      <Section title="Draft" items={queue.sections.draft} />
      <Section title="Reviewed" items={queue.sections.reviewed} />
      <Section title="Stale" items={queue.sections.stale} />
      <Section
        title="Cancelled / postponed needing disposition"
        items={queue.sections.cancelledPostponed}
      />
      <Section title="Unknown outcome" items={queue.sections.unknownOutcome} />
      <Section title="Follow-up gaps" items={queue.sections.followUpGaps} />
      <Section
        title="Encounters awaiting contact review"
        items={queue.sections.encountersAwaitingContactReview}
      />
      <div className="button-row">
        <Link className="button secondary" href="/system/calendar/reviews/report">
          Reviews report
        </Link>
        <Link className="button secondary" href="/system/command-center">
          Command Center
        </Link>
      </div>
    </div>
  );
}
