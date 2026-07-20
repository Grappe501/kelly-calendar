"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type PublicationRow = {
  id: string;
  localObjectId: string;
  status: string;
  mappingVersion: string;
  conflictState: string;
  updatedAt: string;
};

export function MobilizePublishingWorkspace() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState("");
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/publishing");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load");
        setRows(data.publications ?? []);
        setConfig(data.config ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="stack">
      <section className="panel">
        <h2>Connection & enablement</h2>
        {config ? (
          <ul>
            <li>API key configured: {String(config.apiKeyConfigured)}</li>
            <li>Organization configured: {String(config.organizationIdConfigured)}</li>
            <li>Publishing enabled: {String(config.publishingEnabled)}</li>
            <li>Updates enabled: {String(config.updatesEnabled)}</li>
            <li>Delete enabled: {String(config.deleteEnabled)}</li>
            <li>Mapping version: {String(config.mappingVersion)}</li>
            <li>
              Network writes available: {String(config.outboundWritesEnabled)}
            </li>
          </ul>
        ) : (
          <p>Loading…</p>
        )}
        <p className="muted">
          Preview and approval work in NOT_CONFIGURED mode. Remote writes require
          credentials plus MOBILIZE_PUBLISHING_ENABLED / MOBILIZE_UPDATES_ENABLED.
        </p>
      </section>

      <section className="panel">
        <h2>Open Event publication</h2>
        <div className="button-row">
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Local Event id"
            aria-label="Event id"
          />
          <Link
            className="button"
            href={
              eventId.trim()
                ? `/system/integrations/mobilize/publishing/${eventId.trim()}`
                : "#"
            }
          >
            Open
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Recent publications</h2>
        {error ? <p className="error">{error}</p> : null}
        {pending ? <p>Loading…</p> : null}
        {rows.length === 0 ? (
          <p>No publication records yet (expected until first preview).</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/system/integrations/mobilize/publishing/${row.localObjectId}`}
                >
                  {row.localObjectId}
                </Link>{" "}
                — {row.status} · {row.mappingVersion} · conflict {row.conflictState}
              </li>
            ))}
          </ul>
        )}
        <div className="button-row">
          <button type="button" className="button secondary" onClick={load}>
            Refresh
          </button>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize/conflicts"
          >
            Conflicts
          </Link>
          <Link className="button secondary" href="/system/integrations/mobilize">
            Mobilize foundation
          </Link>
        </div>
      </section>
    </div>
  );
}
