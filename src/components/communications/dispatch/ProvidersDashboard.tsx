"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  commJsonFetch,
  type ProvidersDashboardView,
} from "@/components/communications/shared";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import {
  DispatchAdminNav,
  KillSwitchSummary,
} from "@/components/communications/dispatch/shared";

type Props = { initial: ProvidersDashboardView };

export function ProvidersDashboard({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <article className="page-stack">
      <header className="page-header">
        <p className="muted">Campaign Communications · D21</p>
        <h1>Provider dispatch foundation</h1>
        <p className="muted">
          Inspect provider configuration and verify connections — external
          dispatch remains disabled in production ship.
        </p>
        <DispatchAdminNav />
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

      <section className="panel" aria-labelledby="providers-selected-h">
        <h2 id="providers-selected-h">Active provider</h2>
        {view.noProviderSelected || !view.selectedProvider ? (
          <p className="form-error" role="alert">
            No provider selected
          </p>
        ) : (
          <p>
            Selected provider key: <strong>{view.selectedProvider}</strong>
          </p>
        )}
        <dl className="briefing-dl">
          <dt>Active adapter</dt>
          <dd>{view.active.providerKey}</dd>
          <dt>Test adapter</dt>
          <dd>{view.active.isTestAdapter ? "Yes" : "No"}</dd>
          <dt>Production dispatch</dt>
          <dd>{view.productionDispatchEnabled ? "Enabled" : "Disabled"}</dd>
        </dl>
        {!view.productionDispatchEnabled ? (
          <p className="muted">
            Production dispatch is disabled: no provider selected, policy
            externalDispatchEnabled=false, and kill switches default ON.
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="providers-controls-h">
        <h2 id="providers-controls-h">Kill switches</h2>
        <KillSwitchSummary
          globalKillSwitch={view.controls.globalKillSwitch}
          emailKillSwitch={view.controls.emailKillSwitch}
          smsKillSwitch={view.controls.smsKillSwitch}
        />
        <Link className="button secondary" href="/system/communications/controls">
          Manage kill switches
        </Link>
      </section>

      <section className="panel" aria-labelledby="providers-registered-h">
        <h2 id="providers-registered-h">Registered providers</h2>
        <ul className="briefing-list">
          {view.registered.map((row) => (
            <li key={row.providerKey}>
              <h3>
                <Link
                  href={`/system/communications/providers/${encodeURIComponent(row.providerKey)}`}
                >
                  {row.providerKey}
                </Link>
              </h3>
              <p className="muted">
                {row.isTestAdapter ? "Test adapter" : "Production registry"}
                {" · "}
                {row.selectable ? "Selectable" : "Not selectable"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="providers-connections-h">
        <h2 id="providers-connections-h">Stored connections</h2>
        {view.connections.length === 0 ? (
          <p className="muted">No verified connections recorded yet.</p>
        ) : (
          <ul className="briefing-list">
            {view.connections.map((c) => (
              <li key={c.providerKey}>
                <h3>{c.providerKey}</h3>
                <dl className="briefing-dl">
                  <dt>Mode</dt>
                  <dd>{c.mode}</dd>
                  <dt>Configuration</dt>
                  <dd>{c.configurationState}</dd>
                  <dt>Application dispatch</dt>
                  <dd>
                    {c.applicationDispatchEnabled ? "Enabled" : "Disabled"}
                  </dd>
                  <dt>Last verified</dt>
                  <dd>
                    {c.lastVerifiedAt
                      ? new Date(c.lastVerifiedAt).toLocaleString()
                      : "Never"}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="button"
          disabled={pending || view.noProviderSelected}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              try {
                await commJsonFetch("/api/communications/providers", "POST");
                const refreshed = await commJsonFetch<ProvidersDashboardView>(
                  "/api/communications/providers",
                  "GET",
                );
                setView(refreshed);
                setMessage("Provider connection verified (not delivery).");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Verification failed.",
                );
              }
            })
          }
        >
          Verify active provider connection
        </button>
      </section>
    </article>
  );
}
