"use client";

import { useState } from "react";
import Link from "next/link";

type Workspace = {
  recommendedPlaybook: string;
  scheduleFingerprint: string;
  mission: {
    id: string;
    title: string;
    eventNumber: string;
    startsAt: string;
    endsAt: string;
  };
  plan: {
    id: string;
    playbookLevel: string;
    status: string;
    taskCount: number;
    workstreams: string[];
    earliestDueAt: string | null;
    tasks: Array<{
      id: string;
      title: string;
      department: string;
      dueAt: string | null;
      status: string;
      windowLabel: string;
    }>;
  } | null;
  guarantees: Record<string, boolean>;
};

const LEVELS = [
  { value: "NONE", label: "No activation work" },
  { value: "MINIMAL", label: "Minimal / calendar only" },
  { value: "STANDARD", label: "Standard event activation" },
  { value: "MAJOR", label: "Major event activation" },
  { value: "CUSTOM", label: "Custom playbook" },
] as const;

export function MissionActivationClient({
  missionId,
  initial,
}: {
  missionId: string;
  initial: Workspace;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const [level, setLevel] = useState(initial.recommendedPlaybook || "STANDARD");
  const [preview, setPreview] = useState<{
    tasks: Array<{ title: string; department: string; dueAt: string | null; windowLabel: string }>;
    earliestDueAt: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || data?.message || `HTTP ${res.status}`);
        return null;
      }
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    const data = await post({ action: "preview", playbookLevel: level });
    if (data?.preview) {
      setPreview({
        tasks: data.preview.tasks,
        earliestDueAt: data.preview.earliestDueAt,
      });
      setMsg(
        `Preview: ${data.preview.tasks.length} tasks · records created: ${data.createdRecords ?? 0}`,
      );
    }
  }

  async function runApply() {
    const data = await post({
      action: "apply",
      playbookLevel: level,
      confirmApply: true,
    });
    if (!data) return;
    if (data.idempotentHit) {
      setMsg("Idempotent reapply — zero duplicates.");
    } else if (data.applied) {
      setMsg(
        `Applied: ${data.created.tasks} tasks · external sends ${data.zeros.externalEmails}`,
      );
    } else {
      setMsg(data.reason || "No tasks created.");
    }
    const refresh = await fetch(`/api/missions/${missionId}/activation`);
    if (refresh.ok) {
      setWorkspace((await refresh.json()) as Workspace);
    }
  }

  return (
    <div className="page-stack activation-workspace">
      <header className="page-header campaign-ops-header">
        <p className="eyebrow">Activate Mission · People over politics</p>
        <h1>{workspace.mission.title}</h1>
        <p className="muted">
          {workspace.mission.eventNumber} · Recommended:{" "}
          <strong>{workspace.recommendedPlaybook}</strong>
        </p>
        <p className="muted">
          Schedule fingerprint {workspace.scheduleFingerprint.slice(0, 8)}… ·
          Recommendation is not automatic application.
        </p>
      </header>

      {error ? (
        <div className="panel" role="alert">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="panel" role="status">
          {msg}
        </div>
      ) : null}

      <section className="panel">
        <h2>Playbook</h2>
        <label htmlFor="playbook">Activation level</label>
        <select
          id="playbook"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{ minHeight: 48, width: "100%" }}
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="button secondary"
            style={{ minHeight: 48 }}
            disabled={busy}
            onClick={() => void runPreview()}
          >
            Preview
          </button>
          <button
            type="button"
            className="button"
            style={{ minHeight: 48 }}
            disabled={busy}
            onClick={() => void runApply()}
          >
            Apply intentionally
          </button>
        </div>
        <p className="muted">
          Apply generates internal department tasks only. It does not send email/SMS,
          publish social, buy ads, assign volunteers, or change Event/Mission schedule.
        </p>
      </section>

      {preview ? (
        <section className="panel">
          <h2>Preview ({preview.tasks.length})</h2>
          <p className="muted">
            Earliest due: {preview.earliestDueAt ?? "—"} · Creates zero records until Apply
          </p>
          <ul>
            {preview.tasks.slice(0, 40).map((t) => (
              <li key={t.title + (t.dueAt ?? "")}>
                <strong>{t.department}</strong> · {t.title}
                {t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleString()}` : ""} ·{" "}
                {t.windowLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {workspace.plan ? (
        <section className="panel">
          <h2>
            Active plan · {workspace.plan.playbookLevel} · {workspace.plan.status}
          </h2>
          <p>
            {workspace.plan.taskCount} tasks · workstreams:{" "}
            {workspace.plan.workstreams.join(", ")}
          </p>
          <ul>
            {workspace.plan.tasks.map((t) => (
              <li key={t.id}>
                {t.title} · {t.department} · {t.status} · {t.windowLabel}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="panel">
          <p className="muted">No activation plan yet. Reads create zero records.</p>
        </section>
      )}

      <div className="button-row">
        <Link className="button secondary" href={`/system/missions/${missionId}`}>
          Mission
        </Link>
        <Link className="button secondary" href="/system/operations">
          Operations hub
        </Link>
        <Link className="button secondary" href="/system/operations/communications">
          Communications board
        </Link>
        <Link className="button secondary" href="/system/operations/volunteers">
          Volunteer Manager
        </Link>
      </div>
    </div>
  );
}
