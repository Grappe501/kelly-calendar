"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  MissionIncidentAcknowledgementDisposition,
  MissionIncidentDetailView,
  MissionIncidentSeverity,
  MissionIncidentStatus,
  MissionIncidentUpdateType,
} from "@/lib/missions/v21/incident-log";
import {
  labelIncidentCategory,
  labelIncidentDisposition,
  labelIncidentIssueType,
  labelIncidentSeverity,
  labelIncidentStatus,
  labelIncidentUpdateType,
} from "@/lib/missions/v21/incident-log";
import { labelFindingSeverity } from "@/lib/missions/v21/incident-log/labels";

type Props = { initial: MissionIncidentDetailView };

const STATUSES: MissionIncidentStatus[] = [
  "OPEN",
  "MONITORING",
  "STABILIZED",
  "RESOLVED",
  "CLOSED",
];

const SEVERITIES: MissionIncidentSeverity[] = [
  "INFO",
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
];

const UPDATE_TYPES: MissionIncidentUpdateType[] = [
  "OBSERVATION",
  "ACTION_TAKEN",
  "STATUS_CHANGE",
  "SEVERITY_CHANGE",
  "HANDOFF",
  "RESOLUTION",
  "FOLLOW_UP_NOTE",
  "CORRECTION",
];

const DISPOSITIONS: MissionIncidentAcknowledgementDisposition[] = [
  "ACKNOWLEDGED",
  "ACCEPTED_RISK",
  "RESOLVED",
  "NOT_APPLICABLE",
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

export function MissionIncidentDetail({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [status, setStatus] = useState(model.incident.status);
  const [severity, setSeverity] = useState(model.incident.severity);
  const [ownerName, setOwnerName] = useState(model.incident.ownerName ?? "");
  const [description, setDescription] = useState(
    model.incident.description ?? "",
  );

  const [updateType, setUpdateType] =
    useState<MissionIncidentUpdateType>("OBSERVATION");
  const [updateNote, setUpdateNote] = useState("");
  const [updateAction, setUpdateAction] = useState("");
  const [updateOccurredAt, setUpdateOccurredAt] = useState(
    new Date().toISOString().slice(0, 16),
  );

  const [followUpActionId, setFollowUpActionId] = useState("");

  const missionId = model.mission.missionId;
  const incidentId = model.incident.id;
  const base = `/api/missions/${missionId}/incidents/${incidentId}`;
  const dateKey = model.mission.campaignDateKey;

  function applyModel(next: MissionIncidentDetailView) {
    setModel(next);
    setStatus(next.incident.status);
    setSeverity(next.incident.severity);
    setOwnerName(next.incident.ownerName ?? "");
    setDescription(next.incident.description ?? "");
  }

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

  async function patchIncident(fields: Record<string, unknown>) {
    const json = await jsonFetch(base, "PATCH", {
      expectedUpdatedAt: model.expectedUpdatedAt,
      ...fields,
    });
    applyModel(json.model);
    setMessage("Incident updated.");
  }

  async function appendUpdate() {
    const json = await jsonFetch(`${base}/updates`, "POST", {
      expectedUpdatedAt: model.expectedUpdatedAt,
      updateType,
      note: updateNote || null,
      actionTaken: updateAction || null,
      occurredAt: new Date(updateOccurredAt).toISOString(),
    });
    applyModel(json.model);
    setUpdateNote("");
    setUpdateAction("");
    setMessage("Update recorded.");
  }

  async function acknowledge(finding: (typeof model.findings)[0]) {
    const disposition = window.prompt(
      `Disposition for "${finding.title}" (${DISPOSITIONS.join(", ")}):`,
      "ACKNOWLEDGED",
    ) as MissionIncidentAcknowledgementDisposition | null;
    if (!disposition || !DISPOSITIONS.includes(disposition)) return;
    let acceptedRiskReason: string | null = null;
    if (disposition === "ACCEPTED_RISK") {
      acceptedRiskReason = window.prompt("Accepted risk reason:")?.trim() ?? null;
      if (!acceptedRiskReason) return;
    }
    const note = window.prompt("Optional note:")?.trim() || null;
    const json = await jsonFetch(`${base}/acknowledgements`, "POST", {
      issueKey: finding.issueKey,
      issueType: finding.issueType,
      title: finding.title,
      disposition,
      note,
      acceptedRiskReason,
    });
    applyModel(json.model);
    setMessage(json.created ? "Acknowledgement recorded." : "Acknowledgement updated.");
  }

  async function archiveIncident() {
    if (!window.confirm("Archive this incident?")) return;
    const json = await jsonFetch(`${base}/archive`, "POST", {
      expectedUpdatedAt: model.expectedUpdatedAt,
    });
    applyModel(json.model);
    setMessage("Incident archived.");
  }

  async function carryForward(markCarried: boolean) {
    const json = await jsonFetch(`${base}/carry-forward`, "POST", {
      expectedUpdatedAt: model.expectedUpdatedAt,
      ...(markCarried ? { markCarried: true } : { markRequired: true }),
    });
    applyModel(json.model);
    setMessage(markCarried ? "Marked carried forward." : "Carry-forward required.");
  }

  async function linkFollowUp() {
    if (!followUpActionId.trim()) return;
    const json = await jsonFetch(`${base}/link-follow-up`, "POST", {
      expectedUpdatedAt: model.expectedUpdatedAt,
      linkedFollowUpActionId: followUpActionId.trim(),
    });
    applyModel(json.model);
    setFollowUpActionId("");
    setMessage("Follow-up action linked.");
  }

  return (
    <article className="page-stack mission-incident-detail">
      <header className="page-header">
        <p className="muted">
          Mission Incident · {model.incident.incidentRef} · {dateKey}
        </p>
        <h1>{model.incident.summary}</h1>
        <p>
          {labelIncidentCategory(model.incident.category)} ·{" "}
          <strong>{labelIncidentSeverity(model.incident.severity)}</strong> ·{" "}
          {labelIncidentStatus(model.incident.status)}
          {model.incident.isArchived ? " · Archived" : ""}
        </p>
        <p role="alert" className="briefing-risks">
          {model.emergencyNotice}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Incident detail navigation">
          <Link href={`/system/missions/${missionId}/incidents`}>
            All incidents
          </Link>
          <Link href={model.mission.href}>Mission</Link>
          <Link href={model.mission.executeHref}>Execute</Link>
          <Link href={model.mission.fieldOpsHref}>Field Ops</Link>
          <Link href={`/system/briefing/${dateKey}/incidents`}>
            Day Incidents
          </Link>
          <Link href={`/system/briefing/${dateKey}/exceptions`}>
            Exception Digest
          </Link>
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

      {model.findings.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="inc-findings-h">
          <h2 id="inc-findings-h">Findings</h2>
          <ul>
            {model.findings.map((f) => (
              <li key={f.issueKey}>
                <strong>{labelFindingSeverity(f.severity)}</strong>: {f.title}
                <p className="muted">{f.explanation}</p>
                {f.disposition ? (
                  <p className="muted">
                    Disposition: {labelIncidentDisposition(f.disposition)}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending || model.incident.isArchived}
                    onClick={() => run(() => acknowledge(f))}
                  >
                    Acknowledge
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="inc-status-h">
        <h2 id="inc-status-h">Status and severity</h2>
        <label htmlFor="inc-detail-status">Status</label>
        <select
          id="inc-detail-status"
          value={status}
          disabled={model.incident.isArchived}
          onChange={(e) =>
            setStatus(e.target.value as MissionIncidentStatus)
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelIncidentStatus(s)}
            </option>
          ))}
        </select>
        <label htmlFor="inc-detail-severity">Severity</label>
        <select
          id="inc-detail-severity"
          value={severity}
          disabled={model.incident.isArchived}
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
        <label htmlFor="inc-detail-owner">Owner name</label>
        <input
          id="inc-detail-owner"
          type="text"
          value={ownerName}
          disabled={model.incident.isArchived}
          onChange={(e) => setOwnerName(e.target.value)}
        />
        <label htmlFor="inc-detail-desc">Description</label>
        <textarea
          id="inc-detail-desc"
          rows={3}
          value={description}
          disabled={model.incident.isArchived}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="button"
          className="button"
          disabled={
            pending ||
            model.incident.isArchived ||
            (status === model.incident.status &&
              severity === model.incident.severity &&
              ownerName === (model.incident.ownerName ?? "") &&
              description === (model.incident.description ?? ""))
          }
          onClick={() =>
            run(() =>
              patchIncident({
                status,
                severity,
                ownerName: ownerName || null,
                description: description || null,
              }),
            )
          }
        >
          Save changes
        </button>
      </section>

      <section className="panel" aria-labelledby="inc-timeline-h">
        <h2 id="inc-timeline-h">Timeline</h2>
        {model.updates.length === 0 ? (
          <p className="muted">No updates recorded yet.</p>
        ) : (
          <ol>
            {model.updates.map((u) => (
              <li key={u.id}>
                <strong>{labelIncidentUpdateType(u.updateType)}</strong> ·{" "}
                {new Date(u.occurredAt).toLocaleString()}
                {u.newStatus ? (
                  <>
                    {" "}
                    · Status → {labelIncidentStatus(u.newStatus)}
                  </>
                ) : null}
                {u.newSeverity ? (
                  <>
                    {" "}
                    · Severity → {labelIncidentSeverity(u.newSeverity)}
                  </>
                ) : null}
                {u.note ? <p>{u.note}</p> : null}
                {u.actionTaken ? (
                  <p className="muted">Action: {u.actionTaken}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {!model.incident.isArchived ? (
        <section className="panel" aria-labelledby="inc-update-h">
          <h2 id="inc-update-h">Append update</h2>
          <label htmlFor="inc-update-type">Update type</label>
          <select
            id="inc-update-type"
            value={updateType}
            onChange={(e) =>
              setUpdateType(e.target.value as MissionIncidentUpdateType)
            }
          >
            {UPDATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelIncidentUpdateType(t)}
              </option>
            ))}
          </select>
          <label htmlFor="inc-update-note">Note</label>
          <textarea
            id="inc-update-note"
            rows={2}
            value={updateNote}
            onChange={(e) => setUpdateNote(e.target.value)}
          />
          <label htmlFor="inc-update-action">Action taken</label>
          <input
            id="inc-update-action"
            type="text"
            value={updateAction}
            onChange={(e) => setUpdateAction(e.target.value)}
          />
          <label htmlFor="inc-update-when">Occurred at</label>
          <input
            id="inc-update-when"
            type="datetime-local"
            value={updateOccurredAt}
            onChange={(e) => setUpdateOccurredAt(e.target.value)}
          />
          <button
            type="button"
            className="button"
            disabled={pending || (updateType === "RESOLUTION" && !updateNote.trim())}
            onClick={() => run(appendUpdate)}
          >
            Record update
          </button>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="inc-actions-h">
        <h2 id="inc-actions-h">Closeout and follow-up</h2>
        <p className="muted">
          Carry-forward surfaces in Closeout. Follow-up link is soft — it does
          not create Follow-up Mode actions automatically.
        </p>
        {model.incident.linkedFollowUpActionId ? (
          <p>
            Linked follow-up: {model.incident.linkedFollowUpActionId}
            {" · "}
            <Link href={`/system/missions/${missionId}/follow-up`}>
              Open Follow-up
            </Link>
          </p>
        ) : (
          <>
            <label htmlFor="inc-follow-up-id">Follow-up action ID</label>
            <input
              id="inc-follow-up-id"
              type="text"
              value={followUpActionId}
              disabled={model.incident.isArchived}
              onChange={(e) => setFollowUpActionId(e.target.value)}
            />
            <button
              type="button"
              className="button secondary"
              disabled={pending || model.incident.isArchived || !followUpActionId.trim()}
              onClick={() => run(linkFollowUp)}
            >
              Link follow-up
            </button>
          </>
        )}
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            disabled={pending || model.incident.isArchived}
            onClick={() => run(() => carryForward(false))}
          >
            Require carry-forward
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={pending || model.incident.isArchived}
            onClick={() => run(() => carryForward(true))}
          >
            Mark carried forward
          </button>
          {!model.incident.isArchived ? (
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => run(archiveIncident)}
            >
              Archive
            </button>
          ) : null}
        </div>
      </section>

      {model.acknowledgements.length > 0 ? (
        <section className="panel" aria-labelledby="inc-acks-h">
          <h2 id="inc-acks-h">Acknowledgements</h2>
          <ul>
            {model.acknowledgements.map((a) => (
              <li key={a.id}>
                {labelIncidentIssueType(a.issueType)} · {a.title} ·{" "}
                {labelIncidentDisposition(a.disposition)}
                {a.note ? <p className="muted">{a.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
