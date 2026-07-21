"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { labelCommChannel } from "@/lib/missions/v21/communications/labels";
import {
  commJsonFetch,
  type DispatchBatchDetailView,
} from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = { initial: DispatchBatchDetailView };

export function DispatchBatchDetail({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unknownAttempts = detail.attempts.filter((a) => a.unknownOutcome);

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Dispatch batch</h1>
        <p className="muted">{detail.title}</p>
        <DispatchAdminNav />
      </header>

      <CommunicationsNotices notices={detail.notices} />

      {message ? (
        <p className="panel" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="batch-summary-h">
        <h2 id="batch-summary-h">Batch summary</h2>
        <dl className="briefing-dl">
          <dt>Status</dt>
          <dd>{detail.status}</dd>
          <dt>Channel</dt>
          <dd>{labelCommChannel(detail.channel)}</dd>
          <dt>Provider</dt>
          <dd>{detail.providerKey}</dd>
          <dt>Queue items</dt>
          <dd>{detail.counts.queue}</dd>
          <dt>Accepted</dt>
          <dd>{detail.counts.accepted}</dd>
          <dt>Rejected</dt>
          <dd>{detail.counts.rejected}</dd>
          <dt>Unknown</dt>
          <dd>{detail.counts.unknown}</dd>
          <dt>Blocked</dt>
          <dd>{detail.counts.blocked}</dd>
        </dl>
        <Link
          className="button secondary"
          href={`/system/communications/${detail.communicationId}/queue`}
        >
          View communication queue
        </Link>
      </section>

      <section className="panel" aria-labelledby="batch-attempts-h">
        <h2 id="batch-attempts-h">Attempts (status only)</h2>
        {detail.attempts.length === 0 ? (
          <p className="muted">No attempts recorded.</p>
        ) : (
          <ul className="briefing-list">
            {detail.attempts.map((attempt) => (
              <li key={attempt.id}>
                <strong>{attempt.status}</strong>
                {attempt.errorCategory ? (
                  <p className="muted">Category: {attempt.errorCategory}</p>
                ) : null}
                {attempt.unknownOutcome ? (
                  <p className="muted">
                    Unknown outcome · reconciliation:{" "}
                    {attempt.reconciliationState ?? "PENDING"}
                  </p>
                ) : null}
                <p className="muted">
                  Started {new Date(attempt.startedAt).toLocaleString()}
                  {attempt.completedAt
                    ? ` · Completed ${new Date(attempt.completedAt).toLocaleString()}`
                    : ""}
                  {attempt.hasProviderMessageId
                    ? " · Provider message ID recorded"
                    : ""}
                </p>
                {attempt.unknownOutcome &&
                attempt.reconciliationState === "PENDING" ? (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        setError(null);
                        setMessage(null);
                        try {
                          await commJsonFetch(
                            `/api/communications/dispatch/attempts/${attempt.id}/reconcile`,
                            "POST",
                          );
                          const refreshed =
                            await commJsonFetch<DispatchBatchDetailView>(
                              `/api/communications/dispatch/batches/${detail.id}`,
                              "GET",
                            );
                          setDetail(refreshed);
                          setMessage("Reconciliation attempted (not delivery).");
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Reconciliation failed.",
                          );
                        }
                      })
                    }
                  >
                    Reconcile unknown attempt
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {unknownAttempts.length > 0 ? (
          <p className="muted">
            Provider acceptance is not delivery. Delivery is not engagement.
          </p>
        ) : null}
      </section>

      <Link className="button secondary" href="/system/communications/dispatch">
        Back to dispatch history
      </Link>
    </article>
  );
}
