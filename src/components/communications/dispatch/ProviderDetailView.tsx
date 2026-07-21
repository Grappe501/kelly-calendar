"use client";

import Link from "next/link";
import type { ProviderDetailView } from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";

type Props = {
  providerKey: string;
  initial: ProviderDetailView;
};

function summarizeRecord(value: Record<string, unknown>): string[] {
  return Object.entries(value)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${String(v)}`);
}

export function ProviderDetailView({ providerKey, initial }: Props) {
  const configLines = summarizeRecord(initial.configuration);
  const connectionLines = summarizeRecord(initial.connection);
  const capabilityLines = summarizeRecord(initial.capabilities);
  const senderLines = summarizeRecord(initial.sender);

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Provider: {providerKey}</h1>
        <p className="muted">
          Credential-tested ≠ production-ready. Application-enabled remains a
          separate gate.
        </p>
        <DispatchAdminNav />
      </header>

      <CommunicationsNotices notices={initial.notices} />

      <section className="panel" aria-labelledby="provider-detail-h">
        <h2 id="provider-detail-h">Configuration summary</h2>
        {providerKey === "disabled" ? (
          <p className="form-error" role="alert">
            No provider selected
          </p>
        ) : null}
        <dl className="briefing-dl">
          <dt>Provider key</dt>
          <dd>{initial.providerKey}</dd>
          <dt>Test adapter</dt>
          <dd>{initial.isTestAdapter ? "Yes" : "No"}</dd>
        </dl>
        <h3>Configuration (redacted)</h3>
        <ul className="briefing-fact-list">
          {configLines.length === 0 ? (
            <li className="muted">No configuration fields to display.</li>
          ) : (
            configLines.map((line) => <li key={line}>{line}</li>)
          )}
        </ul>
        <h3>Connection status</h3>
        <ul className="briefing-fact-list">
          {connectionLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3>Capabilities</h3>
        <ul className="briefing-fact-list">
          {capabilityLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3>Sender validation</h3>
        <ul className="briefing-fact-list">
          {senderLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <Link className="button secondary" href="/system/communications/providers">
          Back to providers
        </Link>
      </section>
    </article>
  );
}
