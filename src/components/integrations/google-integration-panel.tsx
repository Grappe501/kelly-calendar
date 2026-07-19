"use client";

import { useState } from "react";

type StatusPayload = {
  oauth?: Record<string, unknown>;
  connection?: Record<string, unknown>;
  routes?: Record<string, unknown>;
};

export function GoogleIntegrationPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google/calendar/status");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Unable to load status");
        setStatus(null);
        return;
      }
      setStatus(json);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setLastAction(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Request failed");
        return;
      }
      setLastAction(JSON.stringify(json, null, 2));
      await refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const connection = status?.connection ?? {};
  const oauth = status?.oauth ?? {};
  const routes = status?.routes ?? {};

  return (
    <div className="page-stack">
      <section className="dev-banner" role="note">
        Read-only Google Calendar OAuth · Estimated Routes mileage only · No write-back · No
        Timeline import · Secrets never shown
      </section>

      <section className="panel">
        <h2>Connection</h2>
        <ul className="status-list">
          <li>
            <span>Google Calendar</span>
            <strong>{connection.connected ? "Connected" : "Not connected"}</strong>
          </li>
          <li>
            <span>Connected account</span>
            <strong>{String(connection.googleAccountEmail ?? "—")}</strong>
          </li>
          <li>
            <span>Granted scope</span>
            <strong>
              {Array.isArray(connection.grantedScopes)
                ? (connection.grantedScopes as string[]).join(" ") || "—"
                : "—"}
            </strong>
          </li>
          <li>
            <span>Calendar ID</span>
            <strong>{String(connection.googleCalendarId ?? oauth.calendarId ?? "primary")}</strong>
          </li>
          <li>
            <span>Last successful sync</span>
            <strong>{String(connection.lastSyncCompletedAt ?? "—")}</strong>
          </li>
          <li>
            <span>Last sync status</span>
            <strong>{String(connection.lastSyncStatus ?? "—")}</strong>
          </li>
          <li>
            <span>Historical range imported through</span>
            <strong>{String(connection.historicalImportedThrough ?? "—")}</strong>
          </li>
          <li>
            <span>Pending reconciliation</span>
            <strong>{String(connection.pendingReconcileCount ?? 0)}</strong>
          </li>
          <li>
            <span>OAuth configured</span>
            <strong>{oauth.oauthFullyConfigured ? "yes" : "no"}</strong>
          </li>
          <li>
            <span>Routes API</span>
            <strong>
              {routes.configured ? (routes.enabled ? "Configured" : "Key present / disabled") : "Not configured"}
            </strong>
          </li>
          <li>
            <span>Estimated mileage records</span>
            <strong>{String(routes.estimatedMileageRecords ?? 0)}</strong>
          </li>
        </ul>
        <div className="button-row">
          <button type="button" className="button" disabled={busy} onClick={() => void refresh()}>
            {status ? "Refresh status" : "Load status"}
          </button>
          <a className="button secondary" href="/api/integrations/google/calendar/connect">
            Connect Google Calendar
          </a>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Disconnect Google Calendar? Imported history is retained.")) {
                void postJson("/api/integrations/google/calendar/disconnect", { confirm: true });
              }
            }}
          >
            Disconnect
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Calendar sync</h2>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void postJson("/api/integrations/google/calendar/import-history", {})}
          >
            Run dry-run historical import
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Apply historical import into staging? Requires sync enabled.")) {
                void postJson("/api/integrations/google/calendar/import-history", {
                  apply: true,
                  confirm: true,
                });
              }
            }}
          >
            Run approved historical import
          </button>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void postJson("/api/integrations/google/calendar/sync", {})}
          >
            Run dry-run sync
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Apply incremental sync?")) {
                void postJson("/api/integrations/google/calendar/sync", {
                  apply: true,
                  confirm: true,
                });
              }
            }}
          >
            Run approved sync
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Estimated routes</h2>
        <p className="muted">
          Truth type: <code>GOOGLE_ROUTE_ESTIMATE</code> only — never actual miles driven.
        </p>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void postJson("/api/integrations/google/routes/reconstruct", {})}
          >
            Run route dry run
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Apply route reconstruction (estimated legs)?")) {
                void postJson("/api/integrations/google/routes/reconstruct", {
                  apply: true,
                  confirm: true,
                });
              }
            }}
          >
            Run approved route reconstruction
          </button>
        </div>
      </section>

      {error ? (
        <p className="dev-banner" role="alert">
          {error}
        </p>
      ) : null}
      {lastAction ? (
        <section className="panel">
          <h2>Last action result</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{lastAction}</pre>
        </section>
      ) : null}
    </div>
  );
}
