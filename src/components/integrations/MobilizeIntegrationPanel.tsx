"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type StatusPayload = {
  config: {
    apiKeyConfigured: boolean;
    organizationIdConfigured: boolean;
    apiBaseUrl: string;
    importEventsEnabled: boolean;
    outboundWritesEnabled: boolean;
    fullyConfigured: boolean;
    documentationRevision: string;
  };
  connection: {
    id: string;
    status: string;
    organizationId: string;
    organizationName: string | null;
    lastVerifiedAt: string | null;
    lastSuccessfulConnectionAt: string | null;
    lastErrorSummary: string | null;
  } | null;
  capability: {
    connectionState: string;
    capabilities: Record<
      string,
      { documented: boolean; credentialTested: boolean; applicationEnabled: boolean }
    >;
    outboundWritesForcedDisabled: boolean;
    personLevelApplyEnabled: false;
  };
  documentation: {
    revision: string;
    inspectionDate: string;
    apiBaseUrl: string;
    rateLimits: { readPerSecond: number; writePerSecond: number; note: string };
  };
};

export function MobilizeIntegrationPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/status");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load status");
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function verify() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/integrations/mobilize/verify", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Verify failed");
        setMessage(`Verification state: ${data.state}`);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verify failed");
      }
    });
  }

  function dryRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/integrations/mobilize/dry-run", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Dry-run failed");
        setMessage(`Dry-run ${data.run?.id} completed (${data.run?.status}).`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dry-run failed");
      }
    });
  }

  const caps = status?.capability?.capabilities
    ? Object.entries(status.capability.capabilities)
    : [];

  return (
    <div className="page-stack">
      <section className="panel">
        <h2>Connection</h2>
        {!status ? (
          <p className="muted">{pending ? "Loading…" : "No status yet."}</p>
        ) : (
          <ul className="briefing-fact-list">
            <li>
              API key:{" "}
              {status.config.apiKeyConfigured ? "configured" : "NOT_CONFIGURED"}
            </li>
            <li>
              Organization ID:{" "}
              {status.config.organizationIdConfigured
                ? "configured"
                : "NOT_CONFIGURED"}
            </li>
            <li>API base: {status.config.apiBaseUrl}</li>
            <li>
              Status:{" "}
              <strong>
                {status.connection?.status ??
                  status.capability.connectionState}
              </strong>
            </li>
            <li>
              Organization:{" "}
              {status.connection?.organizationName ??
                status.connection?.organizationId ??
                "—"}
            </li>
            <li>Last verified: {status.connection?.lastVerifiedAt ?? "—"}</li>
            <li>
              Last successful:{" "}
              {status.connection?.lastSuccessfulConnectionAt ?? "—"}
            </li>
            <li>
              Outbound writes: disabled (D16)
            </li>
            <li>
              Docs revision: {status.documentation.revision} (inspected{" "}
              {status.documentation.inspectionDate})
            </li>
            <li>
              Rate limits (docs): {status.documentation.rateLimits.readPerSecond}{" "}
              read/s · {status.documentation.rateLimits.writePerSecond} write/s
            </li>
          </ul>
        )}
        {status?.connection?.lastErrorSummary ? (
          <p role="alert">{status.connection.lastErrorSummary}</p>
        ) : null}
        <div className="button-row">
          <button type="button" onClick={verify} disabled={pending}>
            Verify connection
          </button>
          <button type="button" onClick={dryRun} disabled={pending}>
            Start event dry-run
          </button>
          <button type="button" className="secondary" onClick={load} disabled={pending}>
            Refresh
          </button>
          <Link className="button secondary" href="/system/integrations/mobilize/runs">
            Sync runs
          </Link>
          <Link className="button" href="/system/integrations/mobilize/publishing">
            Publishing
          </Link>
        </div>
        {message ? <p>{message}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Capabilities</h2>
        <p className="muted">
          Documented vs credential-tested vs application-enabled. Create/update
          require explicit env flags (D17). Delete stays disabled by default.
          Person/attendance/affiliation/image writes remain forced off.
        </p>
        <ul>
          {caps.map(([name, tier]) => (
            <li key={name}>
              <code>{name}</code> — documented {String(tier.documented)} · tested{" "}
              {String(tier.credentialTested)} · enabled{" "}
              {String(tier.applicationEnabled)}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Boundaries</h2>
        <ul>
          <li>Kelly Calendar remains system of record for Missions and ops.</li>
          <li>Dry-run never creates Missions or ExternalObjectReference rows.</li>
          <li>Apply registers external identities only — no auto Mission conversion.</li>
          <li>Person/attendance apply disabled pending consent-aware local model.</li>
          <li>API keys are never shown, logged, or returned by these routes.</li>
        </ul>
        <div className="button-row">
          <Link className="button" href="/system/integrations/mobilize/publishing">
            Event publishing (D17)
          </Link>
          <Link className="button" href="/system/integrations/mobilize/attendance">
            Attendance (D18)
          </Link>
        </div>
      </section>
    </div>
  );
}
