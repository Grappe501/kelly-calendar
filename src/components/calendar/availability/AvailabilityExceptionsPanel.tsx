"use client";

import Link from "next/link";
import { useState } from "react";

export type AvailabilityExceptionListItem = {
  id: string;
  ruleId: string | null;
  startDate: string;
  endDateExclusive: string;
  startLocalTime: string | null;
  endLocalTime: string | null;
  isAllDay: boolean;
  classification: string;
  label: string;
  approvalState: string;
  isActive: boolean;
};

const CLASSIFICATIONS = [
  "AVAILABLE",
  "PREFERRED",
  "CONSTRAINED",
  "UNAVAILABLE",
  "UNKNOWN",
  "REQUIRES_REVIEW",
] as const;

export function AvailabilityExceptionsPanel({
  initialExceptions,
}: {
  initialExceptions: AvailabilityExceptionListItem[];
}) {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDateExclusive, setEndDateExclusive] = useState("");
  const [classification, setClassification] =
    useState<(typeof CLASSIFICATIONS)[number]>("UNAVAILABLE");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startLocalTime, setStartLocalTime] = useState("08:00");
  const [endLocalTime, setEndLocalTime] = useState("17:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/calendar/availability/exceptions?includeInactive=1");
    const json = await res.json();
    if (json.exceptions) setExceptions(json.exceptions);
  }

  async function createExceptionRow() {
    if (!label.trim() || !startDate || !endDateExclusive) {
      setMessage("Label, start date, and end date (exclusive) are required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/availability/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          startDate,
          endDateExclusive,
          classification,
          isAllDay,
          startLocalTime: isAllDay ? null : startLocalTime,
          endLocalTime: isAllDay ? null : endLocalTime,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create exception.");
      setMessage("Exception created and active.");
      setLabel("");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRow(id: string) {
    const reason = window.prompt("Cancel reason (optional)") ?? undefined;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/calendar/availability/exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "cancel", reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Cancel failed.");
      setMessage("Exception cancelled.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Availability exceptions</h1>
        <p className="muted">
          One-off overrides (vacation, a single blackout day, a one-time opening).
          <br />
          <Link href="/system/calendar/availability">Back to rules</Link>
        </p>
      </header>

      {message ? <p className="panel">{message}</p> : null}

      <section className="panel">
        <h2>New exception</h2>
        <label>
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End date (exclusive)
          <input
            type="date"
            value={endDateExclusive}
            onChange={(e) => setEndDateExclusive(e.target.value)}
          />
        </label>
        <label>
          Classification
          <select
            value={classification}
            onChange={(e) =>
              setClassification(e.target.value as (typeof CLASSIFICATIONS)[number])
            }
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />{" "}
          All-day
        </label>
        {!isAllDay ? (
          <>
            <label>
              Start local time
              <input
                type="time"
                value={startLocalTime}
                onChange={(e) => setStartLocalTime(e.target.value)}
              />
            </label>
            <label>
              End local time
              <input
                type="time"
                value={endLocalTime}
                onChange={(e) => setEndLocalTime(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <div className="form-actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void createExceptionRow()}
          >
            Create exception
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Exceptions ({exceptions.length})</h2>
        {exceptions.length === 0 ? (
          <p className="muted">No exceptions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Dates</th>
                <th>Classification</th>
                <th>State</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((ex) => (
                <tr key={ex.id}>
                  <td>{ex.label}</td>
                  <td>
                    {ex.startDate} – {ex.endDateExclusive} (exclusive)
                    {!ex.isAllDay && ex.startLocalTime && ex.endLocalTime
                      ? ` · ${ex.startLocalTime}–${ex.endLocalTime}`
                      : ""}
                  </td>
                  <td>{ex.classification}</td>
                  <td>
                    {ex.approvalState}
                    {!ex.isActive ? " · inactive" : ""}
                  </td>
                  <td>
                    {ex.isActive ? (
                      <button
                        type="button"
                        className="chip chip-link"
                        disabled={busy}
                        onClick={() => void cancelRow(ex.id)}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
