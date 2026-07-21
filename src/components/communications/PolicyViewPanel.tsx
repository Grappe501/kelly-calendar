"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  labelCommChannel,
  labelCommPurpose,
} from "@/lib/missions/v21/communications";
import {
  commJsonFetch,
  type PolicyView,
} from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";

type Props = { initial: PolicyView };

export function PolicyViewPanel({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const policy = view.policy ?? view.defaults;

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications</p>
        <h1>Communication policy</h1>
        <nav className="briefing-nav" aria-label="Communications navigation">
          <Link href="/system/communications">Communications queue</Link>
          <Link href="/system/communications/suppressions">Suppressions</Link>
          <Link href="/system/communications/providers">Providers</Link>
          <Link href="/system/communications/dispatch">Dispatch</Link>
        </nav>
      </header>

      <CommunicationsNotices notices={view.notices} />

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

      <section className="panel" aria-labelledby="policy-status-h">
        <h2 id="policy-status-h">Active policy</h2>
        {!view.policy ? (
          <p className="muted">
            No seeded policy yet. Defaults are shown below.
          </p>
        ) : null}
        {policy ? (
          <dl className="briefing-dl">
            <dt>Version</dt>
            <dd>{policy.version}</dd>
            <dt>External dispatch</dt>
            <dd>{policy.externalDispatchEnabled ? "Enabled" : "Disabled"}</dd>
            <dt>Export</dt>
            <dd>{policy.exportEnabled ? "Enabled" : "Disabled"}</dd>
            <dt>Handoff</dt>
            <dd>{policy.handoffEnabled ? "Enabled" : "Disabled"}</dd>
            <dt>Operator attestation</dt>
            <dd>
              {policy.allowOperatorAttestation ? "Allowed" : "Disabled"}
            </dd>
            <dt>Require verified contact</dt>
            <dd>{policy.requireVerifiedContact ? "Yes" : "No"}</dd>
            <dt>Shared contact mode</dt>
            <dd>{policy.sharedContactMode}</dd>
            <dt>Approval expires (hours)</dt>
            <dd>{policy.approvalExpiresHours ?? "Never"}</dd>
            <dt>Allowed channels</dt>
            <dd>
              {policy.allowedChannels.map((c) => labelCommChannel(c)).join(", ")}
            </dd>
            <dt>Allowed purposes</dt>
            <dd>
              {policy.allowedPurposes.map((p) => labelCommPurpose(p)).join(", ")}
            </dd>
          </dl>
        ) : null}
        {!view.policy ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setMessage(null);
                try {
                  await commJsonFetch("/api/communications/policy", "POST");
                  const refreshed = await commJsonFetch<PolicyView>(
                    "/api/communications/policy",
                    "GET",
                  );
                  setView(refreshed);
                  setMessage("Default policy seeded.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Seed failed.");
                }
              })
            }
          >
            Seed default policy
          </button>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="policy-provider-h">
        <h2 id="policy-provider-h">Provider capabilities</h2>
        <ul className="briefing-fact-list">
          {view.providerCapabilities.map((cap) => (
            <li key={cap.capability}>
              {cap.capability}:{" "}
              {cap.applicationEnabled
                ? "application enabled"
                : "disabled by D20 policy"}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
