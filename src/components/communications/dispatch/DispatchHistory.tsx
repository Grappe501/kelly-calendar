"use client";

import Link from "next/link";
import { labelCommChannel } from "@/lib/missions/v21/communications";
import type { DispatchHistoryView } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = { initial: DispatchHistoryView };

export function DispatchHistory({ initial }: Props) {
  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Dispatch history</h1>
        <p className="muted">
          Bounded batch records only — acceptance is not delivery.
        </p>
        <DispatchAdminNav />
      </header>

      <CommunicationsNotices notices={initial.notices} />

      <section className="panel" aria-labelledby="dispatch-history-h">
        <h2 id="dispatch-history-h">Batches</h2>
        {initial.items.length === 0 ? (
          <p className="muted">No dispatch batches recorded yet.</p>
        ) : (
          <ul className="briefing-list">
            {initial.items.map((item) => (
              <li key={item.id}>
                <h3>
                  <Link href={`/system/communications/dispatch/${item.id}`}>
                    {item.title}
                  </Link>
                </h3>
                <p className="muted">
                  {item.status} · {labelCommChannel(item.channel)} ·{" "}
                  {item.providerKey}
                </p>
                <dl className="briefing-dl">
                  <dt>Accepted</dt>
                  <dd>{item.acceptedCount}</dd>
                  <dt>Rejected</dt>
                  <dd>{item.rejectedCount}</dd>
                  <dt>Unknown</dt>
                  <dd>{item.unknownCount}</dd>
                  <dt>Blocked</dt>
                  <dd>{item.blockedCount}</dd>
                  <dt>Created</dt>
                  <dd>{new Date(item.createdAt).toLocaleString()}</dd>
                </dl>
                <Link
                  className="button secondary"
                  href={`/system/communications/${item.communicationId}/queue`}
                >
                  View communication queue
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
