"use client";

import { useState, useTransition } from "react";
import type { ConflictListItem } from "@/components/calendar/conflicts/ConflictQueuePanel";

export type LiveConflictView = {
  id: string;
  conflictType: string;
  severity: string;
  explanation: string;
  startsAt?: string;
  endsAt?: string;
};

async function jsonFetch<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string };
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message ?? "Request failed.");
  }
  return json as T;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type ReasonPromptState = { conflictId: string; kind: "override" | "resolve" | "not-applicable" } | null;

/**
 * CC-06 Event sheet conflict surface. Shows persisted conflicts (with
 * disposition controls, same audited server routes as the operator queue)
 * plus a read-only live re-assessment. Never auto-fixes anything.
 */
export function EventConflictsPanel({
  eventId,
  initialPersisted,
  initialLive,
}: {
  eventId: string;
  initialPersisted: ConflictListItem[];
  initialLive: LiveConflictView[];
}) {
  const [persisted, setPersisted] = useState(initialPersisted);
  const [live] = useState(initialLive);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reasonPrompt, setReasonPrompt] = useState<ReasonPromptState>(null);
  const [reasonText, setReasonText] = useState("");

  const openConflicts = persisted.filter((c) => !c.stale && c.status !== "RESOLVED" && c.status !== "NOT_APPLICABLE");

  function refresh() {
    startTransition(async () => {
      setError(null);
      try {
        const result = await jsonFetch<{ persisted: ConflictListItem[] }>(
          `/api/events/${eventId}/conflicts`,
        );
        setPersisted(result.persisted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refresh failed.");
      }
    });
  }

  function acknowledge(conflictId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await jsonFetch(`/api/conflicts/${conflictId}/acknowledge`, "POST", {});
        setMessage("Acknowledged — remains open until resolved or marked not applicable.");
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Acknowledge failed.");
      }
    });
  }

  function submitReasonPrompt() {
    if (!reasonPrompt) return;
    const { conflictId, kind } = reasonPrompt;
    const reason = reasonText.trim();
    if ((kind === "override" || kind === "not-applicable") && !reason) {
      setError("A reason is required.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const path =
          kind === "override"
            ? `/api/conflicts/${conflictId}/override`
            : kind === "resolve"
              ? `/api/conflicts/${conflictId}/resolve`
              : `/api/conflicts/${conflictId}/not-applicable`;
        await jsonFetch(path, "POST", reason ? { reason } : {});
        setMessage(
          kind === "override" ? "Marked ACCEPTED_RISK." : kind === "resolve" ? "Marked RESOLVED." : "Marked NOT_APPLICABLE.",
        );
        setReasonPrompt(null);
        setReasonText("");
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  if (persisted.length === 0 && live.length === 0) return null;

  return (
    <section className="panel" aria-labelledby="event-conflicts-h">
      <h3 id="event-conflicts-h">Conflicts (CC-06)</h3>
      <p className="muted">
        Advisory only — no automatic rescheduling, cancellation, or status
        change. Acknowledging a conflict does not resolve it.
      </p>

      {message ? (
        <p role="status">{message}</p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {openConflicts.length === 0 ? (
        <p className="muted">No open persisted conflicts for this event.</p>
      ) : (
        <ul>
          {openConflicts.map((c) => (
            <li key={c.id}>
              <strong>{c.conflictType}</strong> ({c.severity}, {c.status}) ·{" "}
              {fmtTime(c.startsAt)}–{fmtTime(c.endsAt)} · {c.explanation}
              {c.disposition ? ` · latest disposition: ${c.disposition}` : ""}
              <div className="form-actions">
                <button type="button" className="button" disabled={pending} onClick={() => acknowledge(c.id)}>
                  Acknowledge
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={pending}
                  onClick={() => {
                    setReasonPrompt({ conflictId: c.id, kind: "override" });
                    setReasonText("");
                  }}
                >
                  Accept risk
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={pending}
                  onClick={() => {
                    setReasonPrompt({ conflictId: c.id, kind: "resolve" });
                    setReasonText("");
                  }}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={pending}
                  onClick={() => {
                    setReasonPrompt({ conflictId: c.id, kind: "not-applicable" });
                    setReasonText("");
                  }}
                >
                  Not applicable
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {live.length > 0 ? (
        <>
          <h4>Live re-assessment (read-only, not yet persisted)</h4>
          <ul>
            {live.map((c) => (
              <li key={c.id}>
                <strong>{c.conflictType}</strong> ({c.severity}) · {fmtTime(c.startsAt)}–
                {fmtTime(c.endsAt)} · {c.explanation}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {reasonPrompt ? (
        <div className="panel form-error" role="alertdialog" aria-label="Disposition reason">
          <p className="muted">
            {reasonPrompt.kind === "resolve"
              ? "Leave blank to resolve only if recompute no longer detects this conflict; otherwise a reason is required."
              : "A reason is required and is recorded in the audit trail."}
          </p>
          <label>
            Reason
            <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3} />
          </label>
          <div className="form-actions">
            <button type="button" className="button" disabled={pending} onClick={submitReasonPrompt}>
              Submit
            </button>
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() => {
                setReasonPrompt(null);
                setReasonText("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
