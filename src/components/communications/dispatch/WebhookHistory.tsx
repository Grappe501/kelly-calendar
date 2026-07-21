"use client";

import type { WebhookHistoryView } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = { initial: WebhookHistoryView };

export function WebhookHistory({ initial }: Props) {
  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Webhook receipts</h1>
        <p className="muted">
          Raw webhook payloads are not retained. Unsigned webhooks are rejected.
        </p>
        <DispatchAdminNav />
      </header>

      <CommunicationsNotices notices={initial.notices} />

      <section className="panel" aria-labelledby="webhook-history-h">
        <h2 id="webhook-history-h">Recent receipts</h2>
        {initial.items.length === 0 ? (
          <p className="muted">No webhook receipts recorded yet.</p>
        ) : (
          <ul className="briefing-list">
            {initial.items.map((item) => (
              <li key={item.id}>
                <h3>{item.providerKey}</h3>
                <dl className="briefing-dl">
                  <dt>Processing</dt>
                  <dd>{item.processingStatus}</dd>
                  <dt>Signature valid</dt>
                  <dd>{item.signatureValid ? "Yes" : "No"}</dd>
                  <dt>Normalized events</dt>
                  <dd>{item.normalizedEventCount ?? 0}</dd>
                  <dt>Matched attempt</dt>
                  <dd>{item.hasMatch ? "Yes" : "No"}</dd>
                  <dt>Received</dt>
                  <dd>{new Date(item.receivedAt).toLocaleString()}</dd>
                  {item.errorCategory ? (
                    <>
                      <dt>Error category</dt>
                      <dd>{item.errorCategory}</dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Delivery events from webhooks are not engagement. Acceptance is not
          delivery.
        </p>
      </section>
    </article>
  );
}
