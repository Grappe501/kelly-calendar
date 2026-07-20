"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

export function MobilizePersonMatchesWorkspace() {
  const [matches, setMatches] = useState<
    Array<{ id: string; externalPersonId: string; status: string; matchMethod: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [externalPersonId, setExternalPersonId] = useState("");
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/people/matches");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setMatches(json.matches ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function decide(decision: "DO_NOT_LINK" | "REJECT" | "PROPOSE") {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/people/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            externalPersonId: externalPersonId.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Person match review</h2>
        <p className="muted">
          Person-level apply is disabled. Confirm does not create local people.
          Name-only matches stay ambiguous.
        </p>
        <input
          value={externalPersonId}
          onChange={(e) => setExternalPersonId(e.target.value)}
          placeholder="External person id"
        />
        <div className="button-row">
          <button type="button" className="button" disabled={pending} onClick={() => decide("PROPOSE")}>
            Propose
          </button>
          <button type="button" className="button secondary" disabled={pending} onClick={() => decide("REJECT")}>
            Reject
          </button>
          <button type="button" className="button secondary" disabled={pending} onClick={() => decide("DO_NOT_LINK")}>
            Do not link
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <ul>
          {matches.map((m) => (
            <li key={m.id}>
              {m.externalPersonId} — {m.status} ({m.matchMethod})
            </li>
          ))}
        </ul>
        <Link className="button secondary" href="/system/integrations/mobilize/attendance">
          Attendance
        </Link>
      </section>
    </div>
  );
}
