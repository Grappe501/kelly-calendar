"use client";

import { labelQueueStatus } from "@/lib/missions/v21/communications";
import type { CommunicationDetail } from "@/components/communications/shared";
import { CommunicationDetailShell } from "@/components/communications/CommunicationDetailShell";

type Props = { detail: CommunicationDetail };

export function CommunicationAuditView({ detail }: Props) {
  const activeApprovals = detail.approvals.filter((a) => !a.isInvalidated);

  return (
    <CommunicationDetailShell detail={detail} active="audit">
      <section className="panel" aria-labelledby="audit-approvals-h">
        <h2 id="audit-approvals-h">Approvals</h2>
        {activeApprovals.length === 0 ? (
          <p className="muted">No active approvals.</p>
        ) : (
          <ul className="briefing-list">
            {activeApprovals.map((a) => (
              <li key={a.id}>
                <h3>{a.approvalType} approval</h3>
                <p className="muted">
                  Approved {new Date(a.approvedAt).toLocaleString()}
                </p>
                {a.contentFingerprint ? (
                  <p className="muted">
                    Content fingerprint: {a.contentFingerprint.slice(0, 12)}…
                  </p>
                ) : null}
                {a.audienceFingerprint ? (
                  <p className="muted">
                    Audience fingerprint: {a.audienceFingerprint.slice(0, 12)}…
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {detail.approvals.some((a) => a.isInvalidated) ? (
          <>
            <h3>Invalidated approvals</h3>
            <ul className="briefing-fact-list">
              {detail.approvals
                .filter((a) => a.isInvalidated)
                .map((a) => (
                  <li key={a.id}>
                    {a.approvalType} ·{" "}
                    {new Date(a.approvedAt).toLocaleString()}
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="audit-queue-h">
        <h2 id="audit-queue-h">Queue statuses</h2>
        {detail.queue.length === 0 ? (
          <p className="muted">No queue items.</p>
        ) : (
          <ul className="briefing-list">
            {detail.queue.map((q) => (
              <li key={q.id}>
                <strong>{labelQueueStatus(q.status)}</strong>
                <p className="muted">
                  Prepared {new Date(q.preparedAt).toLocaleString()}
                </p>
                {q.blockReasonCodes.length > 0 ? (
                  <p className="muted">
                    Block reasons: {q.blockReasonCodes.join(", ")}
                  </p>
                ) : null}
                {q.handedOffToLabel ? (
                  <p className="muted">Handoff label: {q.handedOffToLabel}</p>
                ) : null}
                {q.exportedAt ? (
                  <p className="muted">
                    Exported {new Date(q.exportedAt).toLocaleString()} (not
                    delivery)
                  </p>
                ) : null}
                {q.handedOffAt ? (
                  <p className="muted">
                    Handed off {new Date(q.handedOffAt).toLocaleString()} (not
                    delivery)
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel dev-banner" aria-labelledby="audit-notices-h">
        <h2 id="audit-notices-h">Notices</h2>
        {detail.notices.map((notice) => (
          <p key={notice}>{notice}</p>
        ))}
        <p>
          External dispatch is disabled. Queue records status only — no raw
          destinations are shown in this audit view.
        </p>
      </section>
    </CommunicationDetailShell>
  );
}
