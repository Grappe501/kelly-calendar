"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

export type AvailabilityRuleListItem = {
  id: string;
  label: string;
  ruleType: string;
  classification: string;
  approvalState: string;
  isActive: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  startLocalTime: string | null;
  endLocalTime: string | null;
  weekdays: number[];
  priority: number;
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

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function AvailabilityRulesPanel({
  initialRules,
}: {
  initialRules: AvailabilityRuleListItem[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Standing availability (CC-05)</h1>
        <p className="muted">
          Input, evaluation, and warnings only. Availability never auto-moves or
          cancels an Event — see{" "}
          <Link href="/system/calendar/availability/preview">preview</Link> and{" "}
          <Link href="/system/calendar/availability/exceptions">exceptions</Link>.
        </p>
        <nav className="briefing-nav" aria-label="Availability navigation">
          <Link href="/system/calendar/availability/rules/new">New rule</Link>
          <Link href="/system/calendar/availability/exceptions">Exceptions</Link>
          <Link href="/system/calendar/availability/preview">Preview</Link>
        </nav>
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
        <h2>Rules ({rules.length})</h2>
        {rules.length === 0 ? (
          <>
            <p className="muted">
              No rules yet. Seed the standing policy (office hours, lunch,
              Tuesday Little Rock, morning prep buffer) or create one manually.
            </p>
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  setMessage(null);
                  try {
                    const result = await jsonFetch<{
                      seeded: boolean;
                      createdCount: number;
                    }>("/api/calendar/availability/seed", "POST", {});
                    setMessage(
                      result.seeded
                        ? `Seeded ${result.createdCount} standing rule(s).`
                        : "Rules already exist — not re-seeded.",
                    );
                    const refreshed = await jsonFetch<{ rules: AvailabilityRuleListItem[] }>(
                      "/api/calendar/availability/rules?includeInactive=1",
                    );
                    setRules(refreshed.rules);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Seed failed.");
                  }
                })
              }
            >
              Seed standing policy rules
            </button>
          </>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Type</th>
                <th>Classification</th>
                <th>Window</th>
                <th>Weekdays</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/system/calendar/availability/rules/${r.id}`}>
                      {r.label}
                    </Link>
                  </td>
                  <td>{r.ruleType}</td>
                  <td>{r.classification}</td>
                  <td>
                    {r.startLocalTime && r.endLocalTime
                      ? `${r.startLocalTime}–${r.endLocalTime}`
                      : "All-day"}
                  </td>
                  <td>
                    {r.weekdays.length === 0
                      ? "Every day"
                      : r.weekdays.map((w) => WEEKDAY_LABELS[w - 1] ?? w).join(", ")}
                  </td>
                  <td>
                    {r.approvalState}
                    {!r.isActive ? " · inactive" : ""}
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
