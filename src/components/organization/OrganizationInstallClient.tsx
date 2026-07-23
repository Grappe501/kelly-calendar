"use client";

import { useState } from "react";
import Link from "next/link";

type Status = {
  installed: boolean;
  templateVersion: string;
  counts: Record<string, number>;
  topOperatingDepartments: string[];
};

export function OrganizationInstallClient({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", confirmInstall: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || data?.message || `HTTP ${res.status}`);
        return;
      }
      if (data.idempotentHit) {
        setMsg("Template already installed — zero duplicates.");
      } else {
        setMsg(
          `Installed: ${data.created?.countyCaptains ?? 0} county captains · ${data.created?.clusters ?? 0} clusters · assignments ${data.created?.assignments ?? 0}`,
        );
      }
      const refresh = await fetch("/api/organization?view=status");
      if (refresh.ok) setStatus(await refresh.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Organization template v{status.templateVersion}</h2>
      <p>
        Status:{" "}
        <strong>{status.installed ? "Installed" : "Not installed"}</strong>
      </p>
      <p className="muted">
        Top operating departments: {status.topOperatingDepartments.join(", ")}
      </p>
      <ul className="muted">
        <li>Departments: {status.counts.departments ?? 0}</li>
        <li>Positions: {status.counts.positions ?? 0}</li>
        <li>Clusters: {status.counts.clusters ?? 0}</li>
        <li>County captains: {status.counts.captains ?? 0}</li>
        <li>Assignments: {status.counts.assignments ?? 0}</li>
      </ul>
      {error ? <p role="alert">{error}</p> : null}
      {msg ? <p role="status">{msg}</p> : null}
      <button
        type="button"
        className="button"
        style={{ minHeight: 48 }}
        disabled={busy}
        onClick={() => void install()}
      >
        {status.installed ? "Reinstall (idempotent)" : "Install template intentionally"}
      </button>
      <p className="muted">
        Creates vacant positions only — no people, users, tasks, Events, or Missions.
      </p>
      <div className="button-row">
        <Link className="button secondary" href="/system/organization/chart">
          Chart
        </Link>
        <Link className="button secondary" href="/system/organization/positions">
          Positions
        </Link>
        <Link className="button secondary" href="/system/organization/clusters">
          Clusters
        </Link>
      </div>
    </section>
  );
}
