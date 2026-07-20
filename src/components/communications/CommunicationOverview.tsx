"use client";

import Link from "next/link";
import {
  labelCommStatus,
  labelEligibilityState,
  labelInclusionState,
  labelQueueStatus,
} from "@/lib/missions/v21/communications";
import type { CommunicationDetail } from "@/components/communications/shared";
import { CommunicationDetailShell } from "@/components/communications/CommunicationDetailShell";

type Props = { detail: CommunicationDetail };

export function CommunicationOverview({ detail }: Props) {
  const { communication: comm } = detail;
  const included = detail.audience.filter(
    (m) =>
      m.inclusionState === "INCLUDED" ||
      m.inclusionState === "EXCEPTION_INCLUDED",
  ).length;

  return (
    <CommunicationDetailShell detail={detail} active="overview">
      <section className="panel" aria-labelledby="comm-overview-h">
        <h2 id="comm-overview-h">Overview</h2>
        <dl className="briefing-dl">
          <dt>Status</dt>
          <dd>
            {labelCommStatus(comm.status)}
            {comm.isStale ? " · Stale" : ""}
          </dd>
          <dt>Campaign date</dt>
          <dd>{comm.campaignDateKey ?? "Not set"}</dd>
          <dt>Audience members</dt>
          <dd>
            {detail.audience.length} total · {included} included
          </dd>
          <dt>Approvals</dt>
          <dd>
            {detail.approvals.filter((a) => !a.isInvalidated).length} active
          </dd>
          <dt>Queue items</dt>
          <dd>{detail.queue.length}</dd>
          {comm.staleReason ? (
            <>
              <dt>Stale reason</dt>
              <dd>{comm.staleReason}</dd>
            </>
          ) : null}
        </dl>
        <div className="button-row">
          <Link
            className="button"
            href={`/system/communications/${comm.id}/audience`}
          >
            Review audience
          </Link>
          <Link
            className="button secondary"
            href={`/system/communications/${comm.id}/content`}
          >
            Edit content
          </Link>
          <Link
            className="button secondary"
            href={`/system/communications/${comm.id}/queue`}
          >
            Queue board
          </Link>
        </div>
      </section>

      {detail.audience.length > 0 ? (
        <section className="panel" aria-labelledby="comm-audience-preview-h">
          <h2 id="comm-audience-preview-h">Audience preview (masked)</h2>
          <ul className="briefing-list">
            {detail.audience.slice(0, 5).map((m) => (
              <li key={m.id}>
                <strong>{m.maskedLabel}</strong>
                {" · "}
                {labelEligibilityState(m.eligibilityState)}
                {" · "}
                {labelInclusionState(m.inclusionState)}
              </li>
            ))}
          </ul>
          {detail.audience.length > 5 ? (
            <p className="muted">
              {detail.audience.length - 5} more — open Audience review.
            </p>
          ) : null}
        </section>
      ) : null}

      {detail.queue.length > 0 ? (
        <section className="panel" aria-labelledby="comm-queue-preview-h">
          <h2 id="comm-queue-preview-h">Queue preview</h2>
          <ul className="briefing-fact-list">
            {Object.entries(
              detail.queue.reduce<Record<string, number>>((acc, q) => {
                acc[q.status] = (acc[q.status] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([status, count]) => (
              <li key={status}>
                {labelQueueStatus(status)}: {count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </CommunicationDetailShell>
  );
}
