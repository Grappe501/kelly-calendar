"use client";

import { useState } from "react";

type QueueRow = {
  id: string;
  importRunId: string;
  rawFingerprint: string;
  reviewStatus: string;
  duplicateStatus: string;
  canonicalEventId: string | null;
  summary: string;
  when: string;
};

type Props = {
  initialRows: QueueRow[];
};

export function ImportApplyQueue({ initialRows }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

  async function act(
    row: QueueRow,
    decision: "approve" | "reject" | "merge",
  ) {
    setBusyId(row.id);
    setMessage(null);
    try {
      const body: Record<string, string> = {};
      if (decision === "merge") {
        const id = (mergeTarget[row.id] ?? "").trim();
        if (!id) {
          setMessage("Merge requires a canonical Event id.");
          return;
        }
        body.canonicalEventId = id;
      }
      const res = await fetch(
        `/api/imports/${row.importRunId}/records/${row.id}/${decision}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        outcome?: string;
        eventsCreated?: number;
        eventNumber?: string | null;
        canonicalEventId?: string | null;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        setMessage(json.error?.message ?? `Failed (${res.status})`);
        return;
      }
      setMessage(
        `${decision.toUpperCase()} → ${json.outcome ?? "ok"}` +
          (json.eventNumber ? ` · ${json.eventNumber}` : "") +
          (typeof json.eventsCreated === "number"
            ? ` · eventsCreated=${json.eventsCreated}`
            : ""),
      );
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch {
      setMessage("Network error during import apply.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="muted">
        No unreviewed database import records. Stage via Google OAuth import history, then
        approve here.
      </p>
    );
  }

  return (
    <div className="stack-sm">
      {message ? (
        <p className="dev-banner" role="status">
          {message}
        </p>
      ) : null}
      <ul className="plain-list">
        {rows.map((row) => (
          <li key={row.id} className="panel" style={{ marginBottom: "0.75rem" }}>
            <strong>{row.summary}</strong>
            <br />
            <span className="muted">
              {row.when} · {row.duplicateStatus} · fp {row.rawFingerprint.slice(0, 10)}…
            </span>
            <div className="button-row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="button"
                disabled={busyId === row.id}
                onClick={() => void act(row, "approve")}
              >
                Approve
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={busyId === row.id}
                onClick={() => void act(row, "reject")}
              >
                Reject
              </button>
              <input
                className="input"
                placeholder="Merge Event id"
                value={mergeTarget[row.id] ?? ""}
                onChange={(e) =>
                  setMergeTarget((m) => ({ ...m, [row.id]: e.target.value }))
                }
                aria-label={`Merge target for ${row.summary}`}
              />
              <button
                type="button"
                className="button secondary"
                disabled={busyId === row.id}
                onClick={() => void act(row, "merge")}
              >
                Merge
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
