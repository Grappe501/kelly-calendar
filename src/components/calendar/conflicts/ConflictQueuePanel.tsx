"use client";

import { useMemo, useState, useTransition } from "react";

export type ConflictActionView = {
  id: string;
  action: string;
  disposition: string | null;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
};

export type ConflictListItem = {
  id: string;
  conflictKey: string;
  conflictType: string;
  severity: string;
  primaryEntity: { type: string; id: string; label: string | null };
  relatedEntity: { type: string | null; id: string; label: string | null } | null;
  startsAt: string | null;
  endsAt: string | null;
  explanation: string;
  evidence: unknown;
  status: string;
  automaticallyResolved: boolean;
  campaignKey: string;
  disposition: string | null;
  dispositionReason: string | null;
  stale: boolean;
  lastEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  actions: ConflictActionView[];
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

function fmtTime(iso: string | null): string {
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

const STATUS_OPTIONS = ["OPEN", "ACCEPTED_RISK", "RESOLVED", "NOT_APPLICABLE"];
const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "WARNING"];
const TYPE_OPTIONS = [
  "TIME_OVERLAP",
  "AVAILABILITY_VIOLATION",
  "BUFFER_CONFLICT",
  "TRAVEL_INFEASIBLE",
];

type ReasonPromptState = {
  conflictId: string;
  kind: "override" | "resolve" | "not-applicable";
} | null;

/**
 * CC-06 operator queue panel (ADR-092). Disposition actions call audited
 * server routes only — this component never mutates Events, Missions, or
 * availability rules, and never sets `automaticallyResolved`.
 */
export function ConflictQueuePanel({
  initialConflicts,
  initialTotal,
}: {
  initialConflicts: ConflictListItem[];
  initialTotal: number;
}) {
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState<string[]>(["OPEN", "ACCEPTED_RISK"]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [includeStale, setIncludeStale] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reasonPrompt, setReasonPrompt] = useState<ReasonPromptState>(null);
  const [reasonText, setReasonText] = useState("");

  const visible = useMemo(() => conflicts, [conflicts]);

  function refresh() {
    startTransition(async () => {
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter.length) params.set("status", statusFilter.join(","));
        if (severityFilter.length) params.set("severity", severityFilter.join(","));
        if (typeFilter.length) params.set("conflictType", typeFilter.join(","));
        if (includeStale) params.set("includeStale", "1");
        const result = await jsonFetch<{ conflicts: ConflictListItem[]; total: number }>(
          `/api/conflicts?${params.toString()}`,
        );
        setConflicts(result.conflicts);
        setTotal(result.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refresh failed.");
      }
    });
  }

  function recomputeToday() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await jsonFetch<{
          scannedEvents: number;
          detectedCount: number;
          created: number;
          updated: number;
          reopened: number;
          staled: number;
        }>("/api/conflicts", "POST", {});
        setMessage(
          `Recompute scanned ${result.scannedEvents} event(s): ${result.detectedCount} detected, ` +
            `${result.created} created, ${result.updated} updated, ${result.reopened} reopened, ${result.staled} marked stale.`,
        );
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Recompute failed.");
      }
    });
  }

  function acknowledge(conflictId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        await jsonFetch(`/api/conflicts/${conflictId}/acknowledge`, "POST", {});
        setMessage("Acknowledged — the blocker remains open until resolved or marked not applicable.");
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
          kind === "override"
            ? "Marked ACCEPTED_RISK — remains visible in the queue."
            : kind === "resolve"
              ? "Marked RESOLVED."
              : "Marked NOT_APPLICABLE.",
        );
        setReasonPrompt(null);
        setReasonText("");
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  function toggle(list: string[], value: string, setter: (v: string[]) => void) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Conflict engine (CC-06)</h1>
        <p className="muted">
          Advisory only — this queue never automatically moves, cancels, confirms,
          archives, restores, or deletes an Event, and never changes recurrence,
          availability rules, or Missions. Acknowledging a conflict does not
          resolve it.
        </p>
      </header>

      {message ? (
        <p className="panel" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error panel" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <h2>Filters</h2>
        <div className="form-row">
          <fieldset>
            <legend>Status</legend>
            {STATUS_OPTIONS.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={statusFilter.includes(s)}
                  onChange={() => toggle(statusFilter, s, setStatusFilter)}
                />{" "}
                {s}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Severity</legend>
            {SEVERITY_OPTIONS.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={severityFilter.includes(s)}
                  onChange={() => toggle(severityFilter, s, setSeverityFilter)}
                />{" "}
                {s}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Type</legend>
            {TYPE_OPTIONS.map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={typeFilter.includes(t)}
                  onChange={() => toggle(typeFilter, t, setTypeFilter)}
                />{" "}
                {t}
              </label>
            ))}
          </fieldset>
          <label>
            <input
              type="checkbox"
              checked={includeStale}
              onChange={(e) => setIncludeStale(e.target.checked)}
            />{" "}
            Include stale
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="button" disabled={pending} onClick={refresh}>
            Apply filters
          </button>
          <button type="button" className="button" disabled={pending} onClick={recomputeToday}>
            Recompute today
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>
          Conflicts ({visible.length} of {total})
        </h2>
        {visible.length === 0 ? (
          <p className="muted">No conflicts match the current filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Window</th>
                <th>Primary</th>
                <th>Related</th>
                <th>Explanation</th>
                <th>Last action</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className={c.stale ? "muted" : undefined}>
                  <td>{c.conflictType}</td>
                  <td>{c.severity}</td>
                  <td>
                    {c.status}
                    {c.stale ? " · stale" : ""}
                  </td>
                  <td>
                    {fmtTime(c.startsAt)}–{fmtTime(c.endsAt)}
                  </td>
                  <td>{c.primaryEntity.label ?? c.primaryEntity.id}</td>
                  <td>{c.relatedEntity ? c.relatedEntity.label ?? c.relatedEntity.id : "—"}</td>
                  <td>{c.explanation}</td>
                  <td>
                    {c.actions[0]
                      ? `${c.actions[0].action} (${fmtTime(c.actions[0].createdAt)})`
                      : "—"}
                  </td>
                  <td>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={pending}
                        onClick={() => acknowledge(c.id)}
                      >
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {reasonPrompt ? (
        <section className="panel form-error" role="alertdialog" aria-label="Disposition reason">
          <h2>
            {reasonPrompt.kind === "override"
              ? "Accept risk (ACCEPTED_RISK)"
              : reasonPrompt.kind === "resolve"
                ? "Resolve conflict"
                : "Mark not applicable"}
          </h2>
          <p className="muted">
            {reasonPrompt.kind === "resolve"
              ? "Leave blank to resolve only if recompute no longer detects this conflict; otherwise a reason is required."
              : "A reason is required and is recorded in the audit trail."}
          </p>
          <label>
            Reason
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
            />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={submitReasonPrompt}
            >
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
        </section>
      ) : null}
    </div>
  );
}
