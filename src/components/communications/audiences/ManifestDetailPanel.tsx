"use client";

import Link from "next/link";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = {
  audienceId: string;
  initial: {
    notices: string[];
    manifest: {
      id: string;
      status: string;
      channel: string;
      recipientCount: number;
      manifestHash: string;
      criteriaHash: string;
      approvedAt: string | null;
      revokedAt: string | null;
    };
    entries: Array<{
      id: string;
      localPersonId: string | null;
      destinationMasked: string;
      channel: string;
      recipientKey: string;
    }>;
    dispatchAttachment: { ok: boolean; reasons: string[] };
    productionDispatchEnabled: boolean;
  };
};

export function ManifestDetailPanel({ audienceId, initial }: Props) {
  const m = initial.manifest;
  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">D24 Recipient manifest</p>
        <h1>
          {m.status} · {m.recipientCount} recipients
        </h1>
        <DispatchAdminNav />
        <p>
          <Link href={`/system/communications/audiences/${audienceId}`}>
            ← Audience
          </Link>
        </p>
      </header>
      <CommunicationsNotices notices={initial.notices} />
      <section className="briefing-section">
        <h2>Integrity</h2>
        <ul className="briefing-fact-list">
          <li>Channel: {m.channel}</li>
          <li>Manifest hash: {m.manifestHash}</li>
          <li>Criteria hash: {m.criteriaHash}</li>
          <li>Approved: {m.approvedAt ?? "—"}</li>
          <li>Revoked: {m.revokedAt ?? "—"}</li>
          <li>
            Dispatch attachment: blocked (
            {initial.dispatchAttachment.reasons.join(", ")})
          </li>
          <li>
            Production dispatch:{" "}
            {initial.productionDispatchEnabled ? "ENABLED" : "BLOCKED"}
          </li>
        </ul>
      </section>
      <section className="briefing-section">
        <h2>Entries (masked)</h2>
        <ul className="briefing-fact-list">
          {initial.entries.map((e) => (
            <li key={e.id}>
              {e.localPersonId} · {e.channel} · {e.destinationMasked} ·{" "}
              {e.recipientKey}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
