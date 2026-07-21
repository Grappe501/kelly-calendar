"use client";

import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type InspectorView = {
  notices: string[];
  receipts: Array<{
    id: string;
    providerKey: string;
    providerEventId: string | null;
    signatureValid: boolean;
    receivedAt: string;
    providerEventAt: string | null;
    replayFingerprint: string;
    processingStatus: string;
    matchedAttemptId: string | null;
    normalizedEventCount: number;
    errorCategory: string | null;
  }>;
};

export function WebhookInspectorPanel({
  initial,
}: {
  initial: InspectorView;
}) {
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D22</p>
        <h1>Webhook Inspector</h1>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={initial.notices} />
      <section className="briefing-section">
        <h2>Incoming receipts</h2>
        <div className="briefing-table-wrap">
          <table className="briefing-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Provider</th>
                <th>Signature</th>
                <th>Status</th>
                <th>Events</th>
                <th>Replay</th>
                <th>Match</th>
              </tr>
            </thead>
            <tbody>
              {initial.receipts.map((r) => (
                <tr key={r.id}>
                  <td>{r.receivedAt}</td>
                  <td>{r.providerKey}</td>
                  <td>{r.signatureValid ? "Valid" : "Invalid"}</td>
                  <td>{r.processingStatus}</td>
                  <td>{r.normalizedEventCount}</td>
                  <td>{r.replayFingerprint}</td>
                  <td>{r.matchedAttemptId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
