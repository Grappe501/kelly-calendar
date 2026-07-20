"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  MissionIncidentCategory,
  MissionIncidentSensitivity,
  MissionIncidentSeverity,
  MissionIncidentWorkspaceView,
} from "@/lib/missions/v21/incident-log";
import {
  labelIncidentCategory,
  labelIncidentSensitivity,
  labelIncidentSeverity,
  labelIncidentStatus,
} from "@/lib/missions/v21/incident-log";
import { labelFindingSeverity } from "@/lib/missions/v21/incident-log/labels";

type Props = { initial: MissionIncidentWorkspaceView };

const CATEGORIES: MissionIncidentCategory[] = [
  "SAFETY",
  "ACCESS",
  "SECURITY",
  "PRESS",
  "TRAVEL",
  "LOGISTICS",
  "TECHNOLOGY",
  "STAFFING",
  "SCHEDULE",
  "VENUE",
  "PUBLIC_INTERACTION",
  "OTHER",
];

const SEVERITIES: MissionIncidentSeverity[] = [
  "INFO",
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
];

const SENSITIVITIES: MissionIncidentSensitivity[] = [
  "STANDARD",
  "RESTRICTED",
  "CONFIDENTIAL",
];

async function jsonFetch(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Request failed.");
  }
  return json;
}

export function MissionIncidentsWorkspace({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<MissionIncidentCategory>("OTHER");
  const [severity, setSeverity] = useState<MissionIncidentSeverity>("MODERATE");
  const [sensitivity, setSensitivity] =
    useState<MissionIncidentSensitivity>("STANDARD");
  const [summary, setSummary] = useState("");
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  const base = `/api/missions/${model.mission.missionId}/incidents`;
  const dateKey = model.mission.campaignDateKey;

  async function run(fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    }
  }

  async function createIncident() {
    const json = await jsonFetch(base, "POST", {
      category,
      severity,
      sensitivity,
      summary,
      observedAt: new Date(observedAt).toISOString(),
    });
    setMessage(`Incident ${json.model.incident.incidentRef} created.`);
    router.push(
      `/system/missions/${model.mission.missionId}/incidents/${json.model.incident.id}`,
    );
  }

  return (
    <article className="page-stack mission-incidents-workspace">
      <header className="page-header">
        <p className="muted">Mission Incident Log · {dateKey}</p>
        <h1>{model.mission.title}</h1>
        <p className="muted">{model.mission.whenLabel}</p>
        <p role="alert" className="briefing-risks">
          {model.emergencyNotice}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Incident navigation">
          <Link href={model.mission.href}>Mission</Link>
          <Link href={model.mission.prepareHref}>Prepare</Link>
          <Link href={model.mission.executeHref}>Execute</Link>
          <Link href={model.mission.fieldOpsHref}>Field Ops</Link>
          <Link href={`/system/briefing/${dateKey}/incidents`}>
            Day Incidents
          </Link>
          <Link href={`/system/briefing/${dateKey}/exceptions`}>
            Exception Digest
          </Link>
          <Link href={`/system/briefing/${dateKey}/launch`}>Launch</Link>
        </nav>
      </header>

      {error ? (
        <p className="briefing-risks" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}

      <section className="panel" aria-labelledby="incidents-sum-h">
        <h2 id="incidents-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.totalCount} total</li>
          <li>{model.summary.activeCount} active</li>
          <li>{model.summary.archivedCount} archived</li>
          <li>{model.summary.highCriticalCount} high/critical</li>
          <li>{model.summary.blockerCount} blockers</li>
          <li>{model.summary.warningCount} warnings</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="incidents-create-h">
        <h2 id="incidents-create-h">Report incident</h2>
        <p className="muted">
          Structured exception capture only — not emergency dispatch.
        </p>
        <label htmlFor="inc-category">Category</label>
        <select
          id="inc-category"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as MissionIncidentCategory)
          }
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labelIncidentCategory(c)}
            </option>
          ))}
        </select>
        <label htmlFor="inc-severity">Severity</label>
        <select
          id="inc-severity"
          value={severity}
          onChange={(e) =>
            setSeverity(e.target.value as MissionIncidentSeverity)
          }
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {labelIncidentSeverity(s)}
            </option>
          ))}
        </select>
        <label htmlFor="inc-sensitivity">Sensitivity</label>
        <select
          id="inc-sensitivity"
          value={sensitivity}
          onChange={(e) =>
            setSensitivity(e.target.value as MissionIncidentSensitivity)
          }
        >
          {SENSITIVITIES.map((s) => (
            <option key={s} value={s}>
              {labelIncidentSensitivity(s)}
            </option>
          ))}
        </select>
        <label htmlFor="inc-summary">Summary</label>
        <input
          id="inc-summary"
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={500}
        />
        <label htmlFor="inc-observed">Observed at</label>
        <input
          id="inc-observed"
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
        />
        <button
          type="button"
          className="button"
          disabled={pending || !summary.trim()}
          onClick={() => run(createIncident)}
        >
          Create incident
        </button>
      </section>

      {model.incidents.length === 0 ? (
        <section className="panel empty-state">
          <h2>No incidents recorded</h2>
          <p className="muted">
            No operational exceptions have been logged for this Mission.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="incidents-list-h">
          <h2 id="incidents-list-h">Incidents</h2>
          <ul className="briefing-list">
            {model.incidents.map((inc) => (
              <li key={inc.id}>
                <h3>
                  {inc.incidentRef}
                  {inc.isArchived ? " · Archived" : ""}
                </h3>
                <p>
                  {labelIncidentCategory(inc.category)} ·{" "}
                  <strong>{labelIncidentSeverity(inc.severity)}</strong> ·{" "}
                  {labelIncidentStatus(inc.status)} · {inc.observedLabel}
                </p>
                <p>{inc.summary}</p>
                {inc.findings.length > 0 ? (
                  <ul>
                    {inc.findings.slice(0, 3).map((f) => (
                      <li key={f.issueKey}>
                        {labelFindingSeverity(f.severity)}: {f.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  <Link href={inc.href}>Open incident</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
