"use client";

import { useState } from "react";
import { CommunicationsNotices } from "@/components/communications/CommunicationsNotices";
import { DispatchAdminNav } from "@/components/communications/dispatch/shared";
import { commJsonFetch } from "@/components/communications/shared";

type HealthDashboard = {
  notices: string[];
  registry: Array<{
    providerKey: string;
    displayName: string;
    status: string;
    isOfficialAdapter: boolean;
    isStub: boolean;
    health: {
      currentStatus: string;
      apiReachability: string;
      authentication: string;
      domainVerified: boolean;
      senderVerified: boolean;
      webhookVerified: boolean;
      sandboxWorking: boolean;
      productionEnabled: boolean;
      averageLatencyMs: number | null;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
      notes: string[];
    };
  }>;
  vault: { missing: string[]; malformed: string[]; warnings: string[] };
  gates: {
    blockedReason: string;
    hardBlocked: boolean;
    hardBlockReason: string;
  };
  productionDispatchEnabled: boolean;
};

export function ProviderHealthDashboard({
  initial,
}: {
  initial: HealthDashboard;
}) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="briefing-shell">
      <header className="briefing-header">
        <p className="muted">Campaign Communications · D22</p>
        <h1>Provider Health Dashboard</h1>
        <DispatchAdminNav />
      </header>
      <CommunicationsNotices notices={view.notices} />
      {message ? <p className="muted">{message}</p> : null}

      <section className="briefing-section">
        <h2>Production safety</h2>
        <p>
          Production dispatch:{" "}
          {view.productionDispatchEnabled ? "Enabled" : "Disabled"}
        </p>
        <p className="muted">{view.gates.hardBlockReason}</p>
        <p className="muted">{view.gates.blockedReason}</p>
      </section>

      <section className="briefing-section">
        <h2>Credential vault (env only)</h2>
        <ul className="briefing-fact-list">
          <li>Missing: {view.vault.missing.join(", ") || "(none)"}</li>
          <li>Malformed: {view.vault.malformed.join(", ") || "(none)"}</li>
        </ul>
        {view.vault.warnings.length > 0 ? (
          <ul className="briefing-fact-list">
            {view.vault.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="briefing-section">
        <div className="briefing-actions">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              try {
                const next = await commJsonFetch(
                  "/api/communications/providers/health",
                  "GET",
                );
                setView(next as HealthDashboard);
                setMessage("Health refreshed.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Refresh failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Refresh health
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              try {
                const result = await commJsonFetch(
                  "/api/communications/providers/sandbox/certify",
                  "POST",
                  { providerKey: "kccc-sandbox" },
                );
                setMessage(
                  `Certification ${(result as { status: string }).status} (${(result as { passedCount: number }).passedCount} passed)`,
                );
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Certification failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Run kccc-sandbox certification
          </button>
        </div>
      </section>

      <section className="briefing-section">
        <h2>Providers</h2>
        <div className="briefing-table-wrap">
          <table className="briefing-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Status</th>
                <th>Auth</th>
                <th>Domain</th>
                <th>Sender</th>
                <th>Webhook</th>
                <th>Sandbox</th>
                <th>Prod</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {view.registry.map((row) => (
                <tr key={row.providerKey}>
                  <td>
                    {row.displayName}
                    {row.isOfficialAdapter ? " ★" : ""}
                    {row.isStub ? " (stub)" : ""}
                  </td>
                  <td>{row.health.currentStatus}</td>
                  <td>{row.health.authentication}</td>
                  <td>{row.health.domainVerified ? "Yes" : "No"}</td>
                  <td>{row.health.senderVerified ? "Yes" : "No"}</td>
                  <td>{row.health.webhookVerified ? "Yes" : "No"}</td>
                  <td>{row.health.sandboxWorking ? "Yes" : "No"}</td>
                  <td>{row.health.productionEnabled ? "Yes" : "No"}</td>
                  <td>
                    {row.health.averageLatencyMs != null
                      ? `${row.health.averageLatencyMs}ms`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
