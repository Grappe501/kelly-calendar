"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

export function MobilizeAttendanceWorkspace() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [externalEventId, setExternalEventId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/attendance");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function dryRun() {
    start(async () => {
      setError(null);
      setMessage(null);
      try {
        const res = await fetch("/api/integrations/mobilize/attendance/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "dry-run",
            externalEventId: externalEventId.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Dry-run failed");
        setMessage(
          `Dry-run ${json.runId}: ${json.candidateCount} candidates · observationsCreated=${json.observationsCreated}`,
        );
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  const config = data?.config as Record<string, unknown> | undefined;
  const aggregatesPreview = data?.notice;

  return (
    <div className="stack">
      <section className="panel">
        <h2>Attendance read status</h2>
        <ul>
          <li>API key configured: {String(config?.apiKeyConfigured)}</li>
          <li>
            Attendance import enabled: {String(config?.importAttendanceEnabled)}
          </li>
          <li>
            Person-level apply: {String(config?.personLevelApplyEnabled)} (disabled
            — no consent-aware Person authority)
          </li>
        </ul>
        <p className="muted">{String(aggregatesPreview ?? "")}</p>
        <p className="muted">
          Page load does not sync. Signup ≠ attendance ≠ local check-in ≠ Execute.
        </p>
      </section>

      <section className="panel">
        <h2>Event-scoped dry-run</h2>
        <input
          value={externalEventId}
          onChange={(e) => setExternalEventId(e.target.value)}
          placeholder="Mobilize event id (linked reference required)"
          aria-label="Mobilize event id"
        />
        <div className="button-row">
          <button type="button" className="button" disabled={pending} onClick={dryRun}>
            Start attendance dry-run
          </button>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize/people/matches"
          >
            Person matches
          </Link>
        </div>
        {message ? <p>{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Stored observations</h2>
        <p>
          Count:{" "}
          {Array.isArray(data?.observations) ? data.observations.length : 0}
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/system/integrations/mobilize">
            Foundation
          </Link>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize/publishing"
          >
            Publishing
          </Link>
        </div>
      </section>
    </div>
  );
}
