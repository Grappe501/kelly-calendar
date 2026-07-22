import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getSeriesWorkspace } from "@/server/services/recurrence-series-service";

export const metadata: Metadata = { title: "Recurrence series" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ seriesId: string }> };

export default async function CalendarSeriesPage({ params }: Props) {
  const { seriesId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  let workspace;
  try {
    workspace = await getSeriesWorkspace({ actor, seriesId });
  } catch {
    notFound();
  }

  const { series, exceptions, occurrences } = workspace;
  const missionLinked = occurrences.filter((o) => o.missionId).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Recurrence series</h1>
        <p className="muted">
          {series.ruleSummary} · {series.timezone} · {series.status}
        </p>
        <p className="muted">
          <Link href="/calendar?view=week">Week</Link>
          {" · "}
          <Link href="/system/calendar/integrity">Integrity</Link>
          {" · "}
          <Link href="/add/quick">Add event</Link>
        </p>
      </header>

      <section className="panel" aria-labelledby="series-meta">
        <h2 id="series-meta">Series</h2>
        <dl className="kv-list">
          <div>
            <dt>Rule</dt>
            <dd>
              <code>{series.rruleNormalized}</code>
            </dd>
          </div>
          <div>
            <dt>Fingerprint</dt>
            <dd>
              <code>{series.ruleFingerprint}</code>
            </dd>
          </div>
          <div>
            <dt>Start (local)</dt>
            <dd>{series.dtstartLocal}</dd>
          </div>
          <div>
            <dt>All-day</dt>
            <dd>{series.isAllDay ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Materialization version</dt>
            <dd>{series.materializationVersion}</dd>
          </div>
          <div>
            <dt>Mission-linked occurrences</dt>
            <dd>{missionLinked}</dd>
          </div>
        </dl>
        <p className="muted">
          Authority model B: each occurrence is a canonical Event. Views do not
          write series rows. Series creation does not create Missions.
        </p>
      </section>

      <section className="panel" aria-labelledby="occ-heading">
        <h2 id="occ-heading">Materialized occurrences ({occurrences.length})</h2>
        {occurrences.length === 0 ? (
          <p className="muted">No active Events in this series.</p>
        ) : (
          <ol className="agenda-list">
            {occurrences.map((o) => (
              <li key={o.eventId}>
                <div className="agenda-row">
                  <time dateTime={o.startsAt}>
                    {o.isAllDay
                      ? "All day"
                      : new Intl.DateTimeFormat("en-US", {
                          timeZone: o.timezone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(o.startsAt))}
                  </time>
                  <div>
                    <Link href={o.href}>{o.title}</Link>
                    <p className="muted">
                      {o.eventNumber} · {o.status}
                      {o.missionId ? " · Mission linked" : ""}
                      {o.originalOccurrenceAt
                        ? ` · original ${o.originalOccurrenceAt}`
                        : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel" aria-labelledby="ex-heading">
        <h2 id="ex-heading">Exceptions ({exceptions.length})</h2>
        {exceptions.length === 0 ? (
          <p className="muted">No MODIFIED / CANCELLED / EXCLUDED exceptions.</p>
        ) : (
          <ul>
            {exceptions.map((e) => (
              <li key={e.id}>
                <strong>{e.exceptionType}</strong>
                {" · "}
                <code>{e.occurrenceKey.slice(0, 12)}…</code>
                {e.eventId ? (
                  <>
                    {" · "}
                    <Link href={`/events/${e.eventId}`}>Event</Link>
                  </>
                ) : null}
                {e.reason ? <span className="muted"> — {e.reason}</span> : null}
                {e.restoredAt ? (
                  <span className="muted"> (restored {e.restoredAt})</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
