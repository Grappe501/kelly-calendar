"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DayExceptionDigestView } from "@/lib/missions/v21/exception-digest";

type Props = { model: DayExceptionDigestView };

export function DayExceptionDigest({ model }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function completeReview() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/briefing/${model.campaignDate}/exceptions/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: note.trim() || null }),
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Review failed.");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Review failed.");
      }
    });
  }

  return (
    <article className="page-stack day-exception-digest">
      <header className="briefing-header">
        <h1>Campaign Day Exception Digest</h1>
        <p className="executive-question">
          Consolidate active, carried-forward, overnight, and post-review
          incidents for Closeout and next-day Launch — without ticketing.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.timezone}
          {model.isToday ? " · Today" : model.isPast ? " · Past day" : " · Future day"}
        </p>
        <p role="alert" className="briefing-risks">
          {model.emergencyNotice}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Exception digest navigation">
          <Link href={model.navigation.previousHref ?? "#"}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref ?? "#"}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={model.navigation.incidentsHref}>Day Incidents</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.launchHref}>Launch Review</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.calendarHref}>Calendar</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="digest-sum-h">
        <h2 id="digest-sum-h">Digest summary</h2>
        <ul className="briefing-fact-list">
          <li>
            Highest active severity:{" "}
            {model.counts.highestActiveSeverity ?? "None"}
          </li>
          <li>{model.counts.openHighCriticalCount} open high/critical</li>
          <li>{model.counts.openLowerSeverityCount} open lower severity</li>
          <li>
            {model.counts.monitoringStabilizedCount} monitoring/stabilized
          </li>
          <li>
            {model.counts.explicitCarryForwardCount} explicit carry-forward
          </li>
          <li>{model.counts.followUpGapCount} Follow-up gaps</li>
          <li>{model.counts.acknowledgedBlockerCount} acknowledged blockers</li>
          <li>{model.counts.acceptedRiskCount} accepted-risk</li>
          <li>{model.counts.postCloseoutUpdateCount} post-Closeout updates</li>
          <li>{model.counts.postDigestUpdateCount} post-digest updates</li>
          <li>{model.counts.overnightCount} overnight</li>
          <li>{model.counts.cancelledMissionCount} cancelled-Mission</li>
          <li>{model.counts.originatedEarlierCount} originated earlier</li>
          <li>
            {model.counts.resolvedDuringDayCount} resolved during day
          </li>
          {model.counts.confidentialOmitted ? (
            <li>Some confidential incidents omitted from counts</li>
          ) : null}
          <li>First Mission: {model.firstMissionTitle ?? "None"}</li>
          <li>Primary Mission: {model.primaryMissionTitle ?? "None"}</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="digest-review-h">
        <h2 id="digest-review-h">Exception review</h2>
        <p>
          Status: <strong>{model.review.status}</strong>
          {model.review.isStale ? " · STALE (material incident change)" : ""}
        </p>
        {model.review.reviewedAt ? (
          <p className="muted">
            Reviewed {model.review.reviewedAt}
            {model.review.note ? ` · ${model.review.note}` : ""}
          </p>
        ) : (
          <p className="muted">No exception review completed yet.</p>
        )}
        <label>
          Optional note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
          />
        </label>
        <p>
          <button
            type="button"
            onClick={completeReview}
            disabled={pending}
          >
            {pending ? "Saving…" : "Complete Exception Review"}
          </button>
        </p>
        {error ? <p role="alert">{error}</p> : null}
        <p className="muted">
          Completing this review does not complete Closeout, Morning Launch
          Review, or resolve incidents.
        </p>
      </section>

      {model.entries.length === 0 ? (
        <section className="panel empty-state">
          <h2>No exceptions in digest</h2>
          <p className="muted">
            There are no active, carried-forward, overnight, or post-review
            incident facts for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="digest-entries-h">
          <h2 id="digest-entries-h">Rollup entries</h2>
          <ul className="briefing-list">
            {model.entries.map((entry) => (
              <li key={entry.incidentId}>
                <h3>
                  {entry.incidentRef} · {entry.severity} · {entry.status}
                </h3>
                <p className="muted">
                  {entry.missionTitle} · origin {entry.originCampaignDateKey} ·{" "}
                  {entry.sourceDayAttribution}
                </p>
                {entry.summary ? <p>{entry.summary}</p> : null}
                <p className="muted">
                  Buckets: {entry.buckets.join(", ") || "none"}
                </p>
                <p className="muted">
                  Follow-up: {entry.followUpLinkState}
                  {entry.carryForwardRequired || entry.carriedForwardAt
                    ? " · Carry-forward"
                    : ""}
                  {entry.acknowledgedUnclearedBlocker
                    ? " · Acknowledged blocker (uncleared)"
                    : ""}
                  {entry.acceptedRisk ? " · Accepted risk" : ""}
                </p>
                <p>
                  <Link href={entry.href}>Open incident</Link>
                  {" · "}
                  <Link href={entry.missionHref}>Open Mission</Link>
                  {entry.followUpHref ? (
                    <>
                      {" · "}
                      <Link href={entry.followUpHref}>Follow-up</Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {model.tomorrowPreview.length > 0 ? (
        <section className="panel" aria-labelledby="digest-tomorrow-h">
          <h2 id="digest-tomorrow-h">Tomorrow preview (policy-qualified)</h2>
          <ul>
            {model.tomorrowPreview.map((e) => (
              <li key={`tm-${e.incidentId}`}>
                <Link href={e.href}>{e.incidentRef}</Link> · {e.severity}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Derived view · No Mobilize sync ·
          Local system of record
        </p>
      </footer>
    </article>
  );
}
