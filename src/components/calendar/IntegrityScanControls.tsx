"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function IntegrityScanControls() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runScan(scope: "FULL" | "DATE_RANGE") {
    setBusy(true);
    setMessage(null);
    try {
      const body: Record<string, string> = { scope };
      if (scope === "DATE_RANGE") {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 120);
        body.rangeStart = start.toISOString();
        body.rangeEnd = end.toISOString();
        body.scope = "DATE_RANGE";
      }
      const res = await fetch("/api/calendar/integrity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        scanId?: string;
        findingsTotal?: number;
        truncated?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Scan failed (${res.status})`);
        return;
      }
      setMessage(
        `Scan complete · ${json.findingsTotal ?? 0} finding(s)` +
          (json.truncated ? " · truncated" : ""),
      );
      if (json.scanId) router.push(`/system/calendar/integrity/scans/${json.scanId}`);
      else router.refresh();
    } catch {
      setMessage("Network error starting scan.");
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
          onClick={() => void runScan("DATE_RANGE")}
        >
          Scan last 120 days
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => void runScan("FULL")}
        >
          Scan full calendar (bounded)
        </button>
      </div>
      <p className="muted">
        Scans persist findings only. They never delete, merge, cancel, or rewrite Events or Missions.
      </p>
    </div>
  );
}
