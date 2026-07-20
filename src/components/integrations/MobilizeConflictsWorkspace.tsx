"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

export function MobilizeConflictsWorkspace() {
  const [rows, setRows] = useState<
    Array<{ id: string; localObjectId: string; status: string; conflictState: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/integrations/mobilize/publishing/conflicts");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed");
        setRows(data.conflicts ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resolve(eventId: string, resolution: "KEEP_LOCAL" | "KEEP_REMOTE") {
    start(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/integrations/mobilize/publishing/${eventId}/resolve-conflict`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolution }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Resolve failed");
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Publication conflicts & unknown outcomes</h2>
        <p>
          Conflicts require explicit field-level resolution. Last-write-wins is
          never used.
        </p>
        {error ? <p className="error">{error}</p> : null}
        {pending ? <p>Loading…</p> : null}
        {rows.length === 0 ? (
          <p>No conflicts.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/system/integrations/mobilize/publishing/${row.localObjectId}`}
                >
                  {row.localObjectId}
                </Link>{" "}
                — {row.status} / {row.conflictState}{" "}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => resolve(row.localObjectId, "KEEP_LOCAL")}
                >
                  Keep local
                </button>{" "}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => resolve(row.localObjectId, "KEEP_REMOTE")}
                >
                  Keep remote
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link
          className="button secondary"
          href="/system/integrations/mobilize/publishing"
        >
          Publishing
        </Link>
      </section>
    </div>
  );
}
