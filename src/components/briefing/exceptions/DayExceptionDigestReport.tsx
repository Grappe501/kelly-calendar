import Link from "next/link";
import type { DayExceptionDigestView } from "@/lib/missions/v21/exception-digest";

type Props = { model: DayExceptionDigestView };

/** Read-only privacy-aware report — no review mutations. */
export function DayExceptionDigestReport({ model }: Props) {
  return (
    <article className="page-stack day-exception-digest-report">
      <header className="briefing-header">
        <h1>Exception Digest Report</h1>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p role="alert">{model.emergencyNotice}</p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Report navigation">
          <Link href={`/system/briefing/${model.campaignDate}/exceptions`}>
            Digest
          </Link>
          <Link href={model.navigation.incidentsHref}>Day Incidents</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.launchHref}>Launch</Link>
        </nav>
      </header>

      <section className="panel">
        <h2>Counts</h2>
        <ul className="briefing-fact-list">
          <li>Visible incidents: {model.counts.visibleIncidentCount}</li>
          <li>High/critical: {model.counts.openHighCriticalCount}</li>
          <li>Carry-forward: {model.counts.explicitCarryForwardCount}</li>
          <li>Follow-up gaps: {model.counts.followUpGapCount}</li>
          <li>Overnight: {model.counts.overnightCount}</li>
          <li>Review: {model.review.status}</li>
          {model.counts.confidentialOmitted ? (
            <li>Confidential items omitted</li>
          ) : null}
        </ul>
      </section>

      <section className="panel">
        <h2>Entries</h2>
        {model.entries.length === 0 ? (
          <p className="muted">No exceptions.</p>
        ) : (
          <ul>
            {model.entries.map((e) => (
              <li key={e.incidentId}>
                {e.incidentRef} · {e.severity} · {e.status} · {e.missionTitle}
                {e.summary ? ` — ${e.summary}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="muted">
        <p>Read-only report · Generated {model.generatedAt}</p>
      </footer>
    </article>
  );
}
