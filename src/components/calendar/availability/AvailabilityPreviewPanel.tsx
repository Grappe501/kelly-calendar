"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AvailabilityOverlay,
  type AvailabilityOverlayInterval,
} from "@/components/calendar/AvailabilityOverlay";

export function AvailabilityPreviewPanel({
  initialFrom,
  initialTo,
  initialIntervals,
  initialTruncated,
}: {
  initialFrom: string;
  initialTo: string;
  initialIntervals: AvailabilityOverlayInterval[];
  initialTruncated: boolean;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [intervals, setIntervals] = useState(initialIntervals);
  const [truncated, setTruncated] = useState(initialTruncated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/calendar/availability/preview?from=${from}&to=${to}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Preview failed.");
      setIntervals(json.intervals ?? []);
      setTruncated(Boolean(json.truncated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Availability preview</h1>
        <p className="muted">
          Non-interactive expansion of active standing rules and exceptions.
          Nothing here can be dragged, moved, or applied to an Event.{" "}
          <Link href="/system/calendar/availability">Back to rules</Link>
        </p>
      </header>

      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To (inclusive)
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="button" disabled={busy} onClick={() => void refresh()}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Intervals ({intervals.length})</h2>
        {truncated ? (
          <p className="muted">Expansion truncated for this range — narrow the dates.</p>
        ) : null}
        <AvailabilityOverlay intervals={intervals} />
      </section>
    </div>
  );
}
