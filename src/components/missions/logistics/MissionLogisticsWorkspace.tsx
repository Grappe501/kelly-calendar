"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  MissionLogisticsItemCategory,
  MissionLogisticsItemCriticality,
  MissionLogisticsItemStatus,
  MissionLogisticsWorkspaceView,
} from "@/lib/missions/v21/logistics-pack";
import {
  labelLogisticsItemCategory,
  labelLogisticsItemCriticality,
  labelLogisticsItemStatus,
} from "@/lib/missions/v21/logistics-pack";

type Props = { initial: MissionLogisticsWorkspaceView };

const CATEGORIES: MissionLogisticsItemCategory[] = [
  "DOCUMENTS",
  "CREDENTIALS",
  "SIGNAGE",
  "PRINTED_MATERIALS",
  "TECHNOLOGY",
  "AUDIO_VISUAL",
  "WARDROBE",
  "FOOD_WATER",
  "ACCESSIBILITY",
  "SECURITY",
  "VOLUNTEER_MATERIALS",
  "GENERAL_SUPPLIES",
  "OTHER",
];

const ITEM_STATUSES: MissionLogisticsItemStatus[] = [
  "REQUIRED",
  "ASSIGNED",
  "PACKED",
  "HANDED_OFF",
  "RECEIVED",
  "READY",
  "USED",
  "RETURN_PENDING",
  "RETURNED",
  "NOT_APPLICABLE",
  "CANCELLED",
];

const CRITICALITIES: MissionLogisticsItemCriticality[] = [
  "CRITICAL",
  "STANDARD",
  "OPTIONAL",
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

export function MissionLogisticsWorkspace({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState(model.pack.label ?? "");
  const [packOwner, setPackOwner] = useState(model.pack.packOwnerName ?? "");
  const [assemblyLocation, setAssemblyLocation] = useState(
    model.pack.assemblyLocation ?? "",
  );
  const [handoffLocation, setHandoffLocation] = useState(
    model.pack.plannedHandoffLocation ?? "",
  );
  const [handoffAt, setHandoffAt] = useState(
    model.pack.plannedHandoffAt?.slice(0, 16) ?? "",
  );
  const [logisticsRequired, setLogisticsRequired] = useState<
    "unset" | "yes" | "no"
  >(
    model.pack.logisticsRequired === true
      ? "yes"
      : model.pack.logisticsRequired === false
        ? "no"
        : "unset",
  );
  const [logisticsNotes, setLogisticsNotes] = useState(
    model.pack.logisticsNotes ?? "",
  );
  const [internalNotes, setInternalNotes] = useState(
    model.pack.internalNotes ?? "",
  );

  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] =
    useState<MissionLogisticsItemCategory>("OTHER");
  const [newStatus, setNewStatus] =
    useState<MissionLogisticsItemStatus>("REQUIRED");
  const [newCriticality, setNewCriticality] =
    useState<MissionLogisticsItemCriticality>("STANDARD");
  const [newResponsible, setNewResponsible] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newReturnRequired, setNewReturnRequired] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);

  const [handoffFrom, setHandoffFrom] = useState("");
  const [handoffTo, setHandoffTo] = useState("");
  const [handoffItemId, setHandoffItemId] = useState("");

  const base = `/api/missions/${model.mission.missionId}/logistics`;
  const dateKey = model.mission.campaignDateKey;

  function applyModel(next: MissionLogisticsWorkspaceView) {
    setModel(next);
    setLabel(next.pack.label ?? "");
    setPackOwner(next.pack.packOwnerName ?? "");
    setAssemblyLocation(next.pack.assemblyLocation ?? "");
    setHandoffLocation(next.pack.plannedHandoffLocation ?? "");
    setHandoffAt(next.pack.plannedHandoffAt?.slice(0, 16) ?? "");
    setLogisticsRequired(
      next.pack.logisticsRequired === true
        ? "yes"
        : next.pack.logisticsRequired === false
          ? "no"
          : "unset",
    );
    setLogisticsNotes(next.pack.logisticsNotes ?? "");
    setInternalNotes(next.pack.internalNotes ?? "");
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

  async function saveItem(
    itemId: string | null,
    fields: Record<string, unknown>,
  ) {
    const body = {
      expectedUpdatedAt: model.pack.expectedUpdatedAt,
      ...fields,
    };
    const json = itemId
      ? await jsonFetch(`${base}/items/${itemId}`, "PATCH", body)
      : await jsonFetch(`${base}/items`, "POST", body);
    applyModel(json.model);
  }

  async function patchHandoff(
    handoffId: string | null,
    fields: Record<string, unknown>,
  ) {
    const body = {
      expectedUpdatedAt: model.pack.expectedUpdatedAt,
      ...fields,
    };
    if (handoffId) {
      const json = await jsonFetch(`${base}/handoffs/${handoffId}`, "PATCH", body);
      applyModel(json.model);
      return;
    }
    const json = await jsonFetch(`${base}/handoffs`, "POST", body);
    applyModel(json.model);
  }

  const sortedItems = [...model.pack.items].sort(
    (a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id),
  );

  return (
    <article className="page-stack mission-logistics-workspace">
      <header className="page-header">
        <p className="muted">
          Logistics Pack · {model.mission.campaignDateKey}
        </p>
        <h1>{model.mission.title}</h1>
        <p className="muted">
          {model.mission.whenLabel}
          {model.mission.locationLabel ? ` · ${model.mission.locationLabel}` : ""}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Logistics navigation">
          <Link href={model.mission.href}>Mission</Link>
          <Link href={model.mission.prepareHref}>Prepare</Link>
          <Link href={`/system/missions/${model.mission.missionId}/execute`}>
            Execute
          </Link>
          <Link href={`/system/missions/${model.mission.missionId}/travel`}>
            Travel
          </Link>
          <Link href={`/system/missions/${model.mission.missionId}/field-ops`}>
            Field Ops
          </Link>
          <Link href={`/system/briefing/${dateKey}/logistics`}>
            Day Logistics
          </Link>
          <Link href={`/system/briefing/${dateKey}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${dateKey}/launch`}>
            Morning Launch
          </Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="logistics-status-h">
        <h2 id="logistics-status-h">Pack status</h2>
        <p>
          Status: <strong>{model.pack.statusLabel}</strong> · Readiness:{" "}
          {model.pack.readinessStateLabel}
          {model.pack.derivedReadiness !== model.pack.readinessState
            ? ` (derived: ${model.pack.derivedReadinessLabel})`
            : ""}
        </p>
        <p className="muted">
          Materials indicated:{" "}
          {model.mission.materialsIndicated ? "Yes" : "No"}
          {model.mission.isCancelled ? " · Mission cancelled" : ""}
        </p>
        {!model.pack.exists ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await jsonFetch(base, "POST");
                applyModel(json.model);
                setMessage("Logistics pack created.");
              })
            }
          >
            Create logistics pack
          </button>
        ) : null}
      </section>

      {model.findings.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="logistics-findings-h">
          <h2 id="logistics-findings-h">Logistics findings</h2>
          <ul className="briefing-list">
            {model.findings.map((f) => (
              <li key={f.issueKey}>
                <h3>
                  {f.severityLabel}: {f.title}
                </h3>
                <p>{f.explanation}</p>
                <p className="muted">Disposition: {f.disposition ?? "Open"}</p>
                {model.pack.exists &&
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

      {model.pack.exists ? (
        <section className="panel" aria-labelledby="logistics-edit-h">
          <h2 id="logistics-edit-h">Pack fields</h2>
          <label>
            Pack label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Pack owner
            <input
              value={packOwner}
              onChange={(e) => setPackOwner(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Assembly location
            <input
              value={assemblyLocation}
              onChange={(e) => setAssemblyLocation(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Planned handoff (local datetime)
            <input
              type="datetime-local"
              value={handoffAt}
              onChange={(e) => setHandoffAt(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Planned handoff location
            <input
              value={handoffLocation}
              onChange={(e) => setHandoffLocation(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Logistics required
            <select
              value={logisticsRequired}
              onChange={(e) =>
                setLogisticsRequired(e.target.value as "unset" | "yes" | "no")
              }
              disabled={pending}
            >
              <option value="unset">Use materials signal</option>
              <option value="yes">Yes — required</option>
              <option value="no">No — not required</option>
            </select>
          </label>
          <label>
            Logistics notes
            <textarea
              rows={3}
              value={logisticsNotes}
              onChange={(e) => setLogisticsNotes(e.target.value)}
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
                  const json = await jsonFetch(base, "PATCH", {
                    expectedUpdatedAt: model.pack.expectedUpdatedAt,
                    label,
                    packOwnerName: packOwner,
                    assemblyLocation,
                    plannedHandoffAt: handoffAt
                      ? new Date(handoffAt).toISOString()
                      : null,
                    plannedHandoffLocation: handoffLocation,
                    logisticsRequired:
                      logisticsRequired === "unset"
                        ? null
                        : logisticsRequired === "yes",
                    logisticsNotes,
                    internalNotes,
                    status: "ACTIVE",
                  });
                  applyModel(json.model);
                  setMessage("Logistics pack saved.");
                })
              }
            >
              Save pack
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const json = await jsonFetch(base, "PATCH", {
                    expectedUpdatedAt: model.pack.expectedUpdatedAt,
                    confirmSchedule: true,
                    status: "READY",
                    readinessState: "READY",
                  });
                  applyModel(json.model);
                  setMessage(
                    "Pack confirmed against current Mission schedule and travel.",
                  );
                })
              }
            >
              Confirm schedule
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() => {
                const ok = window.confirm(
                  "Deactivate this logistics pack? The Mission will not be cancelled.",
                );
                if (!ok) return;
                run(async () => {
                  const json = await jsonFetch(base, "PATCH", {
                    expectedUpdatedAt: model.pack.expectedUpdatedAt,
                    status: "INACTIVE",
                  });
                  applyModel(json.model);
                  setMessage("Logistics pack deactivated.");
                });
              }}
            >
              Deactivate pack
            </button>
          </div>
        </section>
      ) : null}

      {model.pack.exists ? (
        <section className="panel" aria-labelledby="logistics-items-h">
          <h2 id="logistics-items-h">Pack items</h2>
          {sortedItems.length === 0 ? (
            <p className="muted">No items yet.</p>
          ) : (
            <ol className="briefing-list">
              {sortedItems.map((item, index) => (
                <li key={item.id}>
                  <h3>
                    {item.sequence}. {item.description || "Untitled item"}
                  </h3>
                  <p className="muted">
                    {labelLogisticsItemCategory(item.category)} ·{" "}
                    {labelLogisticsItemStatus(item.status)} ·{" "}
                    {labelLogisticsItemCriticality(item.criticality)}
                    {item.returnRequired ? " · Return required" : ""}
                  </p>
                  <p className="muted">
                    Responsible: {item.responsibleName ?? "Not set"}
                    {item.quantityLabel ? ` · Qty: ${item.quantityLabel}` : ""}
                  </p>
                  <div className="closeout-button-row">
                    {index > 0 ? (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const ids = sortedItems.map((i) => i.id);
                            const next = [...ids];
                            [next[index - 1], next[index]] = [
                              next[index],
                              next[index - 1],
                            ];
                            const json = await jsonFetch(`${base}/items`, "POST", {
                              expectedUpdatedAt: model.pack.expectedUpdatedAt,
                              orderedItemIds: next,
                            });
                            applyModel(json.model);
                            setMessage("Item moved up.");
                          })
                        }
                      >
                        Move up
                      </button>
                    ) : null}
                    {index < sortedItems.length - 1 ? (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const ids = sortedItems.map((i) => i.id);
                            const next = [...ids];
                            [next[index], next[index + 1]] = [
                              next[index + 1],
                              next[index],
                            ];
                            const json = await jsonFetch(`${base}/items`, "POST", {
                              expectedUpdatedAt: model.pack.expectedUpdatedAt,
                              orderedItemIds: next,
                            });
                            applyModel(json.model);
                            setMessage("Item moved down.");
                          })
                        }
                      >
                        Move down
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending}
                      onClick={() => {
                        setEditItemId(item.id);
                        setNewDescription(item.description);
                        setNewCategory(item.category);
                        setNewStatus(item.status);
                        setNewCriticality(item.criticality);
                        setNewResponsible(item.responsibleName ?? "");
                        setNewQuantity(item.quantityLabel ?? "");
                        setNewReturnRequired(item.returnRequired);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending}
                      onClick={() => {
                        const ok = window.confirm("Remove this item?");
                        if (!ok) return;
                        run(async () => {
                          const res = await fetch(`${base}/items/${item.id}`, {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              expectedUpdatedAt: model.pack.expectedUpdatedAt,
                            }),
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok || json.ok === false) {
                            throw new Error(
                              json?.error?.message || "Delete failed.",
                            );
                          }
                          applyModel(json.model);
                          setMessage("Item removed.");
                        });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <fieldset className="prepare-fieldset">
            <legend>{editItemId ? "Edit item" : "Add item"}</legend>
            <label>
              Description
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Category
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as MissionLogisticsItemCategory)
                }
                disabled={pending}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labelLogisticsItemCategory(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as MissionLogisticsItemStatus)
                }
                disabled={pending}
              >
                {ITEM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelLogisticsItemStatus(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Criticality
              <select
                value={newCriticality}
                onChange={(e) =>
                  setNewCriticality(
                    e.target.value as MissionLogisticsItemCriticality,
                  )
                }
                disabled={pending}
              >
                {CRITICALITIES.map((c) => (
                  <option key={c} value={c}>
                    {labelLogisticsItemCriticality(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Responsible
              <input
                value={newResponsible}
                onChange={(e) => setNewResponsible(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Quantity label
              <input
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={newReturnRequired}
                onChange={(e) => setNewReturnRequired(e.target.checked)}
                disabled={pending}
              />
              Return required
            </label>
            <button
              type="button"
              className="button"
              disabled={pending || !newDescription.trim()}
              onClick={() =>
                run(async () => {
                  await saveItem(editItemId, {
                    description: newDescription.trim(),
                    category: newCategory,
                    status: newStatus,
                    criticality: newCriticality,
                    responsibleName: newResponsible,
                    quantityLabel: newQuantity,
                    returnRequired: newReturnRequired,
                  });
                  setEditItemId(null);
                  setNewDescription("");
                  setNewResponsible("");
                  setNewQuantity("");
                  setNewReturnRequired(false);
                  setMessage(editItemId ? "Item updated." : "Item added.");
                })
              }
            >
              {editItemId ? "Save item" : "Add item"}
            </button>
            {editItemId ? (
              <button
                type="button"
                className="button secondary"
                disabled={pending}
                onClick={() => {
                  setEditItemId(null);
                  setNewDescription("");
                  setNewResponsible("");
                  setNewQuantity("");
                  setNewReturnRequired(false);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </fieldset>
        </section>
      ) : null}

      {model.pack.exists ? (
        <section className="panel" aria-labelledby="logistics-handoffs-h">
          <h2 id="logistics-handoffs-h">Handoffs</h2>
          {model.pack.handoffs.length === 0 ? (
            <p className="muted">No handoffs yet.</p>
          ) : (
            <ul className="briefing-list">
              {model.pack.handoffs.map((h) => (
                <li key={h.id}>
                  <h3>
                    {h.fromName ?? "—"} → {h.toName ?? "—"}
                  </h3>
                  <p className="muted">
                    Status: {h.status}
                    {h.giverConfirmedAt ? " · Giver confirmed" : ""}
                    {h.receiverConfirmedAt ? " · Receiver confirmed" : ""}
                  </p>
                  <div className="closeout-button-row">
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending || Boolean(h.giverConfirmedAt)}
                      onClick={() =>
                        run(async () => {
                          await patchHandoff(h.id, {
                            giverConfirmedAt: new Date().toISOString(),
                            status: "IN_PROGRESS",
                          });
                          setMessage("Giver confirmation recorded.");
                        })
                      }
                    >
                      Confirm giver
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={pending || Boolean(h.receiverConfirmedAt)}
                      onClick={() =>
                        run(async () => {
                          await patchHandoff(h.id, {
                            receiverConfirmedAt: new Date().toISOString(),
                            status: "COMPLETED",
                          });
                          setMessage("Receiver confirmation recorded.");
                        })
                      }
                    >
                      Confirm receiver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <fieldset className="prepare-fieldset">
            <legend>New handoff</legend>
            <label>
              From
              <input
                value={handoffFrom}
                onChange={(e) => setHandoffFrom(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              To
              <input
                value={handoffTo}
                onChange={(e) => setHandoffTo(e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Related item (optional)
              <select
                value={handoffItemId}
                onChange={(e) => setHandoffItemId(e.target.value)}
                disabled={pending}
              >
                <option value="">None</option>
                {sortedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sequence}. {item.description}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button"
              disabled={pending || !handoffFrom.trim() || !handoffTo.trim()}
              onClick={() =>
                run(async () => {
                  await patchHandoff(null, {
                    fromName: handoffFrom.trim(),
                    toName: handoffTo.trim(),
                    logisticsItemId: handoffItemId || null,
                    status: "PLANNED",
                  });
                  setHandoffFrom("");
                  setHandoffTo("");
                  setHandoffItemId("");
                  setMessage("Handoff created.");
                })
              }
            >
              Add handoff
            </button>
          </fieldset>
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
