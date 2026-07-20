"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  MissionFieldConfirmationState,
  MissionFieldOpsWorkspaceView,
} from "@/lib/missions/v21/field-ops";
import {
  labelFieldConfirmationState,
  labelFieldOpsDisposition,
  labelFindingSeverity,
} from "@/lib/missions/v21/field-ops/labels";
import {
  labelLogisticsItemCriticality,
  labelLogisticsItemStatus,
} from "@/lib/missions/v21/logistics-pack";

type Props = { initial: MissionFieldOpsWorkspaceView };

const CONFIRMATION_STATES: MissionFieldConfirmationState[] = [
  "PRESENT",
  "MISSING",
  "DAMAGED",
  "SUBSTITUTED",
  "NOT_USABLE",
  "RETURNED",
  "RETURN_MISSING",
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

export function MissionFieldOpsWorkspace({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fieldLeadName, setFieldLeadName] = useState(
    model.session.fieldLeadName ?? "",
  );
  const [locationLabel, setLocationLabel] = useState(
    model.session.locationLabel ?? "",
  );
  const [contextNote, setContextNote] = useState(
    model.session.contextNote ?? "",
  );
  const [fieldNotes, setFieldNotes] = useState(model.session.fieldNotes ?? "");
  const [internalNotes, setInternalNotes] = useState(
    model.session.internalNotes ?? "",
  );

  const base = `/api/missions/${model.mission.missionId}/field-ops`;
  const dateKey = model.mission.campaignDateKey;

  function applyModel(next: MissionFieldOpsWorkspaceView) {
    setModel(next);
    setFieldLeadName(next.session.fieldLeadName ?? "");
    setLocationLabel(next.session.locationLabel ?? "");
    setContextNote(next.session.contextNote ?? "");
    setFieldNotes(next.session.fieldNotes ?? "");
    setInternalNotes(next.session.internalNotes ?? "");
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

  async function patchSession(fields: Record<string, unknown>) {
    const json = await jsonFetch(base, "PATCH", {
      expectedUpdatedAt: model.session.expectedUpdatedAt,
      ...fields,
    });
    applyModel(json.model);
  }

  async function confirmItem(
    logisticsItemId: string,
    state: MissionFieldConfirmationState,
  ) {
    let substituteDescription: string | undefined;
    if (state === "SUBSTITUTED") {
      const sub = window.prompt("Substitute description (required):");
      if (!sub?.trim()) return;
      substituteDescription = sub.trim();
    }
    const json = await jsonFetch(`${base}/confirmations`, "POST", {
      expectedUpdatedAt: model.session.expectedUpdatedAt,
      logisticsItemId,
      state,
      ...(substituteDescription ? { substituteDescription } : {}),
    });
    applyModel(json.model);
  }

  const sortedItems = [...model.logisticsItems].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  );

  return (
    <article className="page-stack mission-field-ops-workspace">
      <header className="page-header">
        <p className="muted">Field Day Operations · {dateKey}</p>
        <h1>{model.mission.title}</h1>
        <p className="muted">
          {model.mission.whenLabel}
          {model.mission.locationLabel ? ` · ${model.mission.locationLabel}` : ""}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Field Ops navigation">
          <Link href={model.mission.href}>Mission</Link>
          <Link href={model.mission.prepareHref}>Prepare</Link>
          <Link href={model.mission.executeHref}>Execute</Link>
          <Link href={model.mission.logisticsHref}>Logistics</Link>
          <Link href={model.mission.travelHref}>Travel</Link>
          <Link href={`/system/briefing/${dateKey}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${dateKey}/launch`}>Launch</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="field-ops-status-h">
        <h2 id="field-ops-status-h">Session status</h2>
        <p>
          Status: <strong>{model.session.statusLabel}</strong> · Readiness:{" "}
          {model.session.readinessStateLabel}
          {model.session.derivedReadiness !== model.session.readinessState
            ? ` (derived: ${model.session.derivedReadinessLabel})`
            : ""}
        </p>
        <p className="muted">
          Materials indicated: {model.mission.materialsIndicated ? "Yes" : "No"}
          {model.mission.isCancelled ? " · Mission cancelled" : ""}
          {model.session.checkInAt
            ? ` · Checked in ${new Date(model.session.checkInAt).toLocaleString()}`
            : ""}
        </p>
        {!model.session.exists ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await jsonFetch(base, "POST");
                applyModel(json.model);
                setMessage("Field Ops session opened.");
              })
            }
          >
            Open field session
          </button>
        ) : null}
      </section>

      {model.findings.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="field-ops-findings-h">
          <h2 id="field-ops-findings-h">Field findings</h2>
          <ul className="briefing-list">
            {model.findings.map((f) => (
              <li key={f.issueKey}>
                <h3>
                  {labelFindingSeverity(f.severity)}: {f.title}
                </h3>
                <p>{f.explanation}</p>
                <p className="muted">
                  Disposition:{" "}
                  {f.disposition
                    ? labelFieldOpsDisposition(f.disposition)
                    : "Open"}
                </p>
                {model.session.exists &&
                (!f.disposition || f.disposition === "ACKNOWLEDGED") ? (
                  <div className="closeout-button-row">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const json = await jsonFetch(
                            `${base}/acknowledgements`,
                            "POST",
                            {
                              issueKey: f.issueKey,
                              issueType: f.issueType,
                              title: f.title,
                              disposition: "ACKNOWLEDGED",
                            },
                          );
                          applyModel(json.model);
                          setMessage(
                            "Acknowledged (does not clear blockers).",
                          );
                        })
                      }
                    >
                      Acknowledge
                    </button>
                    {f.severity === "BLOCKER" ? (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() => {
                          const reason = window.prompt(
                            "Accepted risk reason (required):",
                          );
                          if (!reason?.trim()) return;
                          run(async () => {
                            const json = await jsonFetch(
                              `${base}/acknowledgements`,
                              "POST",
                              {
                                issueKey: f.issueKey,
                                issueType: f.issueType,
                                title: f.title,
                                disposition: "ACCEPTED_RISK",
                                acceptedRiskReason: reason.trim(),
                              },
                            );
                            applyModel(json.model);
                            setMessage(
                              "Accepted risk recorded. Underlying condition is not resolved.",
                            );
                          });
                        }}
                      >
                        Accept risk
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.session.exists ? (
        <section className="panel" aria-labelledby="field-ops-edit-h">
          <h2 id="field-ops-edit-h">Session fields</h2>
          <label>
            Field lead
            <input
              value={fieldLeadName}
              onChange={(e) => setFieldLeadName(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Field location
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Context note
            <textarea
              rows={2}
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Field notes
            <textarea
              rows={3}
              value={fieldNotes}
              onChange={(e) => setFieldNotes(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Internal notes
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              disabled={pending}
            />
          </label>
          <div className="closeout-button-row">
            <button
              type="button"
              className="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await patchSession({
                    fieldLeadName,
                    locationLabel,
                    contextNote,
                    fieldNotes,
                    internalNotes,
                  });
                  setMessage("Session fields saved.");
                })
              }
            >
              Save session
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending || Boolean(model.session.checkInAt)}
              onClick={() =>
                run(async () => {
                  await patchSession({ checkIn: true });
                  setMessage("Check-in recorded.");
                })
              }
            >
              Check in
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await patchSession({ confirmReadiness: true });
                  setMessage(
                    "Readiness confirmed against current schedule, travel, and logistics.",
                  );
                })
              }
            >
              Confirm readiness
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await patchSession({ beginWrap: true });
                  setMessage("Wrap started.");
                })
              }
            >
              Begin wrap
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => {
                const ok = window.confirm(
                  "Close this field session? The Mission will not be completed.",
                );
                if (!ok) return;
                run(async () => {
                  await patchSession({ closeSession: true });
                  setMessage("Field session closed.");
                });
              }}
            >
              Close session
            </button>
          </div>
        </section>
      ) : null}

      {model.session.exists ? (
        <section className="panel" aria-labelledby="field-ops-items-h">
          <h2 id="field-ops-items-h">Logistics items (D12)</h2>
          <p className="muted" role="note">
            Items come from the Mission logistics pack. D12 pack status is context
            only — packed does not mean present on site.
          </p>
          {sortedItems.length === 0 ? (
            <p className="muted">No logistics items on the active pack.</p>
          ) : (
            <ol className="briefing-list">
              {sortedItems.map((item) => (
                <li key={item.id}>
                  <h3>
                    {item.sequence}. {item.description || "Untitled item"}
                  </h3>
                  <p className="muted">
                    D12 status:{" "}
                    {labelLogisticsItemStatus(
                      item.status as Parameters<
                        typeof labelLogisticsItemStatus
                      >[0],
                    )}{" "}
                    · {labelLogisticsItemCriticality(
                      item.criticality as Parameters<
                        typeof labelLogisticsItemCriticality
                      >[0],
                    )}
                    {item.returnRequired ? " · Return required" : ""}
                  </p>
                  <p className="muted">
                    Responsible: {item.responsibleName ?? "Not set"}
                    {item.quantityLabel ? ` · Qty: ${item.quantityLabel}` : ""}
                  </p>
                  {item.confirmation ? (
                    <p>
                      Field confirmation:{" "}
                      <strong>
                        {labelFieldConfirmationState(item.confirmation.state)}
                      </strong>
                      {item.confirmation.substituteDescription
                        ? ` · Substitute: ${item.confirmation.substituteDescription}`
                        : ""}
                    </p>
                  ) : (
                    <p className="muted">Not confirmed in field yet.</p>
                  )}
                  <div className="closeout-button-row">
                    {CONFIRMATION_STATES.map((state) => (
                      <button
                        key={state}
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            await confirmItem(item.id, state);
                            setMessage(
                              `Recorded ${labelFieldConfirmationState(state)}.`,
                            );
                          })
                        }
                      >
                        {labelFieldConfirmationState(state)}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {message ? (
        <p className="closeout-save-status" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="closeout-save-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? <p className="muted">Working…</p> : null}
    </article>
  );
}
