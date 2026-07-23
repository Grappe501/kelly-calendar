"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type StatusPayload = {
  connectionState: string;
  readOnly: boolean;
  apiVersusExportMode: string;
  config: {
    apiKeyConfigured: boolean;
    organizationIdConfigured: boolean;
    readEnabled: boolean;
    documentationStatus: string;
    fullyConfigured: boolean;
  };
  documentation: {
    status: string;
    revision: string;
    inspectionDate: string;
  };
  capabilities: {
    applicationEnabled: string[];
    credentialTested: string[];
  };
  recentRuns: Array<{ id: string; status: string; startedAt: string }>;
};

export function RedDirtIntegrationPanel() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/reddirt/status");
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
        const res = await fetch("/api/integrations/reddirt/verify", {
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
        const res = await fetch("/api/integrations/reddirt/dry-run", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Dry-run failed");
        setMessage(
          `Dry-run ${data.runId}: examined ${data.examined}, candidates ${data.candidates}, facts created ${data.strategicFactsCreated}`,
        );
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dry-run failed");
      }
    });
  }

  return (
    <section className="panel" aria-busy={pending}>
      <h2>Connection</h2>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {status ? (
        <ul className="plain-list">
          <li>State: {status.connectionState}</li>
          <li>Mode: {status.apiVersusExportMode}</li>
          <li>Read-only: {status.readOnly ? "yes" : "no"}</li>
          <li>
            API key configured: {status.config.apiKeyConfigured ? "yes" : "no"}
          </li>
          <li>
            Organization configured:{" "}
            {status.config.organizationIdConfigured ? "yes" : "no"}
          </li>
          <li>
            Read enabled: {status.config.readEnabled ? "yes" : "no (default)"}
          </li>
          <li>Documentation: {status.documentation.status}</li>
          <li>Docs revision: {status.documentation.revision}</li>
          <li>
            Application capabilities:{" "}
            {status.capabilities.applicationEnabled.join(", ")}
          </li>
        </ul>
      ) : (
        <p>Loading…</p>
      )}
      <div className="button-row">
        <button type="button" className="button" onClick={verify} disabled={pending}>
          Verify connection
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={dryRun}
          disabled={pending}
        >
          Run fixture dry-run
        </button>
        <Link className="button secondary" href="/system/integrations/reddirt/runs">
          Sync runs
        </Link>
        <Link
          className="button secondary"
          href="/system/integrations/reddirt/policy"
        >
          Privacy policy
        </Link>
      </div>
    </section>
  );
}
