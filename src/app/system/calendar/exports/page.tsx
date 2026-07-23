"use client";

import Link from "next/link";
import { useState } from "react";

type Privacy = "BUSY_ONLY" | "CITY_ONLY" | "OPERATIONAL_REDACTED";

type PreviewEvent = {
  eventId: string;
  eventNumber: string;
  summary: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isAllDay: boolean;
};

export default function CalendarExportsPage() {
  const [privacyProfile, setPrivacyProfile] = useState<Privacy>("CITY_ONLY");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    events: PreviewEvent[];
    eventCount: number;
    truncated: boolean;
  } | null>(null);

  function queryBody() {
    return {
      privacyProfile,
      query: {
        dateFrom,
        dateTo,
      },
    };
  }

  async function runPreview() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/exports/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(queryBody()),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json?.error?.message ?? "Preview failed.");
        return;
      }
      setPreview({
        events: json.events,
        eventCount: json.eventCount,
        truncated: json.truncated,
      });
    } catch {
      setError("Preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/exports/download", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(queryBody()),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "kelly-calendar-export.ics";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>One-time ICS export</h1>
        <p className="muted">
          Downloads a privacy-filtered calendar file. Prefer a subscription feed
          when you need ongoing updates you can revoke.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/subscriptions">
            Subscriptions
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/subscriptions/new">
            New subscription
          </Link>
        </p>
      </header>

      <section className="panel">
        <label>
          Privacy profile
          <select
            value={privacyProfile}
            onChange={(e) => setPrivacyProfile(e.target.value as Privacy)}
          >
            <option value="BUSY_ONLY">Busy only</option>
            <option value="CITY_ONLY">City only</option>
            <option value="OPERATIONAL_REDACTED">Operational (redacted)</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
          />
        </label>
        <p>
          <button
            type="button"
            className="chip"
            disabled={busy || !dateFrom || !dateTo}
            onClick={() => void runPreview()}
          >
            Preview
          </button>{" "}
          <button
            type="button"
            className="button"
            disabled={busy || !dateFrom || !dateTo}
            onClick={() => void download()}
          >
            {busy ? "Working…" : "Download .ics"}
          </button>
        </p>
        {error ? <p className="muted">{error}</p> : null}
      </section>

      {preview ? (
        <section className="panel">
          <h2>
            Preview · {preview.eventCount} event
            {preview.eventCount === 1 ? "" : "s"}
            {preview.truncated ? " (truncated)" : ""}
          </h2>
          <p className="muted">
            Fields below are already redacted for the selected privacy profile.
            Exact street addresses are never included.
          </p>
          {preview.events.length === 0 ? (
            <p className="muted">No accessible events in this window.</p>
          ) : (
            <ul className="agenda-list">
              {preview.events.map((e) => (
                <li key={e.eventId}>
                  <strong>{e.summary}</strong>
                  <p className="muted">
                    {e.eventNumber} · {e.status} · {e.startsAt.slice(0, 16)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
