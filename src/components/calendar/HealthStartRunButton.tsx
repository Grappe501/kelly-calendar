"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HealthStartRunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(scope: "FULL" | "LIGHTWEIGHT") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, runType: "MANUAL" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        runId?: string;
        overallState?: string;
        findingsTotal?: number;
        truncated?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Health run failed (${res.status})`);
        return;
      }
      setMessage(
        `Run complete · ${json.overallState ?? "?"} · ${json.findingsTotal ?? 0} finding(s)` +
          (json.truncated ? " · truncated" : ""),
      );
      if (json.runId) router.push(`/system/calendar/health/runs/${json.runId}`);
      else router.refresh();
    } catch {
      setMessage("Network error starting health run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack-sm">
      {message ? (
        <p className="dev-banner" role="status">
          {message}
        </p>
      ) : null}
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => void run("LIGHTWEIGHT")}
        >
          Lightweight health run
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => void run("FULL")}
        >
          Full health run (bounded)
        </button>
      </div>
      <p className="muted">
        Observe/explain only — never mutates Events, Missions, feeds, or imports.
      </p>
    </div>
  );
}
