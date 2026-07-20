"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type Props = { eventId: string };

export function MobilizeAttendanceEventPanel({ eventId }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/attendance/${eventId}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const aggregates = data?.aggregates as
    | { totals?: Record<string, number> }
    | undefined;
  const totals = aggregates?.totals;

  return (
    <div className="stack">
      <section className="panel">
        <h2>Mobilize RSVP / attendance (read-only)</h2>
        <p className="muted">
          Counts are separated — signup is not attendance; attendance is not
          local check-in.
        </p>
        {totals ? (
          <ul>
            <li>Signups (registered): {totals.signupsRegistered ?? 0}</li>
            <li>Signups (confirmed): {totals.signupsConfirmed ?? 0}</li>
            <li>Cancellations: {totals.cancellations ?? 0}</li>
            <li>Attended (remote flag): {totals.attended ?? 0}</li>
            <li>Not attended (remote flag): {totals.notAttended ?? 0}</li>
            <li>Attended unset: {totals.attendedUnset ?? 0}</li>
            <li>Unknown status: {totals.unknownStatus ?? 0}</li>
          </ul>
        ) : (
          <p>{pending ? "Loading…" : "No aggregate data."}</p>
        )}
        {error ? <p className="error">{error}</p> : null}
        <div className="button-row">
          <button type="button" className="button secondary" onClick={load}>
            Refresh aggregates
          </button>
          <Link
            className="button secondary"
            href="/system/integrations/mobilize/attendance"
          >
            Attendance workspace
          </Link>
          <Link
            className="button secondary"
            href={`/system/integrations/mobilize/publishing/${eventId}`}
          >
            Publishing
          </Link>
        </div>
      </section>
    </div>
  );
}
