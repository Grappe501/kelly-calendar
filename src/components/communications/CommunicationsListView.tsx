"use client";

import Link from "next/link";
import {
  labelCommChannel,
  labelCommPurpose,
  labelCommStatus,
} from "@/lib/missions/v21/communications/labels";
import type { CommunicationListView } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";

type Props = { initial: CommunicationListView };

export function CommunicationsListView({ initial }: Props) {
  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D20</p>
        <h1>Communications queue</h1>
        <p className="muted">
          Prepare audience, content, and queue handoffs — external dispatch is
          disabled.
        </p>
        <nav className="briefing-nav" aria-label="Communications navigation">
          <Link href="/system/communications/new">New draft</Link>
          <Link href="/system/communications/suppressions">Suppressions</Link>
          <Link href="/system/communications/policy">Policy</Link>
          <Link href="/system/communications/providers">Providers</Link>
          <Link href="/system/communications/dispatch">Dispatch</Link>
          <Link href="/system/missions/command-center">Command Center</Link>
          <Link href="/system/status">System status</Link>
        </nav>
      </header>

      <CommunicationsNotices notices={initial.notices} />

      <section className="panel" aria-labelledby="comm-list-h">
        <h2 id="comm-list-h">Communications</h2>
        {initial.items.length === 0 ? (
          <p className="muted">No communications yet. Create a draft to begin.</p>
        ) : (
          <ul className="briefing-list">
            {initial.items.map((item) => (
              <li key={item.id}>
                <h3>
                  <Link href={`/system/communications/${item.id}`}>
                    {item.title}
                  </Link>
                </h3>
                <p className="muted">
                  {labelCommStatus(item.status)}
                  {item.isStale ? " · Stale" : ""}
                  {" · "}
                  {labelCommChannel(item.channel)}
                  {" · "}
                  {labelCommPurpose(item.purpose)}
                </p>
                <dl className="briefing-dl">
                  <dt>Audience approved</dt>
                  <dd>{item.audienceApproved ? "Yes" : "No"}</dd>
                  <dt>Content approved</dt>
                  <dd>{item.contentApproved ? "Yes" : "No"}</dd>
                  <dt>Queue items</dt>
                  <dd>{item.queueCount}</dd>
                  <dt>Updated</dt>
                  <dd>{new Date(item.updatedAt).toLocaleString()}</dd>
                </dl>
                <div className="button-row">
                  <Link
                    className="button secondary"
                    href={`/system/communications/${item.id}/audience`}
                  >
                    Audience
                  </Link>
                  <Link
                    className="button secondary"
                    href={`/system/communications/${item.id}/content`}
                  >
                    Content
                  </Link>
                  <Link
                    className="button secondary"
                    href={`/system/communications/${item.id}/queue`}
                  >
                    Queue
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="button-row">
          <Link className="button" href="/system/communications/new">
            Create draft
          </Link>
        </div>
      </section>
    </article>
  );
}
