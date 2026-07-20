"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MissionTravelWorkspaceView } from "@/lib/missions/v21/travel-movement";

type Props = { initial: MissionTravelWorkspaceView };

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

export function MissionTravelWorkspace({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [departure, setDeparture] = useState(
    model.plan.plannedDepartureAt?.slice(0, 16) ?? "",
  );
  const [arrival, setArrival] = useState(
    model.plan.requiredArrivalAt?.slice(0, 16) ?? "",
  );
  const [buffer, setBuffer] = useState(
    model.plan.bufferMinutes != null ? String(model.plan.bufferMinutes) : "",
  );
  const [driver, setDriver] = useState(model.plan.driverName ?? "");
  const [vehicle, setVehicle] = useState(model.plan.vehicleDescription ?? "");
  const [notes, setNotes] = useState(model.plan.logisticsNotes ?? "");
  const [legOrigin, setLegOrigin] = useState("");
  const [legDest, setLegDest] = useState("");

  const base = `/api/missions/${model.mission.missionId}/travel`;

  function applyModel(next: MissionTravelWorkspaceView) {
    setModel(next);
    setDeparture(next.plan.plannedDepartureAt?.slice(0, 16) ?? "");
    setArrival(next.plan.requiredArrivalAt?.slice(0, 16) ?? "");
    setBuffer(
      next.plan.bufferMinutes != null ? String(next.plan.bufferMinutes) : "",
    );
    setDriver(next.plan.driverName ?? "");
    setVehicle(next.plan.vehicleDescription ?? "");
    setNotes(next.plan.logisticsNotes ?? "");
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

  return (
    <article className="page-stack mission-travel-workspace">
      <header className="page-header">
        <p className="muted">Travel and Movement · {model.mission.campaignDateKey}</p>
        <h1>{model.mission.title}</h1>
        <p className="muted">
          {model.mission.whenLabel}
          {model.mission.locationLabel ? ` · ${model.mission.locationLabel}` : ""}
        </p>
        <p role="note">{model.boundaryMessage}</p>
        <nav className="briefing-nav" aria-label="Travel navigation">
          <Link href={model.mission.href}>Mission</Link>
          <Link href={model.mission.prepareHref}>Prepare</Link>
          <Link href={model.mission.executeHref}>Execute</Link>
          <Link href={`/system/missions/${model.mission.missionId}/logistics`}>
            Logistics Pack
          </Link>
          <Link href={`/system/missions/${model.mission.missionId}/field-ops`}>
            Field Ops
          </Link>
          <Link href={`/system/missions/${model.mission.missionId}/incidents`}>
            Incidents
          </Link>
          <Link href={`/system/briefing/${model.mission.campaignDateKey}/movement`}>
            Day Movement
          </Link>
          <Link href={`/system/briefing/${model.mission.campaignDateKey}/logistics`}>
            Day Logistics
          </Link>
          <Link href={`/system/briefing/${model.mission.campaignDateKey}/field-ops`}>
            Day Field Ops
          </Link>
          <Link href={`/system/briefing/${model.mission.campaignDateKey}/incidents`}>
            Day Incidents
          </Link>
          <Link href={`/system/briefing/${model.mission.campaignDateKey}/launch`}>
            Morning Launch
          </Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="travel-status-h">
        <h2 id="travel-status-h">Plan status</h2>
        <p>
          Status: <strong>{model.plan.statusLabel}</strong> · Readiness:{" "}
          {model.plan.readinessStateLabel}
          {model.plan.derivedReadiness !== model.plan.readinessState
            ? ` (derived: ${model.plan.derivedReadinessLabel})`
            : ""}
        </p>
        <p className="muted">
          Event travel required: {model.mission.eventTravelRequired ? "Yes" : "No"}
          {model.mission.isCancelled ? " · Mission cancelled" : ""}
        </p>
        {!model.plan.exists ? (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const json = await jsonFetch(base, "POST");
                applyModel(json.model);
                setMessage("Travel plan created.");
              })
            }
          >
            Create travel plan
          </button>
        ) : null}
      </section>

      {model.findings.length > 0 ? (
        <section className="panel briefing-risks" aria-labelledby="travel-findings-h">
          <h2 id="travel-findings-h">Travel findings</h2>
          <ul className="briefing-list">
            {model.findings.map((f) => (
              <li key={f.issueKey}>
                <h3>
                  {f.severityLabel}: {f.title}
                </h3>
                <p>{f.explanation}</p>
                <p className="muted">
                  Disposition: {f.disposition ?? "Open"}
                </p>
                {model.plan.exists && (!f.disposition || f.disposition === "ACKNOWLEDGED") ? (
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
                          setMessage("Acknowledged (does not clear blockers).");
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

      {model.plan.exists ? (
        <section className="panel" aria-labelledby="travel-edit-h">
          <h2 id="travel-edit-h">Departure and assignments</h2>
          <label>
            Planned departure (local ISO datetime)
            <input
              type="datetime-local"
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Required arrival
            <input
              type="datetime-local"
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Buffer (minutes)
            <input
              type="number"
              min={0}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Driver name
            <input
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Vehicle
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            Logistics notes
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                    expectedUpdatedAt: model.plan.expectedUpdatedAt,
                    plannedDepartureAt: departure
                      ? new Date(departure).toISOString()
                      : null,
                    requiredArrivalAt: arrival
                      ? new Date(arrival).toISOString()
                      : null,
                    bufferMinutes: buffer === "" ? null : Number(buffer),
                    driverName: driver,
                    vehicleDescription: vehicle,
                    logisticsNotes: notes,
                    status: "ACTIVE",
                  });
                  applyModel(json.model);
                  setMessage("Travel plan saved.");
                })
              }
            >
              Save plan
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const json = await jsonFetch(base, "PATCH", {
                    expectedUpdatedAt: model.plan.expectedUpdatedAt,
                    confirmSchedule: true,
                    status: "READY",
                    readinessState: "READY",
                  });
                  applyModel(json.model);
                  setMessage("Plan confirmed against current Mission schedule.");
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
                  "Deactivate this travel plan? The Mission will not be cancelled.",
                );
                if (!ok) return;
                run(async () => {
                  const json = await jsonFetch(base, "PATCH", {
                    expectedUpdatedAt: model.plan.expectedUpdatedAt,
                    status: "INACTIVE",
                  });
                  applyModel(json.model);
                  setMessage("Travel plan deactivated.");
                });
              }}
            >
              Deactivate plan
            </button>
          </div>
        </section>
      ) : null}

      {model.plan.exists ? (
        <section className="panel" aria-labelledby="travel-legs-h">
          <h2 id="travel-legs-h">Travel legs</h2>
          {model.plan.legs.length === 0 ? (
            <p className="muted">No legs yet.</p>
          ) : (
            <ol className="briefing-list">
              {model.plan.legs.map((leg) => (
                <li key={leg.id}>
                  <h3>
                    Leg {leg.sequence}: {leg.originLabel ?? "—"} →{" "}
                    {leg.destinationLabel ?? "—"}
                  </h3>
                  <p className="muted">{leg.status}</p>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={pending}
                    onClick={() => {
                      const ok = window.confirm("Remove this leg?");
                      if (!ok) return;
                      run(async () => {
                        const res = await fetch(
                          `${base}/legs/${leg.id}`,
                          {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              expectedUpdatedAt: model.plan.expectedUpdatedAt,
                            }),
                          },
                        );
                        const json = await res.json().catch(() => ({}));
                        if (!res.ok || json.ok === false) {
                          throw new Error(
                            json?.error?.message || "Delete failed.",
                          );
                        }
                        applyModel(json.model);
                        setMessage("Leg removed.");
                      });
                    }}
                  >
                    Remove leg
                  </button>
                </li>
              ))}
            </ol>
          )}
          <label>
            New leg origin
            <input
              value={legOrigin}
              onChange={(e) => setLegOrigin(e.target.value)}
              disabled={pending}
            />
          </label>
          <label>
            New leg destination
            <input
              value={legDest}
              onChange={(e) => setLegDest(e.target.value)}
              disabled={pending}
            />
          </label>
          <button
            type="button"
            className="button"
            disabled={pending || !legOrigin.trim() || !legDest.trim()}
            onClick={() =>
              run(async () => {
                const json = await jsonFetch(`${base}/legs`, "POST", {
                  expectedUpdatedAt: model.plan.expectedUpdatedAt,
                  originLabel: legOrigin,
                  destinationLabel: legDest,
                });
                applyModel(json.model);
                setLegOrigin("");
                setLegDest("");
                setMessage("Leg added.");
              })
            }
          >
            Add leg
          </button>
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
